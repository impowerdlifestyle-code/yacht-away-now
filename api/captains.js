// Returns the live roster of active captains for the booking contract's
// Captain Selection Agreement, so the on-site selection always matches the
// dashboard. Same-origin, read-only.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbnRyYm9xZXpoa2J0Znd0enNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDY4NTksImV4cCI6MjA5MTY4Mjg1OX0.LmtivYm_0aOtZQ7p7a2_S99Eaqhy3boBe-D-5WPSI4Y';

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/captains?status=eq.active&select=name&order=name.asc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await r.json();
    const captains = Array.isArray(rows)
      ? [...new Set(rows.map((x) => (x.name || '').trim()).filter(Boolean))]
      : [];
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ ok: true, captains });
  } catch (e) {
    return res.status(200).json({ ok: false, captains: [], error: String(e) });
  }
}
