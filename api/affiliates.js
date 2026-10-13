import crypto from 'node:crypto';
import { SUPABASE_URL, supabaseHeaders, isAdminUser, escapeHtml, clip, isEmail } from './_shared.js';

const SITE_HOSTS = ['yachtawaynow.com', 'www.yachtawaynow.com'];

async function supabase(method, path, body) {
  const opts = {
    method,
    headers: supabaseHeaders({ 'Prefer': 'return=representation' }),
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function generateCode(name) {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${clean}-${rand}`;
}

export default async function handler(req, res) {
  const { method } = req;
  const action = req.query.action;

  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('affiliates: SUPABASE_SERVICE_KEY is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // Public: track a click
  if (method === 'GET' && action === 'click') {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    try {
      const affiliates = await supabase('GET', `affiliates?code=eq.${encodeURIComponent(code)}&select=id,status`);
      if (!affiliates || affiliates.length === 0) return res.status(404).json({ error: 'Invalid affiliate code' });
      if (affiliates[0].status !== 'active') return res.status(403).json({ error: 'Affiliate inactive' });

      await supabase('POST', 'affiliate_clicks', {
        affiliate_id: affiliates[0].id,
        referrer: req.headers.referer || null,
        user_agent: req.headers['user-agent'] || null,
      });

      // dest may only be a path on this site or a yachtawaynow.com URL.
      let target = new URL('https://www.yachtawaynow.com/');
      const dest = typeof req.query.dest === 'string' ? req.query.dest : '';
      if (dest) {
        try {
          const parsed = new URL(dest, 'https://www.yachtawaynow.com');
          const sameSitePath = /^\/(?![\/\\])/.test(dest);
          if (parsed.protocol === 'https:' && SITE_HOSTS.includes(parsed.hostname) && !parsed.username && (sameSitePath || /^https:\/\//i.test(dest))) {
            target = parsed;
          }
        } catch {
          // unparseable dest falls back to the homepage
        }
      }
      target.searchParams.set('ref', code);
      return res.redirect(302, target.toString());
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Public: check if a code is available
  if (method === 'GET' && action === 'check-code') {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: 'Missing code' });
    try {
      const existing = await supabase('GET', `affiliates?code=eq.${encodeURIComponent(code)}&select=id`);
      return res.json({ available: !existing || existing.length === 0 });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Public: affiliate signup
  if (method === 'POST' && action === 'signup') {
    const body = req.body || {};
    const name = clip(body.name, 120);
    const email = clip(body.email, 254);
    const phone = clip(body.phone, 40);
    const referral_source = clip(body.referral_source, 200);
    const custom_code = clip(body.custom_code, 40);
    if (!name || !isEmail(email)) return res.status(400).json({ error: 'Name and a valid email required' });

    try {
      const existing = await supabase('GET', `affiliates?email=ilike.${encodeURIComponent(email.replace(/[%_\\*]/g, '\\$&'))}&select=id`);
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'An affiliate account with this email already exists. Sign in at the affiliate portal, or use "Forgot password?" there to set a new password.' });
      }

      let code;
      if (custom_code) {
        const clean = custom_code.replace(/[^a-zA-Z0-9\-_]/g, '').toUpperCase();
        if (clean.length < 3) return res.status(400).json({ error: 'Referral code must be at least 3 characters' });
        if (clean.length > 20) return res.status(400).json({ error: 'Referral code must be 20 characters or less' });
        const taken = await supabase('GET', `affiliates?code=eq.${encodeURIComponent(clean)}&select=id`);
        if (taken && taken.length > 0) return res.status(409).json({ error: 'That referral code is already taken. Please choose a different one.' });
        code = clean;
      } else {
        code = generateCode(name);
      }

      const setupToken = crypto.randomBytes(32).toString('hex');
      const result = await supabase('POST', 'affiliates', {
        name,
        email,
        phone: phone || null,
        code,
        commission_type: 'percentage',
        commission_value: 10,
        notes: referral_source ? `Source: ${referral_source}` : null,
        status: 'active',
        total_clicks: 0,
        total_conversions: 0,
        total_earned: 0,
        total_paid: 0,
        reset_token: setupToken,
        reset_token_expires: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      });

      // Send confirmation email to the new affiliate via Resend
      const safeName = escapeHtml(name);
      const setupLink = `https://www.yachtawaynow.com/affiliate-portal?reset=${setupToken}`;
      try {
        const mailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Yacht Away Now <affiliates@yachtawaynow.com>',
            to: email,
            reply_to: 'info@yachtawaynow.com',
            subject: 'Welcome to the Yacht Away Now Affiliate Program!',
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#071520;color:#f0f7fa;padding:40px 32px;border-radius:12px;">
              <div style="text-align:center;margin-bottom:24px;font-size:2rem;">&#9875;</div>
              <h1 style="font-family:Georgia,serif;color:#d4a853;text-align:center;font-size:1.6rem;margin-bottom:8px;">Welcome Aboard, ${safeName}!</h1>
              <p style="text-align:center;color:#8bbad4;font-size:0.9rem;margin-bottom:28px;">You're officially a Yacht Away Now affiliate partner.</p>
              <div style="background:#0d2538;border:1px solid #163248;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
                <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:#5a7d96;margin:0 0 12px;">Your Portal Login</p>
                <p style="margin:0 0 8px;color:#f0f7fa;"><strong>Portal:</strong> <a href="https://www.yachtawaynow.com/affiliate-portal" style="color:#4ecdc4;">yachtawaynow.com/affiliate-portal</a></p>
                <p style="margin:0 0 14px;color:#f0f7fa;"><strong>Email:</strong> ${escapeHtml(email)}</p>
                <p style="margin:0 0 6px;"><a href="${setupLink}" style="display:inline-block;background:linear-gradient(135deg,#b8912e,#d4a853);color:#0b1d2e;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:600;font-size:0.9rem;">Set Your Password</a></p>
                <p style="margin:0;color:#5a7d96;font-size:0.78rem;">This link works for 72 hours. After that, use "Forgot password?" on the portal login page.</p>
              </div>
              <div style="background:#0d2538;border:1px solid #163248;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
                <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:#5a7d96;margin:0 0 12px;">Your Referral Link</p>
                <p style="margin:0;word-break:break-all;"><a href="https://www.yachtawaynow.com/api/affiliates?action=click&code=${code}" style="color:#4ecdc4;font-family:monospace;font-size:0.85rem;">yachtawaynow.com/api/affiliates?action=click&code=${code}</a></p>
              </div>
              <div style="text-align:center;margin-bottom:28px;">
                <span style="display:inline-block;background:rgba(212,168,83,0.15);color:#d4a853;padding:8px 20px;border-radius:50px;font-size:0.85rem;font-weight:600;">10% Commission Per Booking</span>
              </div>
              <div style="color:#8bbad4;font-size:0.85rem;line-height:1.7;margin-bottom:24px;">
                <p style="margin:0 0 6px;"><strong style="color:#f0f7fa;">How it works:</strong></p>
                <p style="margin:0 0 4px;">1. Share your referral link with friends, on social media, or on your website</p>
                <p style="margin:0 0 4px;">2. When someone books a charter through your link, you earn 10% commission</p>
                <p style="margin:0 0 4px;">3. Track your clicks, conversions, and earnings from your dashboard</p>
                <p style="margin:0;">4. Request a payout anytime — we'll send it within 3-5 business days</p>
              </div>
              <p style="color:#5a7d96;font-size:0.78rem;margin-bottom:4px;">Your referral code is ${code}. It is not a password.</p>
              <hr style="border:none;border-top:1px solid #163248;margin:24px 0;">
              <p style="color:#5a7d96;font-size:0.75rem;text-align:center;">Questions? Reply to this email or call <a href="tel:7276092248" style="color:#4ecdc4;">(727) 609-2248</a></p>
            </div>`,
          }),
        });
        if (!mailRes.ok) console.error(`Affiliate welcome email failed: ${mailRes.status}`);
      } catch (emailErr) {
        console.error('Affiliate welcome email error:', emailErr);
      }

      return res.json({
        name: result[0].name,
        code: result[0].code,
        commission: '10%',
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // All other actions require admin auth
  if (!isAdminUser(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // LIST affiliates
  if (method === 'GET' && action === 'list') {
    try {
      const affiliates = await supabase('GET', 'affiliates?order=created_at.desc');
      return res.json(affiliates || []);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET single affiliate with stats
  if (method === 'GET' && action === 'detail') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      const [affiliates, clicks, conversions, payouts] = await Promise.all([
        supabase('GET', `affiliates?id=eq.${encodeURIComponent(id)}`),
        supabase('GET', `affiliate_clicks?affiliate_id=eq.${encodeURIComponent(id)}&select=id,created_at`),
        supabase('GET', `affiliate_conversions?affiliate_id=eq.${encodeURIComponent(id)}&order=created_at.desc`),
        supabase('GET', `affiliate_payouts?affiliate_id=eq.${encodeURIComponent(id)}&order=created_at.desc`),
      ]);
      if (!affiliates || affiliates.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json({
        affiliate: affiliates[0],
        clicks: clicks || [],
        conversions: conversions || [],
        payouts: payouts || [],
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // CREATE affiliate
  if (method === 'POST' && action === 'create') {
    const { name, email, phone, commission_type, commission_value, custom_code, notes } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    const code = custom_code || generateCode(name);
    try {
      const result = await supabase('POST', 'affiliates', {
        name,
        email,
        phone: phone || null,
        code,
        commission_type: commission_type || 'percentage',
        commission_value: commission_value || 10,
        notes: notes || null,
        status: 'active',
        total_clicks: 0,
        total_conversions: 0,
        total_earned: 0,
        total_paid: 0,
      });
      return res.json(result[0]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // UPDATE affiliate
  if (method === 'PATCH' && action === 'update') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      const result = await supabase('PATCH', `affiliates?id=eq.${encodeURIComponent(id)}`, req.body);
      return res.json(result[0]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // RECORD conversion
  if (method === 'POST' && action === 'conversion') {
    const { affiliate_id, booking_id, amount, description } = req.body;
    if (!affiliate_id || !amount) return res.status(400).json({ error: 'affiliate_id and amount required' });

    try {
      const affiliates = await supabase('GET', `affiliates?id=eq.${encodeURIComponent(affiliate_id)}`);
      if (!affiliates || affiliates.length === 0) return res.status(404).json({ error: 'Affiliate not found' });

      const aff = affiliates[0];
      let commission;
      if (aff.commission_type === 'percentage') {
        commission = (amount * aff.commission_value) / 100;
      } else {
        commission = aff.commission_value;
      }

      await supabase('POST', 'affiliate_conversions', {
        affiliate_id,
        booking_id: booking_id || null,
        booking_amount: amount,
        commission_amount: commission,
        description: description || null,
        status: 'pending',
      });

      await supabase('PATCH', `affiliates?id=eq.${encodeURIComponent(affiliate_id)}`, {
        total_conversions: (aff.total_conversions || 0) + 1,
        total_earned: parseFloat((aff.total_earned || 0)) + commission,
      });

      return res.json({ commission, affiliate: aff.name });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // RECORD payout
  if (method === 'POST' && action === 'payout') {
    const { affiliate_id, amount, method: payMethod, reference } = req.body;
    if (!affiliate_id || !amount) return res.status(400).json({ error: 'affiliate_id and amount required' });

    try {
      const affiliates = await supabase('GET', `affiliates?id=eq.${encodeURIComponent(affiliate_id)}`);
      if (!affiliates || affiliates.length === 0) return res.status(404).json({ error: 'Affiliate not found' });

      const aff = affiliates[0];
      // A payout first settles the affiliate's own pending requests, oldest
      // first, so a request that has been paid stops holding back their balance.
      let unassigned = parseFloat(amount);
      const pending = await supabase('GET', `affiliate_payouts?affiliate_id=eq.${encodeURIComponent(affiliate_id)}&status=eq.pending&order=created_at.asc`);
      for (const request of pending || []) {
        const requested = parseFloat(request.amount || 0);
        if (requested <= 0 || requested > unassigned + 0.005) continue;
        await supabase('PATCH', `affiliate_payouts?id=eq.${encodeURIComponent(request.id)}`, {
          status: 'completed',
          method: payMethod || request.method || 'other',
          reference: reference || request.reference || null,
        });
        unassigned -= requested;
      }
      if (unassigned > 0.005) {
        await supabase('POST', 'affiliate_payouts', {
          affiliate_id,
          amount: Math.round(unassigned * 100) / 100,
          method: payMethod || 'other',
          reference: reference || null,
          status: 'completed',
        });
      }

      await supabase('PATCH', `affiliates?id=eq.${encodeURIComponent(affiliate_id)}`, {
        total_paid: parseFloat((aff.total_paid || 0)) + parseFloat(amount),
      });

      return res.json({ paid: amount, affiliate: aff.name });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET stats summary
  if (method === 'GET' && action === 'stats') {
    try {
      const affiliates = await supabase('GET', 'affiliates?select=*');
      const totalAffiliates = affiliates ? affiliates.length : 0;
      const activeAffiliates = affiliates ? affiliates.filter(a => a.status === 'active').length : 0;
      const totalClicks = affiliates ? affiliates.reduce((s, a) => s + (a.total_clicks || 0), 0) : 0;
      const totalConversions = affiliates ? affiliates.reduce((s, a) => s + (a.total_conversions || 0), 0) : 0;
      const totalEarned = affiliates ? affiliates.reduce((s, a) => s + parseFloat(a.total_earned || 0), 0) : 0;
      const totalPaid = affiliates ? affiliates.reduce((s, a) => s + parseFloat(a.total_paid || 0), 0) : 0;

      return res.json({
        totalAffiliates,
        activeAffiliates,
        totalClicks,
        totalConversions,
        totalEarned: totalEarned.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        outstandingBalance: (totalEarned - totalPaid).toFixed(2),
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE affiliate
  if (method === 'DELETE' && action === 'delete') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    try {
      await supabase('DELETE', `affiliate_clicks?affiliate_id=eq.${encodeURIComponent(id)}`);
      await supabase('DELETE', `affiliate_conversions?affiliate_id=eq.${encodeURIComponent(id)}`);
      await supabase('DELETE', `affiliate_payouts?affiliate_id=eq.${encodeURIComponent(id)}`);
      await supabase('DELETE', `affiliates?id=eq.${encodeURIComponent(id)}`);
      return res.json({ deleted: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}
