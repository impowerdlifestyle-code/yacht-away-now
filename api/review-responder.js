export default async function handler(req, res) {
  // Verify this is a cron request or manual trigger
  const authHeader = req.headers.authorization;
  console.log(`review-responder run trigger=${authHeader ? 'cron' : 'manual'} at=${new Date().toISOString()}`);
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && req.method !== 'GET') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Step 1: Get fresh access token using refresh token
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
      console.error('Token refresh failed:', tokenData);
      return res.status(500).json({ error: 'Failed to refresh access token' });
    }

    const accessToken = tokenData.access_token;

    // Step 2: Get account and location IDs
    const accountsRes = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const accountsData = await accountsRes.json();

    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      return res.status(404).json({ error: 'No Google Business accounts found' });
    }

    const accountName = accountsData.accounts[0].name;

    // Step 3: Get locations for this account
    const locationsRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const locationsData = await locationsRes.json();

    if (!locationsData.locations || locationsData.locations.length === 0) {
      return res.status(404).json({ error: 'No locations found for this account' });
    }

    const locationName = locationsData.locations[0].name;

    // Step 4: Fetch reviews
    const reviewsRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews?pageSize=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const reviewsData = await reviewsRes.json();

    if (!reviewsData.reviews || reviewsData.reviews.length === 0) {
      return res.status(200).json({ message: 'No reviews found' });
    }

    // Step 5: Filter reviews that haven't been replied to
    const unrepliedReviews = reviewsData.reviews.filter(
      (review) => !review.reviewReply
    );

    if (unrepliedReviews.length === 0) {
      return res.status(200).json({ message: 'All reviews have been replied to', total: reviewsData.reviews.length });
    }

    // Step 6: Generate AI responses and reply
    const results = [];

    for (const review of unrepliedReviews) {
      const reviewerName = review.reviewer?.displayName || 'Guest';
      const starRating = review.starRating || 'FIVE';
      const reviewText = review.comment || '';

      // Generate response with Claude
      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          system: `You are responding to Google reviews for Yacht Away Now, a luxury private yacht charter company in St. Petersburg, Florida. You operate a 52ft Marquis Flybridge for sunset cruises, parties, and Bahamas trips.

Write warm, personal, and genuine review responses. Guidelines:
- Address the reviewer by their first name
- Reference specific details they mentioned in their review
- Keep responses 2-4 sentences, conversational and heartfelt
- Sign off as "Captain Josh & The Yacht Away Now Crew"
- For positive reviews (4-5 stars): thank them warmly, express genuine appreciation, invite them back
- For negative reviews (1-3 stars): acknowledge their concern with empathy, apologize sincerely, offer to make it right by calling (727) 609-2248, never be defensive
- Never use generic or templated language
- Do not use emojis excessively — one at most, and only if it feels natural`,
          messages: [
            {
              role: 'user',
              content: `Review from ${reviewerName} (${starRating} stars):\n\n"${reviewText}"\n\nWrite a warm, personal response.`,
            },
          ],
        }),
      });

      const aiData = await aiResponse.json();
      const replyText = aiData.content?.[0]?.text || '';

      if (!replyText) {
        console.error('AI response empty:', JSON.stringify(aiData));
        results.push({ reviewer: reviewerName, status: 'skipped', reason: aiData.error?.message || 'AI response empty' });
        continue;
      }

      // Post the reply to Google
      const replyRes = await fetch(
        `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews/${review.reviewId}/reply`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comment: replyText }),
        }
      );

      const replyResult = await replyRes.json();

      results.push({
        reviewer: reviewerName,
        rating: starRating,
        reply: replyText,
        status: replyRes.ok ? 'replied' : 'failed',
        error: replyRes.ok ? null : replyResult,
      });
    }

    return res.status(200).json({
      message: `Processed ${unrepliedReviews.length} unreplied reviews`,
      results,
    });
  } catch (err) {
    console.error('Review responder error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
