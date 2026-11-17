// Returns busy time ranges for a given date so the booking wizard can gray out
// slots that are already taken. Source of truth = paid bookings in
// Supabase (the Google Calendar is create-only via Apps Script and has no read API).
//
// Per-boat availability: if the `bookings` table has a `boat` column, busy ranges
// are tagged with the boat so the wizard can show which boats are free for a slot.
// Until that column exists, availability is fleet-wide (a slot is busy if ANY
// confirmed charter overlaps it). To enable true per-boat calendars, run once:
//   ALTER TABLE bookings ADD COLUMN boat text;
// and the endpoint will start partitioning automatically.

import { paidBookingsOn, busyRange } from './_shared.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const date = (req.query && req.query.date) || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ ok: false, error: 'date=YYYY-MM-DD required' });
  }
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('availability: SUPABASE_SERVICE_KEY is not set');
    return res.status(503).json({ ok: false, error: 'Availability is unavailable' });
  }

  let rows;
  let hasBoat;
  try {
    ({ rows, hasBoat } = await paidBookingsOn(date));
  } catch (err) {
    console.error('availability query failed:', err && err.message);
    return res.status(503).json({ ok: false, error: 'Availability is unavailable' });
  }

  const busy = [];
  for (const r of rows) {
    const range = busyRange(r);
    if (!range) continue;
    busy.push({ ...range, boat: hasBoat ? r.boat || null : null });
  }

  return res.status(200).json({ ok: true, hasBoat, date, busy });
}
