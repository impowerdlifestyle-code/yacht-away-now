import { SUPABASE_URL, supabaseHeaders, isAdminUser } from './_shared.js';

async function supabase(method, path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: supabaseHeaders(),
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  if (!isAdminUser(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('contracts: SUPABASE_SERVICE_KEY is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const action = req.query.action;

  if (req.method === 'GET' && action === 'list') {
    try {
      const contracts = await supabase('GET', 'signed_contracts?order=signed_at.desc&select=id,charterer_name,email,charter_type,charter_date,guests,total_price,deposit_amount,signed_at');
      return res.json(contracts || []);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'GET' && action === 'detail') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      const contracts = await supabase('GET', `signed_contracts?id=eq.${encodeURIComponent(id)}`);
      if (!contracts || contracts.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(contracts[0]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}
