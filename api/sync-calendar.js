// Re-fires the Google Calendar event for an already signed + deposit-paid
// booking, for when the normal trigger failed. Callers present the admin key
// or YAN_BOOKING_SECRET, and the booking must be both signed and paid.
import { SUPABASE_URL, supabaseHeaders, isAdmin, hasBookingSecret, createCalendarEvent } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!isAdmin(req) && !hasBookingSecret(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('sync-calendar: SUPABASE_SERVICE_KEY is not set');
    return res.status(500).json({ ok: false, error: 'Server not configured' });
  }

  const { booking_id, email } = req.body || {};
  if (!booking_id || !email) return res.status(400).json({ ok: false, error: 'booking_id and email required' });

  const r = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(booking_id)}&select=*`, {
    headers: supabaseHeaders(),
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

  if (!(await createCalendarEvent(b))) {
    return res.status(502).json({ ok: false, error: 'Calendar webhook call failed' });
  }

  return res.status(200).json({ ok: true, synced: `${b.first_name} ${b.last_name || ''}`.trim(), date: b.charter_date, time: b.charter_time });
}
