import { SUPABASE_URL, supabaseHeaders, isCron } from './_shared.js';

// From 2026-10-16 to 2026-11-12 a bad Turnstile secret turned every booking
// into a 403 and nothing noticed for four weeks. Whatever breaks next (form,
// bot check, database, JS), the symptom is the same: no new rows. Slowest real
// week in 2026 had one booking, so seven quiet days means look now.
const QUIET_DAYS = 7;
const OWNERS = ['josh@yachtawaynow.com', 'ciaran@voreli.ai'];

export default async function handler(req, res) {
  if (!isCron(req)) return res.status(401).json({ error: 'Unauthorized' });

  const latestRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?select=created_at&order=created_at.desc&limit=1`,
    { headers: supabaseHeaders() },
  );
  if (!latestRes.ok) {
    const detail = (await latestRes.text()).slice(0, 300);
    console.error(`booking-watchdog: Supabase read failed: ${latestRes.status} ${detail}`);
    await alertOwners('Booking watchdog could not read bookings', `Supabase answered ${latestRes.status}: ${detail}`);
    return res.status(502).json({ ok: false });
  }

  const [latest] = await latestRes.json();
  const lastAt = latest ? new Date(latest.created_at) : null;
  const quietDays = lastAt ? (Date.now() - lastAt.getTime()) / 86400000 : Infinity;
  const quiet = quietDays >= QUIET_DAYS;
  console.log(`booking-watchdog: last booking ${lastAt ? lastAt.toISOString() : 'never'}, quiet ${quietDays.toFixed(1)} days`);

  if (quiet) {
    await alertOwners(
      `No website bookings for ${Math.floor(quietDays)} days`,
      `The last booking request was saved ${lastAt ? lastAt.toUTCString() : 'never'}.\n\n` +
        'Before assuming it is a slow week, submit a test booking at https://www.yachtawaynow.com/contact ' +
        'and check that it reaches the dashboard. Then check Vercel logs for /api/book (403s mean the bot check is rejecting guests).',
    );
  }
  return res.status(200).json({ ok: true, last_booking_at: lastAt, quiet_days: Number(quietDays.toFixed(1)), alerted: quiet });
}

async function alertOwners(subject, text) {
  if (!process.env.RESEND_API_KEY) {
    console.error('booking-watchdog: RESEND_API_KEY is not set, alert not sent');
    return;
  }
  try {
    const mailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Yacht Away Now Alerts <alerts@yachtawaynow.com>', to: OWNERS, subject, text }),
    });
    if (!mailRes.ok) console.error(`booking-watchdog: alert failed: ${mailRes.status} ${(await mailRes.text()).slice(0, 300)}`);
  } catch (err) {
    console.error('booking-watchdog: alert failed:', err);
  }
}
