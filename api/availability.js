// Returns busy time ranges for a given date so the booking wizard can gray out
// slots that are already taken. Source of truth = confirmed/paid bookings in
// Supabase (the Google Calendar is create-only via Apps Script and has no read API).
//
// Per-boat availability: if the `bookings` table has a `boat` column, busy ranges
// are tagged with the boat so the wizard can show which boats are free for a slot.
// Until that column exists, availability is fleet-wide (a slot is busy if ANY
// confirmed charter overlaps it). To enable true per-boat calendars, run once:
//   ALTER TABLE bookings ADD COLUMN boat text;
// and the endpoint will start partitioning automatically.

const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbnRyYm9xZXpoa2J0Znd0enNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDY4NTksImV4cCI6MjA5MTY4Mjg1OX0.LmtivYm_0aOtZQ7p7a2_S99Eaqhy3boBe-D-5WPSI4Y';

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
  // Confirmed/paid charters only — raw "new" requests don't block a slot.
  const filters =
    `charter_date=eq.${encodeURIComponent(date)}` +
    `&or=(payment_status.in.(paid,deposit_paid),status.in.(confirmed,deposit_paid,contract_signed,completed))` +
    `&archived=eq.false`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?${filters}&select=${select}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const date = (req.query && req.query.date) || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ ok: false, error: 'date=YYYY-MM-DD required', busy: [] });
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
      // Fail open: don't block the customer if the DB is unreachable.
      return res.status(200).json({ ok: false, hasBoat: false, busy: [] });
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
