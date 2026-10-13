import { isAdmin } from './_shared.js';

const INDEXNOW_KEY = 'b4f8c2e7a1d94f3e8b6c5a2d1e9f7b3c';
const HOST = 'www.yachtawaynow.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { urls } = req.body || {};
  if (urls !== undefined && (!Array.isArray(urls) || urls.length === 0 || urls.length > 500 || !urls.every((u) => typeof u === 'string' && u.startsWith(`https://${HOST}/`)))) {
    return res.status(400).json({ error: `urls must be a list of https://${HOST}/ URLs` });
  }

  const urlList = urls || [
    'https://www.yachtawaynow.com/',
    'https://www.yachtawaynow.com/pricing',
    'https://www.yachtawaynow.com/contact',
    'https://www.yachtawaynow.com/about',
    'https://www.yachtawaynow.com/our-yacht',
    'https://www.yachtawaynow.com/faq',
    'https://www.yachtawaynow.com/blog',
  ];

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList: urlList,
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error(`IndexNow rejected the submission: ${response.status} ${detail}`);
      return res.status(502).json({ success: false, status: response.status, submitted: 0, detail });
    }

    return res.status(200).json({
      success: true,
      status: response.status,
      submitted: urlList.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
