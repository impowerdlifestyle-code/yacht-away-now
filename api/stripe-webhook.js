import {
  SUPABASE_URL, supabaseHeaders, escapeHtml, isIsoDate, isPaid, lowerEmail, cleanName, clip, getBooking, charterHours, boatKey,
  payBalanceUrl, findConflict, postDashboard, notifyOwners, alertOwners, createCalendarEvent,
} from './_shared.js';

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

// Facts for the welcome email's vessel card, taken from our-yacht.html and
// sly-fox.html. A booking with no boat on it gets no card rather than a guess.
const VESSELS = {
  marquis: {
    name: '52ft Marquis Flybridge',
    stats: [['3', 'Deck Levels'], ['13', 'Max Guests'], ['600mi', 'Range']],
    features: 'Full galley &middot; Bluetooth sound &middot; Flybridge lounge &middot; Swim platform',
  },
  'sly-fox': {
    name: 'Sly Fox',
    stats: [['3', 'Staterooms'], ['2', 'Bathrooms'], ['6', 'Sleeps']],
    features: 'Three private staterooms &middot; Aft deck &middot; Salon &middot; Flybridge',
  },
};

function vesselCard(boat) {
  const vessel = VESSELS[boatKey(boat)];
  if (!vessel) return '';
  const cells = vessel.stats.map(([value, label], i) =>
    `<td style="padding:6px 8px;text-align:center;color:#8bbad4;font-size:0.82rem;${i ? 'border-left:1px solid #163248;' : ''}"><span style="display:block;font-size:1.3rem;font-weight:700;color:#f0f7fa;">${value}</span>${label}</td>`).join('');
  return `
    <div style="background:linear-gradient(135deg,#122d45,#0d2538);border:1px solid rgba(212,168,83,0.15);border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.15em;color:#5a7d96;font-weight:600;">Your Vessel</p>
      <h3 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;font-size:1.3rem;margin:0 0 12px;">${vessel.name}</h3>
      <table style="width:100%;max-width:360px;margin:0 auto;border-collapse:collapse;">
        <tr>${cells}</tr>
      </table>
      <p style="margin:12px 0 0;font-size:0.78rem;color:#5a7d96;">${vessel.features}</p>
    </div>`;
}

async function sendWelcomeEmail({ name, email, charterType, charterDate, guests, duration, boat, totalPrice, amountPaid, paidInFull, balancePaymentUrl }) {
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
        <tr><td style="padding:8px 12px 8px 0;vertical-align:top;width:30px;font-size:1.2rem;">&#127866;</td><td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;"><strong style="color:#f0f7fa;">BYOB</strong>: Bring your own drinks and snacks. We have a full galley with fridge, ice, and glassware.</td></tr>
        <tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#9728;&#65039;</td><td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Sun Essentials</strong>: Reef-safe sunscreen, sunglasses, towels, and hats.</td></tr>
        <tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#127908;</td><td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Set the Vibe</strong>: Bluetooth sound system onboard. Queue up your playlist.</td></tr>
        <tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#128247;</td><td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Capture It</strong>: Our captain is happy to take photos. Drone footage available upon request.</td></tr>
        <tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#128094;</td><td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Wildlife</strong>: Keep an eye out for dolphins, manatees, and sea turtles.</td></tr>
      </table>
    </div>

    <div style="border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <img src="https://www.yachtawaynow.com/images/yacht-night-leds.jpg" alt="Yacht at night" style="width:100%;height:180px;object-fit:cover;display:block;">
    </div>

    ${vesselCard(boat)}

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
      <p style="margin:0 0 2px;color:#5a7d96;font-size:0.7rem;">Yacht Away Now: Private Charters</p>
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

// Insert-first dedupe: the unique event id makes a redelivery or a concurrent
// delivery lose the insert and stop. Until
// migrations/2026-11-17-stripe-events.sql is applied the table is missing, so
// the handler falls back to comparing the payment id on the booking.
async function claimEvent(row) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stripe_events`, {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify(row),
    });
    if (res.ok) return 'claimed';
    if (res.status === 409) return 'duplicate';
    console.error(`stripe-webhook: stripe_events unavailable (${res.status} ${(await res.text()).slice(0, 200)}), continuing without event dedupe`);
  } catch (err) {
    console.error('stripe-webhook: stripe_events unavailable, continuing without event dedupe:', err);
  }
  return 'unavailable';
}

// A failed run gives its claim back so Stripe's retry is processed, not skipped.
async function releaseEvent(eventId) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stripe_events?event_id=eq.${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: supabaseHeaders({ Prefer: 'return=minimal' }),
    });
    if (res.ok) return;
    console.error(`stripe-webhook: could not release ${eventId}: ${res.status}`);
  } catch (err) {
    console.error(`stripe-webhook: could not release ${eventId}:`, err);
  }
  await alertOwners(
    'Stripe payment may not be recorded',
    `Stripe event ${eventId} failed while being recorded and could not be queued for a retry. Check the payment in Stripe and mark the booking by hand.`,
  );
}

function money(amount) {
  return `$${Number(amount).toLocaleString()}`;
}

// A paid session with no booking behind it still has to exist somewhere the
// owners will see it, so it becomes a booking row marked for review.
async function recordUnmatchedPayment({ metadata, type, email, name, amountPaid, paymentRef, sessionId }) {
  const existing = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?stripe_payment_id=eq.${encodeURIComponent(paymentRef)}&select=id&limit=1`,
    { headers: supabaseHeaders() },
  );
  if (!existing.ok) throw new Error(`Unmatched payment lookup failed: ${existing.status}`);
  const [already] = await existing.json();
  if (already) return { status: 200, body: { received: true, action: 'already_processed', booking_id: already.id } };

  const [firstName, ...rest] = cleanName(name, 120).split(/\s+/);
  const metaTotal = parseFloat(metadata.total_price);
  const guestCount = parseInt(metadata.guests, 10);
  const settled = type !== 'deposit';
  const reason = metadata.booking_id
    ? `Stripe named booking ${clip(metadata.booking_id, 64)}, which does not exist.`
    : 'The Stripe session carried no booking id.';
  const row = {
    first_name: firstName || 'Guest',
    last_name: rest.join(' ') || null,
    email,
    phone: clip(metadata.phone, 40) || null,
    charter_type: clip(metadata.charter_type, 80) || null,
    charter_date: isIsoDate(metadata.charter_date) ? metadata.charter_date : null,
    duration: clip(metadata.duration, 40) || null,
    guests: Number.isFinite(guestCount) && guestCount > 0 ? guestCount : null,
    total_price: Number.isFinite(metaTotal) && metaTotal > 0 ? metaTotal : null,
    deposit_amount: type === 'deposit' ? amountPaid : null,
    status: settled ? 'confirmed' : 'deposit_paid',
    payment_status: settled ? 'paid_full' : 'deposit_paid',
    stripe_payment_id: paymentRef,
    paid_at: new Date().toISOString(),
    source: 'stripe_unmatched',
    notes: `NEEDS OWNER REVIEW: ${money(amountPaid)} ${type} arrived in Stripe (${paymentRef}, session ${sessionId}) with no matching booking. ${reason} This row was created from the payment so it is not lost. Find the real booking, merge, and follow up with the guest.`,
  };
  const insert = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
    method: 'POST',
    headers: supabaseHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  const inserted = insert.ok ? await insert.json() : null;
  const newId = Array.isArray(inserted) && inserted[0] ? inserted[0].id : null;
  const facts = `Name: ${name}\nEmail: ${email || '(none)'}\nAmount: ${money(amountPaid)} (${type})\nStripe payment: ${paymentRef}\nStripe session: ${sessionId}\n${reason}`;
  if (!newId) {
    const detail = insert.ok ? 'insert returned no row' : `${insert.status} ${(await insert.text()).slice(0, 300)}`;
    await alertOwners(
      `PAYMENT WITH NO BOOKING, and it could not be saved: ${name}`,
      `${facts}\n\nSaving a review row failed (${detail}). Stripe will retry. Until then this payment exists only in Stripe.`,
      { key: `unmatched:${paymentRef}`, windowMs: 6 * 60 * 60 * 1000 },
    );
    return { status: 500, body: { error: 'Unmatched payment could not be saved' } };
  }
  const alerted = await alertOwners(
    `PAYMENT WITH NO BOOKING: ${name} paid ${money(amountPaid)}`,
    `${facts}\n\nA booking row marked NEEDS OWNER REVIEW was created (${newId}). No welcome email, calendar event or captain dispatch was sent. Find the real booking and follow up with the guest.`,
  );
  return { status: 200, body: { received: true, action: 'unmatched_flagged', booking_id: newId, owner_alerted: alerted } };
}

async function processPayment({ session, metadata, type, paymentRef }) {
  const isBalance = type === 'balance_payment';
  const sessionEmail = lowerEmail(session.customer_email || session.customer_details?.email || '');
  const amountPaid = (session.amount_total || 0) / 100;

  // The booking comes from the id our own checkout put in the metadata and
  // from nowhere else. Matching on email attached a returning customer's new
  // payment to last season's booking.
  const booking = await getBooking(metadata.booking_id);
  const email = lowerEmail(booking?.email) || sessionEmail || null;
  const name = cleanName(metadata.charterer_name, 120)
    || (booking ? cleanName(`${booking.first_name || ''} ${booking.last_name || ''}`, 120) : '')
    || 'Guest';

  if (!booking) {
    return recordUnmatchedPayment({ metadata, type, email, name, amountPaid, paymentRef, sessionId: session.id });
  }

  if (booking.payment_status === 'refunded') {
    console.error(`stripe-webhook: ${type} of $${amountPaid} landed on refunded booking ${booking.id}; booking left unchanged`);
    const ownerNotified = await notifyOwners({
      event: isBalance ? 'balance_paid' : 'deposit_paid',
      booking_id: booking.id,
      name,
      email,
      amount: amountPaid,
      note: 'This payment arrived on a booking marked REFUNDED. The booking was not changed. Check Stripe and decide whether to return the money or reopen the booking.',
    });
    return { status: 200, body: { received: true, action: 'ignored_refunded', booking_id: booking.id, owner_notified: ownerNotified } };
  }

  if (booking.stripe_payment_id === paymentRef && isPaid(booking)) {
    return { status: 200, body: { received: true, action: 'already_processed' } };
  }

  if (isBalance) {
    const update = { payment_status: 'paid_full', stripe_payment_id: paymentRef };
    if (!TERMINAL_STATUSES.includes(booking.status)) update.status = 'confirmed';
    if (!(await supabasePatch(`bookings?id=eq.${encodeURIComponent(booking.id)}`, update))) {
      return { status: 500, body: { error: 'Booking update failed' } };
    }
    const ownerNotified = await notifyOwners({
      event: 'balance_paid',
      booking_id: booking.id,
      name,
      email,
      amount: amountPaid,
    });
    return { status: 200, body: { received: true, action: 'balance_paid', booking_id: booking.id, owner_notified: ownerNotified } };
  }

  // Only this webhook writes a pi_ id, so one already on a paid booking means
  // an earlier payment was recorded. The dashboard stores cs_ ids when it
  // sends a link, which says nothing about money having arrived.
  if (isPaid(booking) && /^pi_/.test(booking.stripe_payment_id || '')) {
    console.error(`stripe-webhook: second ${type} ${paymentRef} on booking ${booking.id}, first was ${booking.stripe_payment_id}`);
    const alerted = await alertOwners(
      `SECOND PAYMENT on one booking: ${name} paid ${money(amountPaid)} again`,
      `Booking ${booking.id} (${name}, ${email || 'no email'}, ${booking.charter_date || 'no date'}) is already ${booking.payment_status} from Stripe payment ${booking.stripe_payment_id}.\n` +
        `A further ${type} of ${money(amountPaid)} has now arrived as ${paymentRef}.\n\n` +
        'The booking was left as it was: the first payment is still the one on record, and no second welcome email, calendar event or captain dispatch was sent. Check Stripe and decide whether to return the second payment or apply it to the balance.',
    );
    return { status: 200, body: { received: true, action: 'duplicate_payment', booking_id: booking.id, owner_alerted: alerted } };
  }

  const paidInFull = type === 'full_payment';
  const paidStatus = paidInFull ? 'paid_full' : 'deposit_paid';
  const metaTotal = parseFloat(metadata.total_price);
  const totalPrice = Number(booking.total_price) > 0
    ? Number(booking.total_price)
    : (Number.isFinite(metaTotal) && metaTotal > 0 ? metaTotal : null);

  const update = { stripe_payment_id: paymentRef, paid_at: booking.paid_at || new Date().toISOString() };
  if (booking.payment_status !== 'paid_full') update.payment_status = paidStatus;
  if (paidInFull) {
    if (!TERMINAL_STATUSES.includes(booking.status)) update.status = 'confirmed';
  } else if (!booking.status || PRE_DEPOSIT_STATUSES.includes(booking.status)) {
    update.status = 'deposit_paid';
  }
  if (!(Number(booking.total_price) > 0) && totalPrice) update.total_price = totalPrice;
  if (!paidInFull && !(Number(booking.deposit_amount) > 0)) update.deposit_amount = amountPaid;
  // Details the guest supplied or extended on the contract page ride in the
  // metadata and reach the booking only now that they have been paid for.
  if ((charterHours(metadata.duration) || 0) > (charterHours(booking.duration) || 0) && !(Number(booking.total_price) > 0)) {
    update.duration = `${charterHours(metadata.duration)}hr`;
  }
  if (!booking.boat && boatKey(metadata.boat)) update.boat = clip(metadata.boat, 80);
  if (!booking.charter_date && isIsoDate(metadata.charter_date)) update.charter_date = metadata.charter_date;
  if (!booking.charter_time && /^\d{1,2}:\d{2}$/.test(metadata.charter_time || '')) update.charter_time = metadata.charter_time;
  if (!(await supabasePatch(`bookings?id=eq.${encodeURIComponent(booking.id)}`, update))) {
    return { status: 500, body: { error: 'Booking update failed' } };
  }
  const paid = { ...booking, ...update };

  const charterType = paid.charter_type || metadata.charter_type || null;
  const charterDate = paid.charter_date || null;
  const guests = paid.guests || metadata.guests || null;
  const duration = paid.duration || null;
  const signed = !!paid.contract_signed_at;
  const balance = paidInFull ? 0 : (totalPrice || 0) - amountPaid;

  // Calendar, captain dispatch and the confirmation draft wait for the
  // signature. When payment lands first, api/sign-contract.js fires them.
  const steps = {
    owner_notify: notifyOwners({
      event: 'deposit_paid',
      booking_id: paid.id,
      name,
      email,
      phone: paid.phone || metadata.phone || null,
      charter_type: charterType,
      charter_date: charterDate,
      guests,
      total_price: totalPrice,
      amount: amountPaid,
    }),
    welcome_email: (async () => {
      if (!email || !RESEND_API_KEY) return false;
      try {
        return await sendWelcomeEmail({
          name, email, charterType, charterDate, guests, duration, boat: paid.boat, totalPrice, amountPaid, paidInFull,
          balancePaymentUrl: balance > 0 ? payBalanceUrl(paid.id) : null,
        });
      } catch (err) {
        console.error('Welcome email error:', err);
        return false;
      }
    })(),
  };
  if (signed) {
    steps.calendar = createCalendarEvent(paid);
    steps.captain_dispatch = postDashboard('/api/captain-dispatch', { booking_id: paid.id });
    steps.confirmation_draft = postDashboard('/api/agents/draft-confirmation', {
      booking_id: paid.id,
      first_name: paid.first_name || name,
      last_name: paid.last_name || null,
      email,
      charter_type: charterType || 'Charter',
      charter_date: charterDate,
      charter_time: paid.charter_time || '',
      guests: guests || '',
      duration: duration || '4hr',
      total_price: totalPrice,
      deposit_amount: paid.deposit_amount || amountPaid,
      special_requests: paid.special_requests || '',
    });
  }
  const outcomes = await Promise.all(Object.values(steps));
  const done = Object.fromEntries(Object.keys(steps).map((k, i) => [k, !!outcomes[i]]));

  let conflict = null;
  try {
    conflict = await findConflict(paid);
  } catch (err) {
    console.error('stripe-webhook: conflict check failed:', err);
  }
  if (conflict) {
    await alertOwners(
      `DOUBLE BOOKING: ${name} on ${charterDate}`,
      `Booking ${paid.id} (${name}, ${paid.boat || 'boat not set'}, ${charterDate} at ${paid.charter_time}, ${duration || 'no duration'}) has just been paid, ` +
        `and it overlaps paid booking ${conflict.id} (${conflict.boat || 'boat not set'}, ${conflict.charter_time}, ${conflict.duration || 'no duration'}).\n\nCall both guests and move one of them.`,
    );
  }

  // owner_notify reports its own failure by email, so it is left out here.
  const failed = Object.keys(done).filter((k) => !done[k] && k !== 'owner_notify');
  if (failed.length > 0) {
    await alertOwners(
      `Follow-ups failed after payment: ${name}`,
      `${name} (${email || 'no email'}) paid ${money(amountPaid)} for booking ${paid.id} (${charterDate || 'no date'}) and the payment is recorded, but these steps failed: ${failed.join(', ')}.\nDo them by hand in the dashboard.`,
    );
  }

  return {
    status: 200,
    body: {
      received: true,
      action: paidInFull ? 'full_payment_recorded' : 'deposit_recorded',
      booking_id: paid.id,
      welcome_sent: done.welcome_email,
      owner_notified: done.owner_notify,
      awaiting_signature: !signed,
      calendar_created: !!done.calendar,
      captain_dispatched: !!done.captain_dispatch,
      confirmation_drafted: !!done.confirmation_draft,
      conflict_with: conflict ? conflict.id : null,
      failed,
    },
  };
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

  let claim = 'unavailable';
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
    if (type !== 'balance_payment' && !DEPOSIT_TYPES.includes(type)) {
      return res.status(200).json({ received: true, action: 'ignored', reason: `type ${type || 'none'}` });
    }
    const paymentRef = paymentIntentId || session.id;

    claim = await claimEvent({
      event_id: eventId,
      session_id: session.id,
      payment_intent: paymentIntentId,
      booking_id: clip(metadata.booking_id, 64) || null,
      type,
      amount: (session.amount_total || 0) / 100,
    });
    if (claim === 'duplicate') {
      return res.status(200).json({ received: true, action: 'already_processed' });
    }

    const result = await processPayment({ session, metadata, type, paymentRef });
    if (result.status >= 500 && claim === 'claimed') await releaseEvent(eventId);
    return res.status(result.status).json(result.body);
  } catch (e) {
    console.error('Webhook error:', e);
    if (claim === 'claimed') await releaseEvent(eventId);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
