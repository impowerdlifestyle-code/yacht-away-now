import { SUPABASE_URL, supabaseHeaders, clip, isEmail, isIsoDate, lowerEmail, linkToken, contractUrl, alertOwners } from './_shared.js';

const TURNSTILE_ALERT_WINDOW_MS = 6 * 60 * 60 * 1000;

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
  const email = lowerEmail(body.email);
  const charter_type = clip(body.charter_type, 80);
  const preferred_date = clip(body.preferred_date, 40);
  const preferred_time = clip(body.preferred_time, 20);
  const boat = clip(body.boat, 80);
  const duration = clip(body.duration, 40);
  const message = clip(body.message, 2000);
  const sms_consent = body.sms_consent;
  const guestCount = parseInt(body.guests, 10);
  const guests = Number.isFinite(guestCount) && guestCount > 0 && guestCount <= 999 ? guestCount : null;

  if (!first_name || !isEmail(email)) {
    return res.status(400).json({ error: 'Name and a valid email are required' });
  }

  // Subscription-bombing bots fill the form with someone else's address so the
  // victim gets our emails. Every one seen so far (46 of 71 requests between
  // September 1 and October 13, 2026) used a reserved fictional 555-01xx phone
  // and asked for a newsletter with no charter details. Dropped like the
  // honeypot: nothing saved, nothing emailed.
  const digits = phone.replace(/\D/g, '');
  const fictionalPhone = /^1?[2-9]\d{2}55501\d{2}$/.test(digits);
  const newsletterOnly = !charter_type && !preferred_date
    && /newsletter|subscri|latest news|email updates|(news|updates) about|(company|product) news/i.test(message);
  // Every booking form makes the date required, and all 149 real bookings to
  // date have one, so a dateless request never came from the page.
  if (fictionalPhone || newsletterOnly || !preferred_date) {
    console.warn('Dropped bot signup');
    return res.status(200).json({ success: true, booking_id: null });
  }

  const turnstile = await verifyTurnstile(body.turnstile_token, req.headers['x-forwarded-for']);
  if (!turnstile.ok) {
    console.warn(`Turnstile rejected booking: ${turnstile.reason}`);
    return res.status(403).json({ success: false, error: 'We could not verify this request. Please refresh the page and try again, or call (727) 609-2248.' });
  }
  if (turnstile.misconfigured) {
    console.error(`Turnstile misconfigured, accepting booking: ${turnstile.misconfigured}`);
    await alertTurnstileMisconfigured(turnstile.misconfigured);
  }

  // A typed two-digit year arrives as 0020-01-30, which is a valid ISO date.
  const dateIsUsable = isIsoDate(preferred_date) && Number(preferred_date.slice(0, 4)) >= new Date().getFullYear();

  const booking = {
    first_name,
    last_name: last_name || null,
    email,
    phone: phone || null,
    charter_type: charter_type || null,
    boat: boat || null,
    charter_date: dateIsUsable ? preferred_date : null,
    charter_time: /^\d{1,2}:\d{2}/.test(preferred_time) ? preferred_time : null,
    duration: duration || null,
    guests,
    special_requests: [message, preferred_date && !dateIsUsable ? `Preferred date: ${preferred_date}` : ''].filter(Boolean).join('\n') || null,
    sms_consent: !!sms_consent && sms_consent !== 'false',
    status: 'new',
    payment_status: 'unpaid',
    source: 'website',
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
  // contract is signed AND the deposit is paid. See api/stripe-webhook.js
  // (checkout.session.completed, deposit path).

  // The wizard reads this cookie to build the guest's contract link, and the
  // contract page falls back to it, so no name, email or phone goes in a URL.
  const link = bookingId && process.env.YAN_BOOKING_SECRET ? contractUrl(bookingId) : null;
  res.setHeader('Set-Cookie', link
    ? `yan_contract=${bookingId}.${linkToken('contract', bookingId)}; Path=/; Max-Age=86400; SameSite=Lax; Secure`
    : 'yan_contract=; Path=/; Max-Age=0; SameSite=Lax; Secure');

  // Captain notification is deferred until contract is signed + deposit is paid.
  // Fires from yacht-away-now/api/stripe-webhook.js on checkout.session.completed.

  // Forward to Business Brain, which emails the supplied address a pre-nurture
  // message. With the bot check down that email is exactly what a
  // subscription bomber wants, so the lead is saved and the owners are told,
  // but nothing goes to the address until Turnstile is verifying again.
  let forwarded = false;
  if (turnstile.misconfigured) {
    console.error('Brain forward skipped: Turnstile is misconfigured');
    await alertOwners(
      `New booking request (not auto-emailed): ${first_name} ${last_name || ''}`.trim(),
      'The bot check is misconfigured, so this request was saved but the automatic email to the guest was NOT sent. Contact them yourself.\n' +
        'To keep a bot flood out of this inbox, at most one of these is sent every 5 minutes. Any others are in the dashboard.\n\n' +
        leadSummary({ ...booking, charter_date: preferred_date || null }),
      { key: 'lead-not-forwarded', windowMs: 5 * 60 * 1000 },
    );
  } else if (!process.env.YAN_BOOKING_SECRET) {
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
          source: 'website',
          contract_url: link,
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
  return res.status(200).json({ success: true, booking_id: bookingId, forwarded, contract_url: link });
}

async function verifyTurnstile(token, forwardedFor) {
  if (typeof token !== 'string' || !token) return { ok: false, reason: 'no token' };
  // A bad secret on our side rejected every real booking from 2026-10-16 to
  // 2026-11-12 with no alert. A config fault is ours, not the guest's: accept and alert.
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, misconfigured: 'TURNSTILE_SECRET_KEY is not set' };
  const params = new URLSearchParams({ secret, response: token });
  const ip = String(forwardedFor || '').split(',')[0].trim();
  if (ip) params.set('remoteip', ip);
  try {
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: params });
    const result = await verifyRes.json();
    if (result.success) return { ok: true };
    const codes = result['error-codes'] || [];
    const configFault = codes.find((c) => c === 'invalid-input-secret' || c === 'missing-input-secret');
    if (configFault) return { ok: true, misconfigured: configFault };
    return { ok: false, reason: codes.join(',') || 'failed' };
  } catch (err) {
    // A Cloudflare outage must not cost Josh real leads; the cheap filters above still ran.
    console.error('Turnstile siteverify unreachable, accepting booking:', err);
    return { ok: true };
  }
}

function leadSummary(booking) {
  return `Name:  ${booking.first_name} ${booking.last_name || ''}\n` +
    `Email: ${booking.email}\n` +
    `Phone: ${booking.phone || '(none)'}\n` +
    `Date:  ${booking.charter_date || '(none)'}\n` +
    `Type:  ${booking.charter_type || '(none)'}`;
}

// Throttled: with the bot check down every bot request reaches this line, and
// one email per request would turn a bot flood into an inbox flood.
function alertTurnstileMisconfigured(reason) {
  return alertOwners(
    'TURNSTILE MISCONFIGURED on yachtawaynow.com',
    `Cloudflare Turnstile rejected our server key (${reason}). ` +
      'Bookings are still being saved, but without the bot check, and the automatic email to the guest is switched off until this is fixed. ' +
      'Set TURNSTILE_SECRET_KEY in the yachtawaynow Vercel project to the secret for the site key in app.js, then redeploy.',
    { key: 'turnstile-misconfigured', windowMs: TURNSTILE_ALERT_WINDOW_MS },
  );
}

// On a failed insert the guest still sees the success panel and Web3Forms
// still emails the lead. Without this, the only symptom is a booking that never
// appears in the dashboard and nobody knows to look for it.
function alertLeadNotSaved(booking, detail) {
  return alertOwners(
    `LEAD NOT SAVED: ${booking.first_name} ${booking.last_name || ''}`.trim(),
    'A booking request reached /api/book but the Supabase insert failed. ' +
      'The lead exists only in the Web3Forms email. Add it to the dashboard by hand.\n\n' +
      `${leadSummary(booking)}\n\n` +
      `Supabase said: ${String(detail).slice(0, 500)}`,
  );
}
