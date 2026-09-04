export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron && req.method !== 'GET') return res.status(401).json({ error: 'Unauthorized' });
  const live = isCron || req.query?.live === '1';
  console.log(`gbp-photo run trigger=${isCron ? 'cron' : 'manual'} live=${live} at=${new Date().toISOString()}`);

  const now = new Date();
  const weekNum = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  const photo = PHOTOS[weekNum % PHOTOS.length];
  const sourceUrl = `https://www.yachtawaynow.com/images/${photo.file}.jpg`;
  if (!live) return res.status(200).json({ dryRun: true, weekNum, wouldUpload: sourceUrl, description: photo.description });

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error('gbp-photo token refresh failed', tokenData);
      return res.status(500).json({ error: 'Failed to refresh access token' });
    }
    const response = await fetch(`https://mybusiness.googleapis.com/v4/${ACCOUNT}/${LOCATION}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaFormat: 'PHOTO',
        locationAssociation: { category: 'ADDITIONAL' },
        sourceUrl,
        description: photo.description,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('gbp-photo upload failed', response.status, JSON.stringify(data).slice(0, 500));
      return res.status(500).json({ error: 'Upload failed', status: response.status, detail: data });
    }
    console.log(`gbp-photo uploaded ${sourceUrl} -> ${data.name}`);
    return res.status(200).json({ success: true, weekNum, sourceUrl, media: data.name });
  } catch (err) {
    console.error('gbp-photo error', err);
    return res.status(500).json({ error: err.message });
  }
}

const ACCOUNT = 'accounts/114971803143699974130';
const LOCATION = 'locations/8568528334353152453';

const PHOTOS = [
  { file: 'yacht-sandbar', description: "The 52ft Marquis Flybridge anchored at a Tampa Bay sandbar on a private charter" },
  { file: 'yacht-rear-angle', description: "Stern view of the Marquis Flybridge on the water off St. Petersburg" },
  { file: 'charter-img_0815', description: "Guests aboard a private Yacht Away Now charter in St. Petersburg" },
  { file: 'charter-img_1180', description: "Private charter day aboard the 52ft Marquis Flybridge, Tampa Bay" },
  { file: 'yacht-docked', description: "The Marquis Flybridge docked at Maximo Marina, St. Petersburg" },
  { file: 'yacht-night', description: "The yacht lit up after dark on a St. Petersburg evening charter" },
  { file: 'yacht-night-leds', description: "Underwater LEDs on an evening charter off St. Petersburg" },
  { file: 'yacht-deck-aesthetic', description: "Bow deck of the Marquis Flybridge set for a sunset cruise" },
  { file: 'yacht-profile', description: "Profile of the 52ft Marquis Flybridge underway on Tampa Bay" },
  { file: 'yacht-side', description: "Side view of the Marquis Flybridge cruising past St. Petersburg" },
  { file: 'yacht-stern', description: "Stern and swim platform of the Marquis Flybridge" },
  { file: 'yacht-exterior', description: "Exterior of the 52ft Marquis Flybridge, Yacht Away Now flagship" },
  { file: 'nassau-yacht-02', description: "Sly Fox, the three-stateroom second yacht in the Yacht Away Now fleet" },
  { file: 'nassau-yacht-03', description: "Sly Fox underway, available for overnight charters" },
  { file: 'nassau-yacht-05', description: "Flybridge seating aboard Sly Fox" },
  { file: 'nassau-yacht-06', description: "Flybridge dinette aboard Sly Fox" },
  { file: 'nassau-yacht-08', description: "Salon aboard Sly Fox" },
  { file: 'nassau-yacht-09', description: "Galley aboard Sly Fox" },
  { file: 'captain-josh-wilson', description: "Captain Josh Wilson, owner of Yacht Away Now, USCG Master" },
  { file: 'charter-img_1178', description: "Guests enjoying a private charter on Tampa Bay" },
  { file: 'charter-img_1214', description: "Aboard the Marquis Flybridge during a St. Petersburg charter" },
  { file: 'bachelorette-party', description: "Bachelorette party aboard a Yacht Away Now private charter" },
  { file: 'charter-img_0877', description: "Private yacht charter on Tampa Bay with Yacht Away Now" },
];
