import { SUPABASE_URL, supabaseHeaders, clip, isEmail, isIsoDate, isPaid, minCharterTotal, findBooking, postDashboard } from './_shared.js';

const MAX_SIGNATURE_CHARS = 2000000;
const PRE_SIGNATURE_STATUSES = ['new', 'contacted', 'contract_sent'];

function cleanInitials(initials) {
  if (!initials || typeof initials !== 'object' || Array.isArray(initials)) return null;
  const out = {};
  for (const [k, v] of Object.entries(initials).slice(0, 8)) out[clip(k, 40)] = clip(v, 8);
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.SUPABASE_SERVICE_KEY || !process.env.STRIPE_SECRET_KEY) {
    console.error('create-checkout: SUPABASE_SERVICE_KEY or STRIPE_SECRET_KEY is not set');
    return res.status(500).json({ error: 'Checkout is unavailable right now. Please call (727) 609-2248.' });
  }

  const body = req.body || {};
  const isFull = body.payment_type === 'full';
  const amount = Number(body.amount);
  const email = clip(body.email, 254);
  const name = clip(body.name, 120);
  const phone = clip(body.phone, 40);
  const charter_type = clip(body.charter_type, 80);
  const charter_date = isIsoDate(body.charter_date) ? body.charter_date : '';
  const captain = clip(body.captain, 120);
  const boat = clip(body.boat, 80);
  const duration = clip(body.duration, 20);
  const signer_name = clip(body.signer_name, 120);
  const guestCount = parseInt(body.guests, 10);
  const guests = Number.isFinite(guestCount) && guestCount > 0 && guestCount <= 99 ? guestCount : null;
  const signature_data = typeof body.signature_data === 'string' ? body.signature_data : '';
  const initials = cleanInitials(body.initials);

  if (!Number.isFinite(amount) || amount < 1) {
    return res.status(400).json({ error: 'Invalid deposit amount' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (signature_data && (signature_data.length > MAX_SIGNATURE_CHARS || !signature_data.startsWith('data:image/'))) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let booking = null;
  try {
    booking = await findBooking({ id: body.booking_id, email });
    if (booking && (booking.email || '').toLowerCase() !== email.toLowerCase()) {
      booking = await findBooking({ email });
    }
  } catch (lookupErr) {
    console.error('Booking lookup error:', lookupErr);
    return res.status(503).json({ error: 'We could not look up your booking. Please try again or call (727) 609-2248.' });
  }

  // A returning customer's newest row can be last season's paid charter. Only
  // treat the row as this charter when the id or the date says it is.
  if (booking && isPaid(booking) && String(body.booking_id || '') !== String(booking.id)
      && charter_date && booking.charter_date !== charter_date) {
    booking = null;
  }

  // Money already on the booking changes what may be charged. A deposit is
  // never taken twice, and paying in full after a deposit charges the rest.
  let balanceDue = null;
  if (booking?.payment_status === 'paid_full') {
    return res.status(409).json({ error: 'This charter is already paid in full, so there is nothing to pay. Questions? Call (727) 609-2248.' });
  }
  if (booking?.payment_status === 'deposit_paid') {
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

  // The server decides what may be charged. A total already on the booking is
  // the least it can be. Without one, the claimed total has to clear the rate card floor for
  // that date and boat, and the amount has to be the right share of it.
  const share = isFull ? 1 : 0.5;
  const bookingTotal = Number(booking?.total_price);
  const claimedTotal = Number(body.total_price);
  let total;
  if (balanceDue !== null) {
    total = bookingTotal;
  } else if (bookingTotal > 0) {
    // A customer may add hours on the contract page, never remove them.
    total = claimedTotal > bookingTotal ? claimedTotal : bookingTotal;
  } else {
    total = Number.isFinite(claimedTotal) && claimedTotal > 0 ? claimedTotal : amount / share;
    const floor = minCharterTotal(booking?.charter_date || charter_date, booking?.boat || boat);
    if (total < floor) {
      console.error(`create-checkout rejected: total ${total} below floor ${floor} for ${email}`);
      return res.status(400).json({ error: 'That amount is below the minimum for this charter. Please call (727) 609-2248 so we can confirm your quote.' });
    }
  }
  if (balanceDue === null && Math.abs(amount - total * share) > 1) {
    console.error(`create-checkout rejected: amount ${amount} is not ${share * 100}% of ${total} for ${email}`);
    return res.status(400).json({ error: 'That amount does not match your charter total. Please call (727) 609-2248 so we can confirm your quote.' });
  }

  const amountInCents = Math.round(amount * 100);
  const metaDate = charter_date || booking?.charter_date || '';

  try {
    const successNext = encodeURIComponent('https://www.yachtawaynow.com/contract?success=true');
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `https://yan-dashboard.vercel.app/api/pay/complete?session_id={CHECKOUT_SESSION_ID}&next=${successNext}`);
    params.append('cancel_url', 'https://www.yachtawaynow.com/contract?canceled=true');
    params.append('customer_email', email);
    params.append('line_items[0][price_data][currency]', 'usd');
    const productName = balanceDue !== null ? 'Charter Balance Payment' : isFull ? 'Yacht Charter: Full Payment' : 'Yacht Charter Deposit (50%)';
    params.append('line_items[0][price_data][product_data][name]', productName);
    params.append('line_items[0][price_data][product_data][description]',
      `${charter_type || 'Charter'}, ${metaDate || 'date TBD'}, ${guests || '?'} guests. Charter total: $${total}`
    );
    params.append('line_items[0][price_data][unit_amount]', amountInCents.toString());
    params.append('line_items[0][quantity]', '1');
    params.append('payment_method_types[0]', 'card');
    params.append('payment_intent_data[metadata][charterer_name]', name);
    params.append('payment_intent_data[metadata][phone]', phone);
    params.append('payment_intent_data[metadata][charter_type]', charter_type);
    params.append('payment_intent_data[metadata][charter_date]', metaDate || '');
    params.append('payment_intent_data[metadata][guests]', guests ? String(guests) : '');
    params.append('payment_intent_data[metadata][duration]', duration);
    params.append('payment_intent_data[metadata][captain]', captain);
    params.append('payment_intent_data[metadata][total_price]', total.toString());
    params.append('payment_intent_data[metadata][deposit_amount]', amount.toString());
    params.append('payment_intent_data[metadata][type]', balanceDue !== null ? 'balance_payment' : isFull ? 'full_payment' : 'deposit');
    if (booking) params.append('payment_intent_data[metadata][booking_id]', booking.id);

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
      if (booking) {
        // Totals and payment fields are written by the Stripe webhook once the
        // money has actually arrived, never from this unauthenticated call.
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
      }

      if (signature_data) {
        const contractRow = {
          charterer_name: name,
          email,
          phone: phone || null,
          charter_type: charter_type || null,
          charter_date: metaDate || null,
          guests,
          captain: captain || null,
          total_price: total,
          deposit_amount: balanceDue !== null ? null : amount,
          signer_name: signer_name || name,
          signature_data,
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
        if (!cResp.ok) console.error(`Signed contract insert failed: ${cResp.status} ${await cResp.text()}`);
      }
    } catch (dbErr) {
      console.error('Supabase contract update error (non-fatal):', dbErr);
    }

    await postDashboard('/api/owner-notify', {
      event: 'contract_signed',
      booking_id: booking?.id || null,
      name,
      email,
      phone: phone || null,
      charter_type: charter_type || null,
      charter_date: metaDate || null,
      guests,
      total_price: total,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Something went wrong creating the checkout session' });
  }
}
