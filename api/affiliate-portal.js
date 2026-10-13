import crypto from 'node:crypto';
import { SUPABASE_URL, supabaseHeaders, safeEqual, escapeHtml } from './_shared.js';

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const INVALID_LOGIN = 'Invalid email or password. If you have not set a password yet, use "Forgot password?" to create one.';

async function supabase(method, path, body) {
  const opts = {
    method,
    headers: supabaseHeaders({ 'Prefer': 'return=representation' }),
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Stored as scrypt$N$r$p$salt$hash (salt and hash base64) in portal_password.
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

// Returns 'ok', 'legacy' (a plaintext value from before hashing matched and
// should be rehashed) or null. The referral code is never a password.
function checkPassword(affiliate, password) {
  const stored = affiliate.portal_password;
  if (!stored || typeof password !== 'string' || !password || password.length > MAX_PASSWORD_LENGTH) return null;
  if (!stored.startsWith('scrypt$')) return safeEqual(password, stored) ? 'legacy' : null;
  const [, N, r, p, salt, hash] = stored.split('$');
  const expected = Buffer.from(hash || '', 'base64');
  if (expected.length === 0) return null;
  const actual = crypto.scryptSync(password, Buffer.from(salt || '', 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
  return crypto.timingSafeEqual(actual, expected) ? 'ok' : null;
}

async function verifyAndUpgrade(affiliate, password) {
  const result = checkPassword(affiliate, password);
  if (result === 'legacy') {
    await supabase('PATCH', `affiliates?id=eq.${encodeURIComponent(affiliate.id)}`, { portal_password: hashPassword(password) });
  }
  return !!result;
}

function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`;
  return null;
}

async function authenticate(req) {
  const email = req.headers['x-affiliate-email'];
  const password = req.headers['x-affiliate-code'];
  if (!email || !password) return null;

  const results = await supabase('GET',
    `affiliates?email=eq.${encodeURIComponent(email)}&select=*`
  );
  if (!results || results.length === 0) return null;
  if (!(await verifyAndUpgrade(results[0], password))) return null;
  if (results[0].status !== 'active') return null;
  return results[0];
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export default async function handler(req, res) {
  const action = req.query.action;

  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('affiliate-portal: SUPABASE_SERVICE_KEY is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // Login
  if (req.method === 'POST' && action === 'login') {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string') return res.status(400).json({ error: 'Email and password required' });

    try {
      const results = await supabase('GET',
        `affiliates?email=eq.${encodeURIComponent(email)}&select=id,name,email,code,portal_password,commission_type,commission_value,status,total_clicks,total_conversions,total_earned,total_paid,created_at`
      );
      if (!results || results.length === 0) return res.status(401).json({ error: INVALID_LOGIN });
      if (!(await verifyAndUpgrade(results[0], password))) return res.status(401).json({ error: INVALID_LOGIN });
      if (results[0].status !== 'active') return res.status(403).json({ error: 'Account inactive' });
      return res.json({ id: results[0].id, name: results[0].name, has_custom_password: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Forgot password — send reset email
  if (req.method === 'POST' && action === 'forgot-password') {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email required' });

    try {
      const results = await supabase('GET', `affiliates?email=eq.${encodeURIComponent(email)}&select=id,name,email`);
      // Always return success to prevent email enumeration
      if (!results || results.length === 0) {
        return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
      }

      const token = generateToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      await supabase('PATCH', `affiliates?id=eq.${encodeURIComponent(results[0].id)}`, {
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
          to: results[0].email,
          reply_to: 'info@yachtawaynow.com',
          subject: 'Reset Your Affiliate Portal Password: Yacht Away Now',
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#071520;color:#f0f7fa;padding:40px 32px;border-radius:12px;">
            <div style="text-align:center;margin-bottom:24px;font-size:2rem;">&#9875;</div>
            <h1 style="font-family:Georgia,serif;color:#d4a853;text-align:center;font-size:1.4rem;margin-bottom:20px;">Password Reset Request</h1>
            <p style="color:#8bbad4;font-size:0.9rem;line-height:1.7;margin-bottom:24px;">Hi ${escapeHtml(results[0].name)},<br><br>We received a request to reset your affiliate portal password. Click the button below to set a new one:</p>
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
    const { token } = req.body || {};
    if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token required' });

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
    const { token, new_password } = req.body || {};
    if (!token || typeof token !== 'string' || !new_password) return res.status(400).json({ error: 'Token and new password required' });
    const problem = passwordProblem(new_password);
    if (problem) return res.status(400).json({ error: problem });

    try {
      const results = await supabase('GET', `affiliates?reset_token=eq.${encodeURIComponent(token)}&select=id,reset_token_expires`);
      if (!results || results.length === 0) return res.status(400).json({ error: 'Invalid or expired reset link' });
      if (new Date(results[0].reset_token_expires) < new Date()) return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });

      await supabase('PATCH', `affiliates?id=eq.${encodeURIComponent(results[0].id)}`, {
        portal_password: hashPassword(new_password),
        reset_token: null,
        reset_token_expires: null,
      });

      return res.json({ message: 'Password updated successfully' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // All other routes require auth
  let affiliate;
  try {
    affiliate = await authenticate(req);
  } catch (e) {
    console.error('affiliate-portal auth error:', e);
    return res.status(500).json({ error: 'Something went wrong' });
  }
  if (!affiliate) return res.status(401).json({ error: 'Unauthorized' });

  // Change password (while logged in)
  if (req.method === 'POST' && action === 'change-password') {
    const { new_password } = req.body || {};
    const problem = passwordProblem(new_password);
    if (problem) return res.status(400).json({ error: problem });

    try {
      await supabase('PATCH', `affiliates?id=eq.${encodeURIComponent(affiliate.id)}`, {
        portal_password: hashPassword(new_password),
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
        supabase('GET', `affiliate_conversions?affiliate_id=eq.${encodeURIComponent(affiliate.id)}&order=created_at.desc`),
        supabase('GET', `affiliate_payouts?affiliate_id=eq.${encodeURIComponent(affiliate.id)}&order=created_at.desc`),
        supabase('GET', `affiliate_clicks?affiliate_id=eq.${encodeURIComponent(affiliate.id)}&select=id,created_at&order=created_at.desc&limit=100`),
      ]);

      const owed = parseFloat(affiliate.total_earned || 0) - parseFloat(affiliate.total_paid || 0);
      const pendingTotal = (payouts || []).filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

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
          available_balance: Math.max(owed - pendingTotal, 0).toFixed(2),
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
    const { amount, method: payMethod, details } = req.body || {};
    const requested = Math.round(parseFloat(amount) * 100) / 100;
    if (!Number.isFinite(requested) || requested <= 0) return res.status(400).json({ error: 'Invalid amount' });

    try {
      const pending = await supabase('GET', `affiliate_payouts?affiliate_id=eq.${encodeURIComponent(affiliate.id)}&status=eq.pending&select=amount`);
      const pendingTotal = (pending || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const available = parseFloat(affiliate.total_earned || 0) - parseFloat(affiliate.total_paid || 0) - pendingTotal;
      if (requested > available + 0.005) {
        return res.status(400).json({ error: `Requested amount exceeds your available balance of $${Math.max(available, 0).toFixed(2)}${pendingTotal > 0 ? ` ($${pendingTotal.toFixed(2)} is already in pending requests)` : ''}` });
      }
      await supabase('POST', 'affiliate_payouts', {
        affiliate_id: affiliate.id,
        amount: requested,
        method: String(payMethod || 'other').slice(0, 40),
        reference: details ? String(details).slice(0, 500) : null,
        status: 'pending',
      });
      return res.json({ message: 'Payout request submitted', amount });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}
