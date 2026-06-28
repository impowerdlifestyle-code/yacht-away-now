// Re-fires the Google Calendar event for an already signed + deposit-paid
// booking. Needed because a charter that pays first and signs later can miss
// the normal calendar trigger. Gated to signed+paid bookings, and the caller
// must supply the matching email, so it can't be used to spam arbitrary events.
const GOOGLE_CALENDAR_WEBHOOK = process.env.GOOGLE_CALENDAR_WEBHOOK;
const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbnRyYm9xZXpoa2J0Znd0enNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDY4NTksImV4cCI6MjA5MTY4Mjg1OX0.LmtivYm_0aOtZQ7p7a2_S99Eaqhy3boBe-D-5WPSI4Y';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!GOOGLE_CALENDAR_WEBHOOK) return res.status(500).json({ ok: false, error: 'Calendar webhook not configured' });

  const { booking_id, email } = req.body || {};
  if (!booking_id || !email) return res.status(400).json({ ok: false, error: 'booking_id and email required' });

  const r = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking_id}&select=*`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  const rows = await r.json();
  const b = Array.isArray(rows) ? rows[0] : null;
  if (!b) return res.status(404).json({ ok: false, error: 'Booking not found' });
  if ((b.email || '').toLowerCase() !== String(email).toLowerCase()) {
    return res.status(403).json({ ok: false, error: 'Email does not match booking' });
  }

  const paid = b.payment_status === 'deposit_paid' || b.payment_status === 'paid_full';
  if (!b.contract_signed_at || !paid) {
    return res.status(409).json({ ok: false, error: 'Booking is not both signed and paid' });
  }
  if (!b.charter_date) return res.status(409).json({ ok: false, error: 'Booking has no charter date' });

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
    return res.status(502).json({ ok: false, error: 'Calendar webhook call failed: ' + String(err) });
  }

  return res.status(200).json({ ok: true, synced: `${b.first_name} ${b.last_name || ''}`.trim(), date: b.charter_date, time: b.charter_time });
}
