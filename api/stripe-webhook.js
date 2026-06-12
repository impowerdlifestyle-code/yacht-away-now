const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const GOOGLE_CALENDAR_WEBHOOK = process.env.GOOGLE_CALENDAR_WEBHOOK
  || 'https://script.google.com/macros/s/AKfycbwvbcNmqi9QRDriGsv7rKZNIAOOm9u8KbLxL6sOndNzUspmqT3ecC_Dj53LovtxsWrh/exec';

// Create the Google Calendar event. Called ONLY after contract signed + deposit
// paid — never on a raw booking request. The Apps Script renders in US Eastern.
async function createCalendarEvent(b) {
  if (!GOOGLE_CALENDAR_WEBHOOK || !b || !b.charter_date) return;
  try {
    await fetch(GOOGLE_CALENDAR_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: b.first_name || '',
        last_name: b.last_name || '',
        phone: b.phone || '',
        email: b.email || '',
        charter_type: b.charter_type || 'Charter',
        preferred_date: b.charter_date,
        preferred_time: b.charter_time || '10:00',
        guests: b.guests || '',
        duration: b.duration || '4hr',
        message: b.special_requests || '',
      }),
    });
  } catch (err) {
    console.error('Calendar create error (non-fatal):', err);
  }
}
const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbnRyYm9xZXpoa2J0Znd0enNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDY4NTksImV4cCI6MjA5MTY4Mjg1OX0.LmtivYm_0aOtZQ7p7a2_S99Eaqhy3boBe-D-5WPSI4Y';

async function supabasePatch(path, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

async function createBalancePaymentLink(amount, name, email, charterType, charterDate) {
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', 'https://www.yachtawaynow.com/contract?balance_paid=true');
  params.append('cancel_url', 'https://www.yachtawaynow.com/contract?balance_canceled=true');
  params.append('customer_email', email);
  params.append('line_items[0][price_data][currency]', 'usd');
  params.append('line_items[0][price_data][product_data][name]', 'Charter Balance Payment');
  params.append('line_items[0][price_data][product_data][description]',
    `Remaining balance for ${charterType || 'Charter'} — ${charterDate || 'TBD'}`
  );
  params.append('line_items[0][price_data][unit_amount]', Math.round(amount * 100).toString());
  params.append('line_items[0][quantity]', '1');
  params.append('payment_method_types[0]', 'card');
  params.append('payment_intent_data[metadata][charterer_name]', name || '');
  params.append('payment_intent_data[metadata][type]', 'balance_payment');

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await res.json();
  return session.url || null;
}

async function sendWelcomeEmail(name, email, charterType, charterDate, guests, duration, totalPrice, depositAmount, balancePaymentUrl) {
  const firstName = name.split(' ')[0];
  const balance = (totalPrice || 0) - (depositAmount || 0);
  const dateFormatted = charterDate
    ? new Date(charterDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Yacht Away Now <bookings@yachtawaynow.com>',
      to: email,
      reply_to: 'josh@yachtawaynow.com',
      subject: `Welcome Aboard, ${firstName}! Your Charter Awaits ⚓`,
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
    <p style="text-align:center;color:#8bbad4;font-size:0.95rem;margin:0 0 32px;line-height:1.7;">Your deposit is confirmed and your charter is locked in. We can't wait to have you on the water!</p>

    ${dateFormatted ? `
    <div style="background:#0d2538;border:1px solid #163248;border-radius:14px;overflow:hidden;margin-bottom:24px;">
      <div style="background:linear-gradient(135deg,#0b1d2e,#122d45);padding:14px 24px;border-bottom:1px solid #163248;">
        <p style="margin:0;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.12em;color:#5a7d96;font-weight:600;">Your Charter</p>
      </div>
      <div style="padding:16px 24px;">
        ${charterType ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Charter Type</span><span style="color:#f0f7fa;font-weight:500;">${charterType}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Date</span><span style="color:#4ecdc4;font-weight:600;">${dateFormatted}</span></div>
        ${guests ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Guests</span><span style="color:#f0f7fa;">${guests}</span></div>` : ''}
        ${duration ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Duration</span><span style="color:#f0f7fa;">${duration}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Deposit Paid</span><span style="color:#22c55e;font-weight:600;">$${depositAmount?.toLocaleString() || '0'} &#10003;</span></div>
        ${balance > 0 ? `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Remaining Balance</span><span style="color:#d4a853;font-weight:700;">$${balance.toLocaleString()}</span></div>` : ''}
      </div>
    </div>
    ` : ''}

    ${balance > 0 ? `
    <div style="background:linear-gradient(135deg,#122d45,#0d2538);border:1px solid rgba(212,168,83,0.2);border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.12em;color:#5a7d96;font-weight:600;">Remaining Balance</p>
      <p style="margin:0 0 4px;font-size:1.8rem;font-weight:700;color:#d4a853;font-family:Georgia,serif;">$${balance.toLocaleString()}</p>
      <p style="margin:0 0 16px;font-size:0.78rem;color:#8bbad4;">Due 24 hours before your charter</p>
      ${balancePaymentUrl ? `<a href="${balancePaymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8912e,#d4a853);color:#0b1d2e;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:0.88rem;">Pay Balance Now</a>
      <p style="margin:10px 0 0;font-size:0.72rem;color:#5a7d96;">Or pay later — we'll send a reminder 48 hours before departure.</p>` : ''}
    </div>
    ` : ''}

    <div style="background:#0d2538;border:1px solid #163248;border-radius:14px;padding:28px 24px;margin-bottom:24px;">
      <h2 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;font-size:1.15rem;margin:0 0 20px;text-align:center;">What Happens Next</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 12px 10px 0;vertical-align:top;width:40px;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-size:0.9rem;color:#fff;text-align:center;line-height:32px;">&#10003;</div></td>
          <td style="padding:10px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;"><strong style="color:#22c55e;">Contract Signed & Deposit Paid</strong><br>You're all set! Your charter date is locked in.</td>
        </tr>
        <tr>
          <td style="padding:10px 12px 10px 0;vertical-align:top;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#b8912e,#d4a853);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#0b1d2e;text-align:center;line-height:32px;">2</div></td>
          <td style="padding:10px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">48 Hours Before</strong><br>We'll send you the exact dock location, parking info, and a reminder to pay any remaining balance.</td>
        </tr>
        <tr>
          <td style="padding:10px 12px 10px 0;vertical-align:top;"><div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#b8912e,#d4a853);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#0b1d2e;text-align:center;line-height:32px;">3</div></td>
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
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const event = req.body;

    if (!event || !event.type) {
      return res.status(400).json({ error: 'Invalid event' });
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      if (!session) return res.json({ received: true });

      const email = session.customer_email;
      const amountPaid = (session.amount_total || 0) / 100;

      // Fetch the payment intent to get metadata
      let metadata = {};
      if (session.payment_intent && typeof session.payment_intent === 'string') {
        const piRes = await fetch(`https://api.stripe.com/v1/payment_intents/${session.payment_intent}`, {
          headers: { 'Authorization': `Bearer ${STRIPE_KEY}` },
        });
        const pi = await piRes.json();
        metadata = pi.metadata || {};
      } else if (session.payment_intent?.metadata) {
        metadata = session.payment_intent.metadata;
      }

      // Skip balance payments — only send welcome for deposit payments
      if (metadata.type === 'balance_payment') {
        // Update booking to fully paid
        if (email) {
          const findRes = await fetch(
            `${SUPABASE_URL}/rest/v1/bookings?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
          );
          const matches = await findRes.json();
          if (Array.isArray(matches) && matches.length > 0) {
            await supabasePatch(`bookings?id=eq.${matches[0].id}`, {
              payment_status: 'paid_full',
              status: 'confirmed',
            });
          }
        }

        // Immediate owner alert (email + SMS to Josh & Ciaran) — balance/invoice paid
        try {
          await fetch('https://yan-dashboard.vercel.app/api/owner-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'balance_paid',
              name: metadata.charterer_name || 'Guest',
              email: email || null,
              amount: amountPaid,
            }),
          });
        } catch (notifyErr) {
          console.error('Owner notify error (non-fatal):', notifyErr);
        }

        return res.json({ received: true, action: 'balance_paid' });
      }

      // This is a deposit payment — send welcome email
      const name = metadata.charterer_name || 'Guest';
      const charterType = metadata.charter_type || null;
      const charterDate = metadata.charter_date || null;
      const guests = metadata.guests || null;
      const totalPrice = metadata.total_price ? parseFloat(metadata.total_price) : null;
      const depositAmount = metadata.deposit_amount ? parseFloat(metadata.deposit_amount) : amountPaid;

      // Update booking status + notify captains (contract is already signed at this point —
      // create-checkout.js sets contract_signed_at before redirecting to Stripe)
      let bookingForNotify = null;
      if (email) {
        const findRes = await fetch(
          `${SUPABASE_URL}/rest/v1/bookings?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1`,
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const matches = await findRes.json();
        if (Array.isArray(matches) && matches.length > 0) {
          bookingForNotify = matches[0];
          await supabasePatch(`bookings?id=eq.${bookingForNotify.id}`, {
            status: 'deposit_paid',
            payment_status: 'deposit_paid',
            paid_at: new Date().toISOString(),
            stripe_payment_id: session.payment_intent || null,
          });
        }
      }

      // Calendar event + Captain notify — both gated on contract_signed + deposit_paid.
      // Deposit is paid by virtue of being in this handler; contract_signed_at
      // confirms the signature. A booking that is not both is never put on the calendar.
      if (bookingForNotify && bookingForNotify.contract_signed_at) {
        await createCalendarEvent(bookingForNotify);
        try {
          await fetch('https://yan-dashboard.vercel.app/api/captain-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking_id: bookingForNotify.id,
              first_name: bookingForNotify.first_name || name,
              last_name: bookingForNotify.last_name || null,
              email,
              phone: bookingForNotify.phone || metadata.phone || null,
              charter_type: bookingForNotify.charter_type || charterType || 'Charter',
              charter_date: bookingForNotify.charter_date || charterDate || 'TBD',
              charter_time: bookingForNotify.charter_time || '',
              guests: bookingForNotify.guests || guests || '',
              duration: bookingForNotify.duration || metadata.duration || '4hr',
              total_price: bookingForNotify.total_price || totalPrice || null,
              special_requests: bookingForNotify.special_requests || '',
            }),
          });
        } catch (err) {
          console.error('Captain notify error (non-fatal):', err);
        }
      }

      // Immediate owner alert (email + SMS to Josh & Ciaran) — deposit paid
      try {
        await fetch('https://yan-dashboard.vercel.app/api/owner-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'deposit_paid',
            booking_id: bookingForNotify?.id || null,
            name,
            email,
            phone: bookingForNotify?.phone || metadata.phone || null,
            charter_type: charterType,
            charter_date: charterDate,
            guests,
            total_price: totalPrice,
            amount: depositAmount,
          }),
        });
      } catch (notifyErr) {
        console.error('Owner notify error (non-fatal):', notifyErr);
      }

      // Create balance payment link if there's a remaining balance
      let balancePaymentUrl = null;
      const balance = (totalPrice || 0) - depositAmount;
      if (balance > 0 && email) {
        balancePaymentUrl = await createBalancePaymentLink(balance, name, email, charterType, charterDate);
      }

      // Send welcome email
      if (email && RESEND_API_KEY) {
        await sendWelcomeEmail(
          name, email, charterType, charterDate, guests,
          metadata.duration || null, totalPrice, depositAmount, balancePaymentUrl
        );
      }

      return res.json({ received: true, action: 'welcome_sent' });
    }

    return res.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.json({ received: true, error: e.message });
  }
}
