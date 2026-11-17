// Returns the roster of active captains for the booking contract's Captain
// Selection Agreement. Public and unauthenticated, so it gives out a first
// name and last initial only, and leaves the business owners off the list.
import { SUPABASE_URL, supabaseHeaders } from './_shared.js';
import { OWNERS } from './_owner-alert.js';

function displayName(fullName, lastLetters) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1].slice(0, lastLetters)}.`;
}

// Two captains who share a first name and last initial get more of the last
// name, three letters at most, so the picker stays unambiguous.
function publicRoster(rows) {
  const roster = rows.map((row) => ({ id: row.id, full: row.name, letters: 1, name: displayName(row.name, 1) }));
  for (let pass = 0; pass < 2; pass++) {
    const seen = new Map();
    for (const entry of roster) seen.set(entry.name, (seen.get(entry.name) || 0) + 1);
    const clashing = roster.filter((entry) => seen.get(entry.name) > 1);
    if (clashing.length === 0) break;
    for (const entry of clashing) entry.name = displayName(entry.full, ++entry.letters);
  }
  return roster.map(({ id, name }) => ({ id, name }));
}

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
      `${SUPABASE_URL}/rest/v1/captains?status=eq.active&select=id,name,email&order=name.asc`,
      { headers: supabaseHeaders() }
    );
    if (!r.ok) throw new Error(`Supabase answered ${r.status}`);
    const rows = (await r.json()).filter(
      (row) => (row.name || '').trim() && !OWNERS.includes(String(row.email || '').trim().toLowerCase())
    );
    const roster = publicRoster(rows);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    // captains stays a list of strings because contract.html uses each entry as
    // both the label and the posted value. roster carries the id for each label.
    return res.status(200).json({ ok: true, captains: roster.map((c) => c.name), roster });
  } catch (e) {
    console.error('captains: roster lookup failed:', e);
    return res.status(200).json({ ok: false, captains: [], roster: [], error: 'Roster unavailable' });
  }
}
