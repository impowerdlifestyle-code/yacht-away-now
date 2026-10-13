import { isAdmin, signOAuthState, validOAuthState, escapeHtml } from './_shared.js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'https://www.yachtawaynow.com/api/gbp-setup';

export default async function handler(req, res) {
  const { code, state } = req.query;

  // Step 1: with the admin key, hand back the Google consent URL. Google
  // redirects here without headers, so step 2 is gated by the signed state.
  if (!code) {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(CLIENT_ID)}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/business.manage')}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(signOAuthState())}`;

    return res.status(200).json({ authUrl, note: 'Open authUrl in a browser within 15 minutes.' });
  }

  if (!validOAuthState(state)) return res.status(401).json({ error: 'Unauthorized' });

  // Step 2: Exchange code for tokens
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.refresh_token) {
      return res.status(200).send(`
        <html>
        <body style="background:#0a1628;color:#f5f0e8;font-family:monospace;padding:40px;">
          <h1 style="color:#c9a84c;">GBP OAuth Setup Complete!</h1>
          <p>Copy this refresh token and add it to Vercel env vars as <strong>GOOGLE_REFRESH_TOKEN</strong>:</p>
          <textarea style="width:100%;height:100px;background:#112b4d;color:#4ecdc4;border:1px solid #c9a84c;padding:12px;font-size:14px;" readonly>${escapeHtml(tokens.refresh_token)}</textarea>
          <p style="margin-top:20px;color:#6b7a8d;">After adding the env var, redeploy the site. The weekly GBP posts will then work automatically.</p>
        </body>
        </html>
      `);
    } else {
      return res.status(400).json({ error: 'No refresh token received', details: tokens.error || null });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
