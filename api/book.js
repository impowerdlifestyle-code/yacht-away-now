import { SUPABASE_URL, supabaseHeaders, clip, isEmail, isIsoDate } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  // "botcheck" is the hidden Web3Forms honeypot already on every booking form.
  // A person never fills it, so a filled one is dropped while looking accepted.
  if (body.botcheck) {
    return res.status(200).json({ success: true, booking_id: null });
  }

  const first_name = clip(body.first_name, 80);
  const last_name = clip(body.last_name, 80);
  const phone = clip(body.phone, 40);
  const email = clip(body.email, 254);
  const charter_type = clip(body.charter_type, 80);
  const preferred_date = clip(body.preferred_date, 40);
  const preferred_time = clip(body.preferred_time, 20);
  const boat = clip(body.boat, 80);
  const duration = clip(body.duration, 40);
  const message = clip(body.message, 2000);
  const source = body.source;
  const sms_consent = body.sms_consent;
  const guestCount = parseInt(body.guests, 10);
  const guests = Number.isFinite(guestCount) && guestCount > 0 && guestCount <= 999 ? guestCount : null;

  if (!first_name || !isEmail(email)) {
    return res.status(400).json({ error: 'Name and a valid email are required' });
  }

  const booking = {
    first_name,
    last_name: last_name || null,
    email,
    phone: phone || null,
    charter_type: charter_type || null,
    boat: boat || null,
    charter_date: isIsoDate(preferred_date) ? preferred_date : null,
    charter_time: /^\d{1,2}:\d{2}/.test(preferred_time) ? preferred_time : null,
    duration: duration || null,
    guests,
    special_requests: [message, preferred_date && !isIsoDate(preferred_date) ? `Preferred date: ${preferred_date}` : ''].filter(Boolean).join('\n') || null,
    sms_consent: !!sms_consent && sms_consent !== 'false',
    status: 'new',
    payment_status: 'unpaid',
    source: source === 'chat' ? 'ai_concierge' : 'website',
  };

  let bookingId = null;
  let saveError = null;
  try {
    if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY is not set');
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers: supabaseHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(booking),
    });

    if (!dbRes.ok) {
      saveError = await dbRes.text();
    } else {
      const inserted = await dbRes.json();
      bookingId = Array.isArray(inserted) && inserted[0] ? inserted[0].id : null;
      if (!bookingId) saveError = 'Insert returned no row';
    }
  } catch (err) {
    saveError = String(err);
  }
  if (saveError) {
    console.error('Supabase save error:', saveError);
    await alertLeadNotSaved({ ...booking, charter_date: preferred_date || null }, saveError);
  }

  // NOTE: Calendar events are intentionally NOT created here. A raw booking
  // request is not a confirmed charter. The event is created only after the
  // contract is signed AND the deposit is paid — see api/stripe-webhook.js
  // (checkout.session.completed, deposit path).

  // Send email notification (only for AI chatbot bookings — website form already sends via Web3Forms)
  if (source === 'chat' && process.env.WEB3FORMS_KEY) {
    try {
      const subject = `New Charter Booking: ${first_name} ${last_name || ''} (${charter_type || 'Charter'})`;
      const mailBody = `
NEW BOOKING REQUEST: AI Chat Concierge
========================================

Name:           ${first_name} ${last_name || ''}
Phone:          ${phone || 'Not provided'}
Email:          ${email}
Charter Type:   ${charter_type || 'Not specified'}
Preferred Date: ${preferred_date || 'Flexible'}
Guests:         ${guests || 'Not specified'}
Duration:       ${duration || 'Not specified'}
Special Notes:  ${message || 'None'}

========================================
Source: AI Chat Concierge on yachtawaynow.com
Reply directly to this email to reach the customer at ${email}
      `.trim();

      const mailRes = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: process.env.WEB3FORMS_KEY,
          subject,
          from_name: 'Yacht Away Now AI Concierge',
          reply_to: email,
          ccemail: 'josh@yachtawaynow.com',
          message: mailBody,
        }),
      });
      if (!mailRes.ok) console.error(`Web3Forms notification failed: ${mailRes.status} ${(await mailRes.text()).slice(0, 300)}`);
    } catch (err) {
      console.error('Email error (non-fatal):', err);
    }
  }

  // Captain notification is deferred until contract is signed + deposit is paid.
  // Fires from yacht-away-now/api/stripe-webhook.js on checkout.session.completed.

  // Forward to Business Brain — auto-sends pre-nurture email with deposit + contract links
  let forwarded = false;
  if (!process.env.YAN_BOOKING_SECRET) {
    console.error('Brain forward skipped: YAN_BOOKING_SECRET is not set');
  } else {
    try {
      const brainRes = await fetch('https://business-brain-six.vercel.app/api/yan/booking-received', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-yan-booking-secret': process.env.YAN_BOOKING_SECRET,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          first_name,
          last_name: last_name || null,
          email,
          phone: phone || null,
          charter_type: charter_type || null,
          charter_date: booking.charter_date,
          charter_time: booking.charter_time,
          boat: boat || null,
          duration: duration || null,
          guests,
          special_requests: message || null,
          source: source === 'chat' ? 'ai_concierge' : 'website',
        }),
      });
      forwarded = brainRes.ok;
      if (!brainRes.ok) console.error(`Brain forward failed: ${brainRes.status} ${(await brainRes.text()).slice(0, 300)}`);
    } catch (err) {
      console.error('Brain forward error (non-fatal):', err);
    }
  }

  if (saveError) {
    return res.status(502).json({ success: false, booking_id: null, forwarded, error: 'Your request was received but could not be saved. Please call (727) 609-2248.' });
  }
  return res.status(200).json({ success: true, booking_id: bookingId, forwarded });
}

// The browser fires this endpoint without awaiting it, so a failed insert is
// invisible from the page: the guest still sees the success panel and Web3Forms
// still emails the lead. Without this, the only symptom is a booking that never
// appears in the dashboard and nobody knows to look for it.
async function alertLeadNotSaved(booking, detail) {
  if (!process.env.WEB3FORMS_KEY) {
    console.error('alertLeadNotSaved skipped: WEB3FORMS_KEY is not set');
    return;
  }
  try {
    const alertRes = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: process.env.WEB3FORMS_KEY,
        subject: `LEAD NOT SAVED: ${booking.first_name} ${booking.last_name || ''}`.trim(),
        message:
          'A booking request reached /api/book but the Supabase insert failed. ' +
          'The lead exists only in the Web3Forms email. Add it to the dashboard by hand.\n\n' +
          `Name:  ${booking.first_name} ${booking.last_name || ''}\n` +
          `Email: ${booking.email}\n` +
          `Phone: ${booking.phone || '(none)'}\n` +
          `Date:  ${booking.charter_date || '(none)'}\n` +
          `Type:  ${booking.charter_type || '(none)'}\n\n` +
          `Supabase said: ${String(detail).slice(0, 500)}`,
      }),
    });
    if (!alertRes.ok) console.error(`alertLeadNotSaved was not delivered: ${alertRes.status}`);
  } catch (e) {
    console.error('alertLeadNotSaved failed:', e);
  }
}
