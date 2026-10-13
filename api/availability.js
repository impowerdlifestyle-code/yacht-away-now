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

import { SUPABASE_URL, supabaseHeaders } from './_shared.js';

const DURATION_HOURS = { '4hr': 4, '5hr': 5, '6hr': 6, '8hr': 8 };

function toMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function hoursFor(duration) {
  if (!duration) return null;
  const key = String(duration).toLowerCase();
  if (DURATION_HOURS[key]) return DURATION_HOURS[key];
  const num = key.match(/(\d+)\s*h/);
  if (num) return parseInt(num[1], 10);
  return null; // overnight / multi-day / unknown — not an hourly slot
}

async function fetchBookings(date, select) {
  // Only money holds a slot. contract_signed can be set without paying, so a
  // signature alone never blocks a time for other customers.
  const filters =
    `charter_date=eq.${encodeURIComponent(date)}` +
    `&or=(payment_status.in.(deposit_paid,paid_full),status.in.(confirmed,deposit_paid))` +
    `&archived=not.is.true`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?${filters}&select=${select}`, {
    headers: supabaseHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

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

  // Try the per-boat select first; fall back to fleet-wide if the column is absent.
  let rows;
  let hasBoat = true;
  try {
    rows = await fetchBookings(date, 'charter_time,duration,boat');
  } catch {
    hasBoat = false;
    try {
      rows = await fetchBookings(date, 'charter_time,duration');
    } catch (err) {
      console.error('availability query failed:', err && err.message);
      return res.status(503).json({ ok: false, error: 'Availability is unavailable' });
    }
  }

  const busy = [];
  for (const r of rows || []) {
    const start = toMinutes(r.charter_time);
    const hrs = hoursFor(r.duration);
    if (start == null) continue; // legacy rows with no time can't be placed
    const end = hrs == null ? 20 * 60 : start + hrs * 60; // overnight/multi -> rest of day
    busy.push({
      startMin: start,
      endMin: end,
      boat: hasBoat ? r.boat || null : null,
    });
  }

  return res.status(200).json({ ok: true, hasBoat, date, busy });
}
