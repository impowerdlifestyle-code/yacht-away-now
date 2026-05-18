const INDEXNOW_KEY = 'b4f8c2e7a1d94f3e8b6c5a2d1e9f7b3c';
const HOST = 'www.yachtawaynow.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get URLs to submit (or submit all sitemap URLs)
  const { urls } = req.body || {};
  
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

    return res.status(200).json({ 
      success: true, 
      status: response.status,
      submitted: urlList.length 
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
