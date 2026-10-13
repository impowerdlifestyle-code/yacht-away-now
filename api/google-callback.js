import { validOAuthState, escapeHtml } from './_shared.js';

export default async function handler(req, res) {
  const { code, state } = req.query;

  // Only a flow started from /api/google-auth with the admin key carries a valid state.
  if (!validOAuthState(state)) return res.status(401).send('Unauthorized');

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://www.yachtawaynow.com/api/google-callback',
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();
    const refreshToken = escapeHtml(data.refresh_token || '');

    if (data.error) {
      return res.status(400).json({ error: data.error, description: data.error_description });
    }

    // Display the refresh token so it can be saved as an env var
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <html>
        <body style="font-family:sans-serif;max-width:600px;margin:60px auto;padding:20px;">
          <h1>Authorization Successful!</h1>
          <p>Copy the refresh token below and save it as <code>GOOGLE_REFRESH_TOKEN</code> in Vercel:</p>
          <textarea style="width:100%;height:120px;font-size:14px;padding:12px;word-break:break-all;" readonly>${refreshToken}</textarea>
          <p style="margin-top:16px;">Run this command in your terminal:</p>
          <code style="background:#f0f0f0;padding:8px 12px;display:block;margin-top:8px;">
            echo "${refreshToken}" | vercel env add GOOGLE_REFRESH_TOKEN production
          </code>
          <p style="margin-top:24px;color:#666;">You can close this page after saving the token.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: 'Failed to exchange authorization code' });
  }
}
