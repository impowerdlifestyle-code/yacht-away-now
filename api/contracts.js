const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbnRyYm9xZXpoa2J0Znd0enNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDY4NTksImV4cCI6MjA5MTY4Mjg1OX0.LmtivYm_0aOtZQ7p7a2_S99Eaqhy3boBe-D-5WPSI4Y';
const ADMIN_KEY = process.env.AFFILIATE_ADMIN_KEY || 'yacht-affiliate-admin-2026';
const ADMIN_USER = process.env.AFFILIATE_ADMIN_USER || 'admin';

function checkAdmin(req) {
  const key = req.headers['x-admin-key'];
  const user = req.headers['x-admin-user'];
  return key === ADMIN_KEY && user === ADMIN_USER;
}

async function supabase(method, path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

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
      const contracts = await supabase('GET', `signed_contracts?id=eq.${id}`);
      if (!contracts || contracts.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(contracts[0]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}
