import { isAdmin, signOAuthState } from './_shared.js';

export default function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = 'https://www.yachtawaynow.com/api/google-callback';
  const scope = 'https://www.googleapis.com/auth/business.manage';

  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
    'client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent(scope) +
    '&access_type=offline' +
    '&prompt=consent' +
    '&state=' + encodeURIComponent(signOAuthState());

  res.status(200).json({ authUrl, note: 'Open authUrl in a browser within 15 minutes.' });
}
