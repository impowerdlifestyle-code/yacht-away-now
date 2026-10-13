import { SUPABASE_URL, supabaseHeaders, escapeHtml, isIsoDate, findBooking, postDashboard, createCalendarEvent } from './_shared.js';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const DEPOSIT_TYPES = ['deposit', 'full_payment'];
const PRE_DEPOSIT_STATUSES = ['new', 'contacted', 'contract_sent', 'contract_signed'];
const TERMINAL_STATUSES = ['completed', 'cancelled'];

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { 'Authorization': `Bearer ${STRIPE_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function supabasePatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: supabaseHeaders({ 'Prefer': 'return=minimal' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error(`Supabase PATCH ${path} failed: ${res.status} ${await res.text()}`);
  return res.ok;
}

async function createBalancePaymentLink(amount, name, email, charterType, charterDate, bookingId) {
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', 'https://www.yachtawaynow.com/contract?balance_paid=true');
  params.append('cancel_url', 'https://www.yachtawaynow.com/contract?balance_canceled=true');
  params.append('customer_email', email);
  params.append('line_items[0][price_data][currency]', 'usd');
  params.append('line_items[0][price_data][product_data][name]', 'Charter Balance Payment');
  params.append('line_items[0][price_data][product_data][description]',
    `Remaining balance for ${charterType || 'Charter'}, ${charterDate || 'date TBD'}`
  );
  params.append('line_items[0][price_data][unit_amount]', Math.round(amount * 100).toString());
  params.append('line_items[0][quantity]', '1');
  params.append('payment_method_types[0]', 'card');
  params.append('payment_intent_data[metadata][charterer_name]', name || '');
  params.append('payment_intent_data[metadata][type]', 'balance_payment');
  if (bookingId) params.append('payment_intent_data[metadata][booking_id]', bookingId);

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const session = await res.json();
    if (!res.ok) console.error('Balance link error:', session.error?.message);
    return session.url || null;
  } catch (err) {
    console.error('Balance link error:', err);
    return null;
  }
}

async function sendWelcomeEmail({ name, email, charterType, charterDate, guests, duration, totalPrice, amountPaid, paidInFull, balancePaymentUrl }) {
  const firstName = escapeHtml(name.split(' ')[0]);
  const depositAmount = amountPaid;
  const balance = paidInFull ? 0 : (totalPrice || 0) - (depositAmount || 0);
  const dateFormatted = isIsoDate(charterDate)
    ? new Date(charterDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Yacht Away Now <bookings@yachtawaynow.com>',
      to: email,
      reply_to: 'josh@yachtawaynow.com',
      subject: `Welcome Aboard, ${name.split(' ')[0]}! Your Charter Awaits ⚓`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#071520;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#071520;">

  <div style="position:relative;overflow:hidden;">
    <img src="https://www.yachtawaynow.com/images/yacht-turquoise-hero-800.jpg" alt="Yacht Away Now" style="width:100%;height:300px;object-fit:cover;display:block;">
    <div style="position:absolute;bottom:0;left:0;right:0;height:150px;background:linear-gradient(transparent,#071520);"></div>
    <div style="position:absolute;bottom:24px;left:0;right:0;text-align:center;">
      <img src="https://www.yachtawaynow.com/images/yacht-away-now-logo.png" alt="Yacht Away Now" style="height:50px;">
    </div>
  </div>

  <div style="padding:8px 32px 0;">
    <h1 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;text-align:center;font-size:2rem;margin:24px 0 8px;font-weight:700;">Welcome Aboard, ${firstName}!</h1>
    <p style="text-align:center;color:#8bbad4;font-size:0.95rem;margin:0 0 32px;line-height:1.7;">Your ${paidInFull ? 'payment' : 'deposit'} is confirmed and your charter is locked in. We can't wait to have you on the water!</p>

    ${dateFormatted ? `
    <div style="background:#0d2538;border:1px solid #163248;border-radius:14px;overflow:hidden;margin-bottom:24px;">
      <div style="background:linear-gradient(135deg,#0b1d2e,#122d45);padding:14px 24px;border-bottom:1px solid #163248;">
        <p style="margin:0;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.12em;color:#5a7d96;font-weight:600;">Your Charter</p>
      </div>
      <div style="padding:16px 24px;">
        ${charterType ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Charter Type</span><span style="color:#f0f7fa;font-weight:500;">${escapeHtml(charterType)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Date</span><span style="color:#4ecdc4;font-weight:600;">${dateFormatted}</span></div>
        ${guests ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Guests</span><span style="color:#f0f7fa;">${escapeHtml(guests)}</span></div>` : ''}
        ${duration ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Duration</span><span style="color:#f0f7fa;">${escapeHtml(duration)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">${paidInFull ? 'Paid in Full' : 'Deposit Paid'}</span><span style="color:#22c55e;font-weight:600;">$${depositAmount.toLocaleString()} &#10003;</span></div>
        ${balance > 0 ? `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Remaining Balance</span><span style="color:#d4a853;font-weight:700;">$${balance.toLocaleString()}</span></div>` : ''}
      </div>
    </div>
    ` : ''}

    ${balance > 0 ? `
    <div style="background:linear-gradient(135deg,#122d45,#0d2538);border:1px solid rgba(212,168,83,0.2);border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.12em;color:#5a7d96;font-weight:600;">Remaining Balance</p>
      <p style="margin:0 0 4px;font-size:1.8rem;font-weight:700;color:#d4a853;font-family:Georgia,serif;">$${balance.toLocaleString()}</p>
      <p style="margin:0 0 16px;font-size:0.78rem;color:#8bbad4;">Due 7 days before departure</p>
      ${balancePaymentUrl ? `<a href="${escapeHtml(balancePaymentUrl)}" style="display:inline-block;background:linear-gradient(135deg,#b8912e,#d4a853);color:#0b1d2e;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:0.88rem;">Pay Balance Now</a>
      <p style="margin:10px 0 0;font-size:0.72rem;color:#5a7d96;">Or pay later, any time up to 7 days before departure.</p>` : ''}
    </div>
    ` : ''}

    <div style="background:#0d2538;border:1px solid #163248;border-radius:14px;padding:28px 24px;margin-bottom:24px;">
      <h2 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;font-size:1.15rem;margin:0 0 20px;text-align:center;">What Happens Next</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 12px 10px 0;vertical-align:top;width:40px;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-size:0.9rem;color:#fff;text-align:center;line-height:32px;">&#10003;</div></td>
          <td style="padding:10px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;"><strong style="color:#22c55e;">${paidInFull ? 'Paid in Full' : 'Deposit Paid'}</strong><br>Your charter date is locked in.</td>
        </tr>
        ${paidInFull ? '' : `<tr>
          <td style="padding:10px 12px 10px 0;vertical-align:top;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#b8912e,#d4a853);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#0b1d2e;text-align:center;line-height:32px;">2</div></td>
          <td style="padding:10px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">7 Days Before Departure</strong><br>Your remaining balance is due. We'll send a secure payment link${balancePaymentUrl ? ', or use the button above any time' : ''}.</td>
        </tr>`}
        <tr>
          <td style="padding:10px 12px 10px 0;vertical-align:top;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#b8912e,#d4a853);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#0b1d2e;text-align:center;line-height:32px;">3</div></td>
          <td style="padding:10px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">48 Hours Before</strong><br>We'll send you the exact dock location and parking info.</td>
        </tr>
        <tr>
          <td style="padding:10px 12px 10px 0;vertical-align:top;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#b8912e,#d4a853);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#0b1d2e;text-align:center;line-height:32px;">4</div></td>
          <td style="padding:10px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Charter Day!</strong><br>Show up, step aboard, and let us handle the rest. Your only job is to enjoy.</td>
        </tr>
      </table>
    </div>

    <div style="background:#0d2538;border:1px solid #163248;border-radius:14px;padding:24px;margin-bottom:24px;">
      <h2 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;font-size:1.05rem;margin:0 0 16px;">Pro Tips for Your Charter</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 12px 8px 0;vertical-align:top;width:30px;font-size:1.2rem;">&#127866;</td><td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;"><strong style="color:#f0f7fa;">BYOB</strong> — Bring your own drinks and snacks. We have a full galley with fridge, ice, and glassware.</td></tr>
        <tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#9728;&#65039;</td><td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Sun Essentials</strong> — Reef-safe sunscreen, sunglasses, towels, and hats.</td></tr>
        <tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#127908;</td><td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Set the Vibe</strong> — Bluetooth sound system onboard. Queue up your playlist.</td></tr>
        <tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#128247;</td><td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Capture It</strong> — Our captain is happy to take photos. Drone footage available upon request.</td></tr>
        <tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#128094;</td><td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Wildlife</strong> — Keep an eye out for dolphins, manatees, and sea turtles.</td></tr>
      </table>
    </div>

    <div style="border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <img src="https://www.yachtawaynow.com/images/yacht-night-leds.jpg" alt="Yacht at night" style="width:100%;height:180px;object-fit:cover;display:block;">
    </div>

    <div style="background:linear-gradient(135deg,#122d45,#0d2538);border:1px solid rgba(212,168,83,0.15);border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.15em;color:#5a7d96;font-weight:600;">Your Vessel</p>
      <h3 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;font-size:1.3rem;margin:0 0 12px;">52ft Marquis Flybridge</h3>
      <table style="width:100%;max-width:360px;margin:0 auto;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 8px;text-align:center;color:#8bbad4;font-size:0.82rem;"><span style="display:block;font-size:1.3rem;font-weight:700;color:#f0f7fa;">3</span>Deck Levels</td>
          <td style="padding:6px 8px;text-align:center;color:#8bbad4;font-size:0.82rem;border-left:1px solid #163248;"><span style="display:block;font-size:1.3rem;font-weight:700;color:#f0f7fa;">13</span>Max Guests</td>
          <td style="padding:6px 8px;text-align:center;color:#8bbad4;font-size:0.82rem;border-left:1px solid #163248;"><span style="display:block;font-size:1.3rem;font-weight:700;color:#f0f7fa;">600mi</span>Range</td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:0.78rem;color:#5a7d96;">Full galley &middot; Bluetooth sound &middot; Flybridge lounge &middot; Swim platform</p>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <p style="color:#5a7d96;font-size:0.78rem;margin:0 0 12px;">Questions? We're here for you.</p>
      <a href="tel:7276092248" style="display:inline-block;background:linear-gradient(135deg,#b8912e,#d4a853);color:#0b1d2e;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:0.88rem;">(727) 609-2248</a>
      <p style="margin:10px 0 0;font-size:0.78rem;color:#5a7d96;">or just reply to this email</p>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.12em;color:#5a7d96;margin:0 0 10px;">Follow Along</p>
      <a href="https://www.instagram.com/yachtawaynow" style="color:#4ecdc4;text-decoration:none;font-size:0.85rem;margin:0 12px;">Instagram</a>
      <a href="https://www.facebook.com/yachtawaynow" style="color:#4ecdc4;text-decoration:none;font-size:0.85rem;margin:0 12px;">Facebook</a>
      <a href="https://www.yachtawaynow.com" style="color:#4ecdc4;text-decoration:none;font-size:0.85rem;margin:0 12px;">Website</a>
    </div>

    <div style="text-align:center;padding:20px 0 40px;border-top:1px solid #163248;">
      <img src="https://www.yachtawaynow.com/images/yacht-away-now-logo.png" alt="Yacht Away Now" style="height:36px;margin-bottom:10px;">
      <p style="margin:0 0 2px;color:#5a7d96;font-size:0.7rem;">Yacht Away Now — Private Charters</p>
      <p style="margin:0 0 2px;color:#5a7d96;font-size:0.7rem;">St. Petersburg, Florida</p>
      <p style="margin:0;color:#5a7d96;font-size:0.7rem;"><a href="https://www.yachtawaynow.com" style="color:#4ecdc4;text-decoration:none;">yachtawaynow.com</a></p>
    </div>
  </div>
</div>
</body>
</html>`,
    }),
  });
  if (!res.ok) console.error(`Welcome email failed: ${res.status}`);
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!STRIPE_KEY || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('stripe-webhook: STRIPE_SECRET_KEY or SUPABASE_SERVICE_KEY is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // There is no signing secret, so the body is only a pointer. Everything acted
  // on below comes from Stripe's own copy of the event.
  const eventId = req.body?.id;
  if (typeof eventId !== 'string' || !/^evt_[A-Za-z0-9]{1,250}$/.test(eventId)) {
    return res.status(400).json({ error: 'Invalid event' });
  }
  let event;
  try {
    event = await stripeGet(`events/${eventId}`);
  } catch (err) {
    console.error('Stripe event fetch error:', err);
    return res.status(400).json({ error: 'Event could not be verified' });
  }
  if (!event || event.id !== eventId || !event.type) {
    return res.status(400).json({ error: 'Event could not be verified' });
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true, action: 'ignored' });
  }
  const session = event.data?.object;
  if (!session || session.payment_status !== 'paid') {
    return res.status(200).json({ received: true, action: 'ignored' });
  }

  try {
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
    let intentMetadata = {};
    if (paymentIntentId) {
      const intent = await stripeGet(`payment_intents/${encodeURIComponent(paymentIntentId)}`);
      if (!intent) return res.status(500).json({ error: 'Payment intent could not be fetched' });
      intentMetadata = intent.metadata || {};
    }
    const metadata = { ...(session.metadata || {}), ...intentMetadata };
    const type = metadata.type || '';
    const isBalance = type === 'balance_payment';
    if (!isBalance && !DEPOSIT_TYPES.includes(type)) {
      return res.status(200).json({ received: true, action: 'ignored', reason: `type ${type || 'none'}` });
    }

    const email = session.customer_email || session.customer_details?.email || null;
    const amountPaid = (session.amount_total || 0) / 100;
    const paymentRef = paymentIntentId || session.id;
    const booking = await findBooking({ id: metadata.booking_id, email });
    const name = metadata.charterer_name
      || (booking ? `${booking.first_name || ''} ${booking.last_name || ''}`.trim() : '')
      || 'Guest';

    if (isBalance) {
      if (booking) {
        if (booking.stripe_payment_id === paymentRef && booking.payment_status === 'paid_full') {
          return res.status(200).json({ received: true, action: 'already_processed' });
        }
        const update = { payment_status: 'paid_full', stripe_payment_id: paymentRef };
        if (!TERMINAL_STATUSES.includes(booking.status)) update.status = 'confirmed';
        if (!(await supabasePatch(`bookings?id=eq.${encodeURIComponent(booking.id)}`, update))) {
          return res.status(500).json({ error: 'Booking update failed' });
        }
      }
      const ownerNotified = await postDashboard('/api/owner-notify', {
        event: 'balance_paid',
        booking_id: booking?.id || null,
        name,
        email,
        amount: amountPaid,
      });
      return res.status(200).json({ received: true, action: 'balance_paid', booking_id: booking?.id || null, owner_notified: ownerNotified });
    }

    const paidInFull = type === 'full_payment';
    const paidStatus = paidInFull ? 'paid_full' : 'deposit_paid';
    const metaTotal = parseFloat(metadata.total_price);
    const totalPrice = Number(booking?.total_price) > 0
      ? Number(booking.total_price)
      : (Number.isFinite(metaTotal) && metaTotal > 0 ? metaTotal : null);

    if (booking) {
      const recorded = booking.stripe_payment_id === paymentRef
        && (booking.payment_status === paidStatus || booking.payment_status === 'paid_full');
      if (recorded) {
        return res.status(200).json({ received: true, action: 'already_processed' });
      }

      const update = { stripe_payment_id: paymentRef, paid_at: booking.paid_at || new Date().toISOString() };
      if (booking.payment_status !== 'paid_full') update.payment_status = paidStatus;
      if (paidInFull) {
        if (!TERMINAL_STATUSES.includes(booking.status)) update.status = 'confirmed';
      } else if (!booking.status || PRE_DEPOSIT_STATUSES.includes(booking.status)) {
        update.status = 'deposit_paid';
      }
      if (!(Number(booking.total_price) > 0) && totalPrice) update.total_price = totalPrice;
      if (!paidInFull && !(Number(booking.deposit_amount) > 0)) update.deposit_amount = amountPaid;
      if (!(await supabasePatch(`bookings?id=eq.${encodeURIComponent(booking.id)}`, update))) {
        return res.status(500).json({ error: 'Booking update failed' });
      }
    }

    const charterType = booking?.charter_type || metadata.charter_type || null;
    const charterDate = booking?.charter_date || metadata.charter_date || null;
    const guests = booking?.guests || metadata.guests || null;
    const duration = booking?.duration || metadata.duration || null;
    const signed = !!booking?.contract_signed_at;

    // Calendar, captain dispatch and the confirmation draft wait for the
    // signature. When payment lands first, api/sign-contract.js fires them.
    const [calendar, dispatch, draft, ownerNotified, welcome] = await Promise.all([
      signed ? createCalendarEvent(booking) : false,
      signed ? postDashboard('/api/captain-dispatch', { booking_id: booking.id }) : false,
      signed ? postDashboard('/api/agents/draft-confirmation', {
        booking_id: booking.id,
        first_name: booking.first_name || name,
        last_name: booking.last_name || null,
        email,
        charter_type: charterType || 'Charter',
        charter_date: charterDate,
        charter_time: booking.charter_time || '',
        guests: guests || '',
        duration: duration || '4hr',
        total_price: totalPrice,
        deposit_amount: booking.deposit_amount || amountPaid,
        special_requests: booking.special_requests || '',
      }) : false,
      postDashboard('/api/owner-notify', {
        event: 'deposit_paid',
        booking_id: booking?.id || null,
        name,
        email,
        phone: booking?.phone || metadata.phone || null,
        charter_type: charterType,
        charter_date: charterDate,
        guests,
        total_price: totalPrice,
        amount: amountPaid,
      }),
      (async () => {
        if (!email || !RESEND_API_KEY) return false;
        try {
          const balance = paidInFull ? 0 : (totalPrice || 0) - amountPaid;
          const balancePaymentUrl = balance > 0
            ? await createBalancePaymentLink(balance, name, email, charterType, charterDate, booking?.id)
            : null;
          return await sendWelcomeEmail({ name, email, charterType, charterDate, guests, duration, totalPrice, amountPaid, paidInFull, balancePaymentUrl });
        } catch (err) {
          console.error('Welcome email error:', err);
          return false;
        }
      })(),
    ]);

    return res.status(200).json({
      received: true,
      action: paidInFull ? 'full_payment_recorded' : 'deposit_recorded',
      booking_id: booking?.id || null,
      welcome_sent: welcome,
      owner_notified: ownerNotified,
      awaiting_signature: !signed,
      calendar_created: calendar,
      captain_dispatched: dispatch,
      confirmation_drafted: draft,
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
