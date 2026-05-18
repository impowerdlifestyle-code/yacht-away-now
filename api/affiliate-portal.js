const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbnRyYm9xZXpoa2J0Znd0enNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDY4NTksImV4cCI6MjA5MTY4Mjg1OX0.LmtivYm_0aOtZQ7p7a2_S99Eaqhy3boBe-D-5WPSI4Y';
const RESET_SECRET = process.env.AFFILIATE_RESET_SECRET || 'yacht-reset-secret-2026';

async function supabase(method, path, body) {
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function checkPassword(affiliate, password) {
  if (affiliate.portal_password) {
    return password === affiliate.portal_password;
  }
  return password === affiliate.code;
}

async function authenticate(req) {
  const email = req.headers['x-affiliate-email'];
  const password = req.headers['x-affiliate-code'];
  if (!email || !password) return null;

  const results = await supabase('GET',
    `affiliates?email=eq.${encodeURIComponent(email)}&select=*`
  );
  if (!results || results.length === 0) return null;
  if (!checkPassword(results[0], password)) return null;
  return results[0];
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

export default async function handler(req, res) {
  const action = req.query.action;

  // Login
  if (req.method === 'POST' && action === 'login') {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
      const results = await supabase('GET',
        `affiliates?email=eq.${encodeURIComponent(email)}&select=id,name,email,code,portal_password,commission_type,commission_value,status,total_clicks,total_conversions,total_earned,total_paid,created_at`
      );
      if (!results || results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      if (!checkPassword(results[0], password)) return res.status(401).json({ error: 'Invalid credentials' });
      if (results[0].status !== 'active') return res.status(403).json({ error: 'Account inactive' });
      return res.json({ id: results[0].id, name: results[0].name, has_custom_password: !!results[0].portal_password });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Forgot password — send reset email
  if (req.method === 'POST' && action === 'forgot-password') {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
      const results = await supabase('GET', `affiliates?email=eq.${encodeURIComponent(email)}&select=id,name,email`);
      // Always return success to prevent email enumeration
      if (!results || results.length === 0) {
        return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
      }

      const token = generateToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      await supabase('PATCH', `affiliates?id=eq.${results[0].id}`, {
        reset_token: token,
        reset_token_expires: expires,
      });

      const resetLink = `https://www.yachtawaynow.com/affiliate-portal?reset=${token}`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Yacht Away Now <affiliates@yachtawaynow.com>',
          to: email,
          reply_to: 'info@yachtawaynow.com',
          subject: 'Reset Your Affiliate Portal Password — Yacht Away Now',
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#071520;color:#f0f7fa;padding:40px 32px;border-radius:12px;">
            <div style="text-align:center;margin-bottom:24px;font-size:2rem;">&#9875;</div>
            <h1 style="font-family:Georgia,serif;color:#d4a853;text-align:center;font-size:1.4rem;margin-bottom:20px;">Password Reset Request</h1>
            <p style="color:#8bbad4;font-size:0.9rem;line-height:1.7;margin-bottom:24px;">Hi ${results[0].name},<br><br>We received a request to reset your affiliate portal password. Click the button below to set a new one:</p>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#b8912e,#d4a853);color:#0b1d2e;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:0.9rem;">Reset My Password</a>
            </div>
            <p style="color:#5a7d96;font-size:0.78rem;text-align:center;margin-bottom:16px;">This link expires in 1 hour.</p>
            <p style="color:#5a7d96;font-size:0.78rem;line-height:1.6;">If you didn't request this, you can safely ignore this email. Your current password will remain unchanged.</p>
            <hr style="border:none;border-top:1px solid #163248;margin:24px 0;">
            <p style="color:#5a7d96;font-size:0.72rem;text-align:center;">Can't click the button? Copy this link:<br><a href="${resetLink}" style="color:#4ecdc4;word-break:break-all;font-size:0.7rem;">${resetLink}</a></p>
          </div>`,
        }),
      });

      return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Verify reset token
  if (req.method === 'POST' && action === 'verify-reset') {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    try {
      const results = await supabase('GET', `affiliates?reset_token=eq.${encodeURIComponent(token)}&select=id,name,reset_token_expires`);
      if (!results || results.length === 0) return res.status(400).json({ error: 'Invalid or expired reset link' });
      if (new Date(results[0].reset_token_expires) < new Date()) return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
      return res.json({ valid: true, name: results[0].name });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Reset password with token
  if (req.method === 'POST' && action === 'reset-password') {
    const { token, new_password } = req.body;
    if (!token || !new_password) return res.status(400).json({ error: 'Token and new password required' });
    if (new_password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    try {
      const results = await supabase('GET', `affiliates?reset_token=eq.${encodeURIComponent(token)}&select=id,reset_token_expires`);
      if (!results || results.length === 0) return res.status(400).json({ error: 'Invalid or expired reset link' });
      if (new Date(results[0].reset_token_expires) < new Date()) return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });

      await supabase('PATCH', `affiliates?id=eq.${results[0].id}`, {
        portal_password: new_password,
        reset_token: null,
        reset_token_expires: null,
      });

      return res.json({ message: 'Password updated successfully' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // All other routes require auth
  const affiliate = await authenticate(req);
  if (!affiliate) return res.status(401).json({ error: 'Unauthorized' });

  // Change password (while logged in)
  if (req.method === 'POST' && action === 'change-password') {
    const { new_password } = req.body;
    if (!new_password) return res.status(400).json({ error: 'New password required' });
    if (new_password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    try {
      await supabase('PATCH', `affiliates?id=eq.${affiliate.id}`, {
        portal_password: new_password,
      });
      return res.json({ message: 'Password updated successfully' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET dashboard stats
  if (req.method === 'GET' && action === 'dashboard') {
    try {
      const [conversions, payouts, clicks] = await Promise.all([
        supabase('GET', `affiliate_conversions?affiliate_id=eq.${affiliate.id}&order=created_at.desc`),
        supabase('GET', `affiliate_payouts?affiliate_id=eq.${affiliate.id}&order=created_at.desc`),
        supabase('GET', `affiliate_clicks?affiliate_id=eq.${affiliate.id}&select=id,created_at&order=created_at.desc&limit=100`),
      ]);

      const owed = parseFloat(affiliate.total_earned || 0) - parseFloat(affiliate.total_paid || 0);

      const clicksByDay = {};
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        clicksByDay[d.toISOString().split('T')[0]] = 0;
      }
      (clicks || []).forEach(c => {
        const day = c.created_at.split('T')[0];
        if (clicksByDay[day] !== undefined) clicksByDay[day]++;
      });

      return res.json({
        affiliate: {
          name: affiliate.name,
          email: affiliate.email,
          code: affiliate.code,
          commission_type: affiliate.commission_type,
          commission_value: affiliate.commission_value,
          total_clicks: affiliate.total_clicks || 0,
          total_conversions: affiliate.total_conversions || 0,
          total_earned: parseFloat(affiliate.total_earned || 0).toFixed(2),
          total_paid: parseFloat(affiliate.total_paid || 0).toFixed(2),
          balance_owed: owed.toFixed(2),
          member_since: affiliate.created_at,
        },
        conversions: conversions || [],
        payouts: payouts || [],
        clicksByDay,
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Request payout
  if (req.method === 'POST' && action === 'request-payout') {
    const { amount, method: payMethod, details } = req.body;
    const owed = parseFloat(affiliate.total_earned || 0) - parseFloat(affiliate.total_paid || 0);
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (parseFloat(amount) > owed) return res.status(400).json({ error: `Requested amount exceeds balance of $${owed.toFixed(2)}` });

    try {
      await supabase('POST', 'affiliate_payouts', {
        affiliate_id: affiliate.id,
        amount: parseFloat(amount),
        method: payMethod || 'other',
        reference: details || null,
        status: 'pending',
      });
      return res.json({ message: 'Payout request submitted', amount });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}
