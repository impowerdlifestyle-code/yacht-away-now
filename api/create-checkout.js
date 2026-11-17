import {
  SUPABASE_URL, SITE_URL, supabaseHeaders, clip, isIsoDate, isPaid, lowerEmail, cleanName, isSignature, cleanInitials,
  validLinkToken, contractUrl, getBooking, resolveCaptain, charterHours, boatKey, rateCardTotal, findConflict, notifyOwners, alertOwners,
} from './_shared.js';

const PRE_SIGNATURE_STATUSES = ['new', 'contacted', 'contract_sent'];
const QUOTED_BY_HAND = 'Overnight, multi-day and custom charters are priced by our team. Please call (727) 609-2248 and we will confirm your quote.';

// What this charter costs, from the booking row alone. A total the owner put
// on the booking is final. Otherwise the rate card prices it, and the only
// thing taken from the browser is a detail the row is missing or a request for
// more hours: a customer may add hours, never remove them.
function priceCharter(booking, body) {
  const date = booking.charter_date || (isIsoDate(body.charter_date) ? body.charter_date : '');
  const boat = booking.boat || (boatKey(body.boat) ? clip(body.boat, 80) : '');
  const time = booking.charter_time || (/^\d{1,2}:\d{2}$/.test(String(body.charter_time || '')) ? body.charter_time : '');
  const rowTotal = Number(booking.total_price);
  if (rowTotal > 0) return { total: rowTotal, date, boat, time, duration: booking.duration || '' };

  const rowHours = charterHours(booking.duration);
  if (booking.duration && !rowHours) return null;
  const hours = Math.max(rowHours || 0, charterHours(body.duration) || 0);
  const total = rateCardTotal({ date, boat, hours });
  return total ? { total, date, boat, time, duration: `${hours}hr` } : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.SUPABASE_SERVICE_KEY || !process.env.STRIPE_SECRET_KEY || !process.env.YAN_BOOKING_SECRET) {
    console.error('create-checkout: SUPABASE_SERVICE_KEY, STRIPE_SECRET_KEY or YAN_BOOKING_SECRET is not set');
    return res.status(500).json({ error: 'Checkout is unavailable right now. Please call (727) 609-2248.' });
  }

  const body = req.body || {};
  const bookingId = typeof body.booking_id === 'string' ? body.booking_id : '';
  if (!validLinkToken('contract', bookingId, body.token)) {
    return res.status(401).json({ error: 'This contract link is not valid. Please open the link from your email again, or call (727) 609-2248.' });
  }
  if (!isSignature(body.signature_data)) {
    return res.status(400).json({ error: 'A signature is required' });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    return res.status(400).json({ error: 'Invalid deposit amount' });
  }

  let booking;
  try {
    booking = await getBooking(bookingId);
  } catch (lookupErr) {
    console.error('Booking lookup error:', lookupErr);
    return res.status(503).json({ error: 'We could not look up your booking. Please try again or call (727) 609-2248.' });
  }
  if (!booking || booking.archived || booking.status === 'cancelled' || booking.payment_status === 'refunded') {
    return res.status(409).json({ error: 'This booking is no longer open for payment. Please call (727) 609-2248.' });
  }

  const isFull = body.payment_type === 'full';
  const email = lowerEmail(booking.email);
  const name = cleanName(body.name, 120) || cleanName(`${booking.first_name || ''} ${booking.last_name || ''}`, 120);
  const phone = cleanName(body.phone, 40) || booking.phone || '';
  const charter_type = cleanName(body.charter_type, 80) || booking.charter_type || '';
  const captain = await resolveCaptain(body);
  const signer_name = cleanName(body.signer_name, 120);
  const guestCount = parseInt(body.guests, 10);
  const guests = Number.isFinite(guestCount) && guestCount > 0 && guestCount <= 99 ? guestCount : null;
  const initials = cleanInitials(body.initials);

  // Money already on the booking changes what may be charged. A deposit is
  // never taken twice, and paying in full after a deposit charges the rest.
  let balanceDue = null;
  if (booking.payment_status === 'paid_full') {
    return res.status(409).json({ error: 'This charter is already paid in full, so there is nothing to pay. Questions? Call (727) 609-2248.' });
  }
  if (booking.payment_status === 'deposit_paid') {
    if (!isFull) {
      return res.status(409).json({ error: 'Your deposit is already paid. To pay the remaining balance, use the balance link in your welcome email or call (727) 609-2248.' });
    }
    const paidTotal = Number(booking.total_price);
    const paidDeposit = Number(booking.deposit_amount);
    balanceDue = Math.round((paidTotal - paidDeposit) * 100) / 100;
    if (!(paidTotal > 0) || !(paidDeposit > 0) || balanceDue < 1) {
      console.error(`create-checkout rejected: cannot work out the balance for booking ${booking.id}`);
      return res.status(409).json({ error: 'Your deposit is already paid. Please call (727) 609-2248 and we will send your balance link.' });
    }
    if (Math.abs(amount - balanceDue) > 1) {
      return res.status(409).json({
        error: `Your deposit is already on file, so only the remaining balance of $${balanceDue.toLocaleString()} is due.`,
        balance_due: balanceDue,
      });
    }
  }

  const priced = priceCharter(booking, body);
  if (!priced) {
    return res.status(409).json({ error: QUOTED_BY_HAND });
  }
  const { total, date, boat, time, duration } = priced;
  const due = balanceDue !== null ? balanceDue : Math.round(total * (isFull ? 1 : 0.5));
  if (Math.abs(amount - due) > 1) {
    console.error(`create-checkout rejected: browser sent ${amount}, booking ${booking.id} owes ${due}`);
    return res.status(400).json({ error: 'That amount does not match your charter total. Please call (727) 609-2248 so we can confirm your quote.' });
  }

  if (balanceDue === null) {
    let conflict;
    try {
      conflict = await findConflict({ id: booking.id, charter_date: date, charter_time: time, duration, boat });
    } catch (err) {
      console.error('create-checkout availability check failed:', err);
      return res.status(503).json({ error: 'We could not confirm that your time is still open. Please try again or call (727) 609-2248.' });
    }
    if (conflict) {
      console.error(`create-checkout refused: booking ${booking.id} overlaps paid booking ${conflict.id}`);
      return res.status(409).json({ error: 'That time has just been booked by another group. Please call (727) 609-2248 and we will find you a new time.' });
    }
  }

  const type = balanceDue !== null ? 'balance_payment' : isFull ? 'full_payment' : 'deposit';

  try {
    const successNext = encodeURIComponent(`${SITE_URL}/contract?${type === 'balance_payment' ? 'balance_paid' : 'success'}=true`);
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `https://yan-dashboard.vercel.app/api/pay/complete?session_id={CHECKOUT_SESSION_ID}&next=${successNext}`);
    params.append('cancel_url', contractUrl(booking.id, { canceled: 'true' }));
    params.append('customer_email', email);
    params.append('line_items[0][price_data][currency]', 'usd');
    const productName = type === 'balance_payment' ? 'Charter Balance Payment' : isFull ? 'Yacht Charter: Full Payment' : 'Yacht Charter Deposit (50%)';
    params.append('line_items[0][price_data][product_data][name]', productName);
    params.append('line_items[0][price_data][product_data][description]',
      `${charter_type || 'Charter'}, ${date || 'date TBD'}, ${guests || booking.guests || '?'} guests. Charter total: $${total}`
    );
    params.append('line_items[0][price_data][unit_amount]', Math.round(due * 100).toString());
    params.append('line_items[0][quantity]', '1');
    params.append('payment_method_types[0]', 'card');
    const metadata = {
      booking_id: booking.id,
      type,
      charterer_name: name,
      phone,
      charter_type,
      charter_date: date,
      charter_time: time,
      boat,
      duration,
      guests: guests ? String(guests) : '',
      captain,
      total_price: total.toString(),
      deposit_amount: due.toString(),
    };
    for (const [k, v] of Object.entries(metadata)) params.append(`payment_intent_data[metadata][${k}]`, String(v || ''));

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error('Stripe error:', session);
      return res.status(500).json({ error: session.error?.message || 'Failed to create checkout session' });
    }

    const signedAt = new Date().toISOString();
    try {
      // Totals and payment fields are written by the Stripe webhook once the
      // money has actually arrived, never from this call.
      const update = {};
      if (!isPaid(booking)) {
        if (!booking.status || PRE_SIGNATURE_STATUSES.includes(booking.status)) update.status = 'contract_signed';
        update.contract_signed_at = signedAt;
        if (captain) update.captain = captain;
        if (guests) update.guests = guests;
      } else if (!booking.contract_signed_at) {
        update.contract_signed_at = signedAt;
      }
      if (Object.keys(update).length > 0) {
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(booking.id)}`, {
          method: 'PATCH',
          headers: supabaseHeaders({ 'Prefer': 'return=minimal' }),
          body: JSON.stringify(update),
        });
        if (!patchRes.ok) console.error(`Booking contract update failed: ${patchRes.status} ${await patchRes.text()}`);
      }

      const contractRow = {
        charterer_name: name,
        email,
        phone: phone || null,
        charter_type: charter_type || null,
        charter_date: date || null,
        guests,
        captain: captain || null,
        total_price: total,
        deposit_amount: balanceDue !== null ? null : due,
        signer_name: signer_name || name,
        signature_data: body.signature_data,
        signed_at: signedAt,
        stripe_session_id: session.id,
      };
      const postContract = (extra) => fetch(`${SUPABASE_URL}/rest/v1/signed_contracts`, {
        method: 'POST',
        headers: supabaseHeaders({ 'Prefer': 'return=minimal' }),
        body: JSON.stringify({ ...contractRow, ...extra }),
      });
      // Store initials if the column exists; fall back gracefully if not.
      let cResp = await postContract(initials ? { initials } : {});
      if (!cResp.ok && initials) cResp = await postContract({});
      if (!cResp.ok) throw new Error(`Signed contract insert failed: ${cResp.status} ${await cResp.text()}`);
    } catch (dbErr) {
      // The guest is already on their way to Stripe, so this cannot stop the
      // payment. The owners have to know the signature is not on file.
      console.error('Supabase contract update error:', dbErr);
      await alertOwners(
        `Signed contract was NOT saved: ${name}`,
        `${name} (${email}) signed and was sent to Stripe for booking ${booking.id}, but saving the signature failed.\n` +
          `Ask them to sign again with a signature-only link.\n\n${String(dbErr).slice(0, 500)}`,
      );
    }

    await notifyOwners({
      event: 'contract_signed',
      booking_id: booking.id,
      name,
      email,
      phone: phone || null,
      charter_type: charter_type || null,
      charter_date: date || null,
      guests,
      total_price: total,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Something went wrong creating the checkout session' });
  }
}
