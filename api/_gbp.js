const ACCOUNT = 'accounts/114971803143699974130';
const LOCATION = 'locations/8568528334353152453';

export const GBP_LOCATION_URL = `https://mybusiness.googleapis.com/v4/${ACCOUNT}/${LOCATION}`;

export async function getAccessToken() {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
      grant_type: 'refresh_token',
    }),
  });
  const data = await tokenRes.json().catch(() => ({}));
  if (!data.access_token) throw new Error(`Google token refresh failed: ${data.error || tokenRes.status}`);
  return data.access_token;
}

export async function liveReviewCount(accessToken) {
  const res = await fetch(`${GBP_LOCATION_URL}/reviews?pageSize=1`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.totalReviewCount !== 'number') {
    throw new Error(`Google review count request failed: ${res.status}`);
  }
  return data.totalReviewCount;
}
