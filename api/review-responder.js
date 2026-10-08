// Keep in sync with the review count published across the site. When the drift
// warning below fires, sweep the site and update this constant in the same commit.
const SITE_REVIEW_COUNT = 133;

// The only figures a reply may contain without the reviewer having written
// them: the boat length the prompt itself supplies.
export const REPLY_MAY_QUOTE = ['52ft', '52-foot', '52 foot', '52 ft'];

const CONTACT_OR_MONEY =
  /https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+|\b[a-z0-9-]+\.(?:com|net|org|io|co|us)\b|[$€£]|\bdollars?\b/gi;
const DIGITS = /\d+(?:[.,]\d+)*/g;
const ADMISSION = /refund|make it right|our fault|compensat|discount|\bfree\b|apolog|\bsorry\b/i;

// Why a review must be left for a person, or null when a reply may be posted.
// Call it without `reply` before generating, so a held review never costs a
// model call, and again with the generated reply before posting. The prompt
// asks for the same things, but a prompt is a request the model can ignore.
export function reviewHoldReason(review, reply, allow = REPLY_MAY_QUOTE) {
  if (review.starRating !== 'FIVE') return `rating is ${review.starRating || 'missing'}`;
  const comment = (review.comment || '').trim();
  if (!comment) return 'review has no text';
  if (reply === undefined) return null;

  const rest = allow.reduce((text, constant) => text.split(constant).join(' '), reply);
  const saidNumbers = new Set(comment.match(DIGITS) || []);
  const said = comment.toLowerCase();
  const invented = [
    ...(rest.match(DIGITS) || []).filter((n) => !saidNumbers.has(n)),
    ...(rest.match(CONTACT_OR_MONEY) || []).filter((t) => !said.includes(t.toLowerCase())),
  ];
  if (invented.length) return `reply contains ${invented.join(', ')}, which the review does not`;

  const admission = reply.match(ADMISSION);
  if (admission) return `reply uses apology or compensation language ("${admission[0].trim()}")`;
  return null;
}

export default async function handler(req, res) {
  // Vercel cron calls this with GET and "Authorization: Bearer $CRON_SECRET".
  // Fails closed: with no secret configured nothing may trigger a run, since a
  // run posts publicly on the Google listing.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  console.log(`review-responder run at=${new Date().toISOString()}`);

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

    // The site hardcodes the review count in visible copy and in every page's
    // aggregateRating. Google prunes reviews, so that number goes stale silently.
    // Shout in the logs when it drifts so the sitewide sweep can be run.
    const liveCount = reviewsData.totalReviewCount;
    if (typeof liveCount === 'number' && liveCount !== SITE_REVIEW_COUNT) {
      console.warn(
        `review-count drift: Google reports ${liveCount}, the site says ${SITE_REVIEW_COUNT}. ` +
        `Run the review-count sweep and redeploy.`
      );
    }

    if (!reviewsData.reviews || reviewsData.reviews.length === 0) {
      return res.status(200).json({ message: 'No reviews found' });
    }

    // Step 5: Filter reviews that haven't been replied to
    const unrepliedReviews = reviewsData.reviews.filter(
      (review) => !review.reviewReply
    );

    if (unrepliedReviews.length === 0) {
      return res.status(200).json({ message: 'All reviews have been replied to', total: reviewsData.reviews.length, googleReviewCount: reviewsData.totalReviewCount, siteReviewCount: SITE_REVIEW_COUNT });
    }

    // Step 6: Generate AI responses and reply
    const results = [];

    for (const review of unrepliedReviews) {
      const reviewerName = review.reviewer?.displayName;
      const starRating = review.starRating;
      const reviewText = review.comment || '';

      const held = reviewHoldReason(review);
      if (held) {
        console.warn(`review-responder HELD for a person, not replied: review ${review.reviewId}, ${held}`);
        results.push({ reviewer: reviewerName, rating: starRating, status: 'held', reason: held });
        continue;
      }

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
- Mention only details the reviewer wrote themselves; if they gave none, keep it short and add none of your own
- Keep responses 2-4 sentences, conversational and heartfelt
- Sign off as "Captain Josh & The Yacht Away Now Crew"
- Thank them warmly, express genuine appreciation, invite them back
- Never state a price, a date, a phone number, a web address or any number the reviewer did not write
- Never use generic or templated language
- Do not use emojis excessively — one at most, and only if it feels natural`,
          messages: [
            {
              role: 'user',
              content: `Review from ${reviewerName || 'a reviewer whose name Google did not provide, so do not address them by name'} (${starRating} stars):\n\n"${reviewText}"\n\nWrite a warm, personal response.`,
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

      const rejected = reviewHoldReason(review, replyText);
      if (rejected) {
        console.warn(`review-responder HELD for a person, draft not posted: review ${review.reviewId}, ${rejected}`);
        results.push({ reviewer: reviewerName, rating: starRating, status: 'held', reason: rejected, draft: replyText });
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
