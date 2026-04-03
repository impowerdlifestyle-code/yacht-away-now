let cache = { count: null, rating: null, ts: 0 };
const CACHE_TTL = 3600000; // 1 hour

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  const now = Date.now();
  if (cache.count && now - cache.ts < CACHE_TTL) {
    return res.status(200).json({ count: cache.count, rating: cache.rating });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Search for the place first to get the Place ID
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Yacht+Away+Now+St+Petersburg+FL&inputtype=textquery&fields=place_id&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.candidates || !searchData.candidates.length) {
      return res.status(404).json({ error: 'Place not found' });
    }

    const placeId = searchData.candidates[0].place_id;

    // Get place details with review count
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=user_ratings_total,rating&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (!detailsData.result) {
      return res.status(500).json({ error: 'Could not fetch place details' });
    }

    const count = detailsData.result.user_ratings_total;
    const rating = detailsData.result.rating;

    cache = { count, rating, ts: now };

    return res.status(200).json({ count, rating });
  } catch (err) {
    console.error('Reviews API error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}
