// Returns the live roster of active captains for the booking contract's
// Captain Selection Agreement, so the on-site selection always matches the
// dashboard. Same-origin, read-only.
import { SUPABASE_URL, supabaseHeaders } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('captains: SUPABASE_SERVICE_KEY is not set');
    return res.status(500).json({ ok: false, captains: [], error: 'Server not configured' });
  }

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/captains?status=eq.active&select=name&order=name.asc`,
      { headers: supabaseHeaders() }
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
