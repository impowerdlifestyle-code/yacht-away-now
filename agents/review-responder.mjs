/**
 * Yacht Away Now — Google Review Auto-Responder
 *
 * Fetches unresponded Google Business Profile reviews,
 * generates warm luxury-tone replies via Claude, and posts them.
 *
 * Required env vars:
 *   GOOGLE_REVIEW_REFRESH_TOKEN - OAuth2 refresh token for GBP API
 *   GOOGLE_CLIENT_ID            - OAuth2 client ID
 *   GOOGLE_CLIENT_SECRET        - OAuth2 client secret
 *   GBP_ACCOUNT_ID              - Google Business Profile account ID
 *   GBP_LOCATION_ID             - Google Business Profile location ID
 *   ANTHROPIC_API_KEY           - Claude API key
 */

const SYSTEM_PROMPT = `You are the owner of Yacht Away Now, a luxury private yacht charter in St. Petersburg, Florida. You are responding to Google reviews.

BUSINESS CONTEXT:
- 52ft Marquis Flybridge, up to 13 guests, 3 viewing decks
- Captain Josh and professional crew included
- BYOB — guests bring their own food and drinks
- Services: sunset cruises, bachelorette parties, birthday charters, anniversary cruises, corporate events, Egmont Key trips, Shell Key trips, Bahamas adventures
- Location: St. Petersburg, FL (serves Tampa Bay area)
- Owner: Josh Wilson

TONE GUIDELINES:
- Warm, genuine, and personal — like a friend who happens to run a luxury yacht
- Express sincere gratitude — never generic or corporate
- Reference specific details from their review (the sunset, the music, the crew, etc.)
- Use the reviewer's first name
- Keep it concise: 2-4 sentences for positive reviews, 3-5 for negative
- For positive reviews: thank them, acknowledge what made it special, invite them back with a warm touch
- For negative reviews: sincerely apologize, take ownership, offer to make it right, provide contact (josh@yachtawaynow.com or 727-609-2248)
- Never be defensive. Never use exclamation marks more than once.
- Never use phrases like "We appreciate your feedback" or "Thank you for taking the time" — those sound robotic
- Sign off as "— Josh, Yacht Away Now" (only on longer responses)

EXAMPLES OF GOOD RESPONSES:
- "Anna, that sunset was one for the books — glad you and your crew got to experience it from the flybridge. We'd love to have you back anytime."
- "Krystal, watching your group light up when we anchored at Shell Key was the highlight of our week. Can't wait to do it again."`;

// ── Google OAuth2 Token Refresh ──────────────────────────────────────

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.GOOGLE_REVIEW_REFRESH_TOKEN,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`OAuth2 token refresh failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ── Fetch Reviews from Google Business Profile API ───────────────────

async function fetchReviews(accessToken) {
  const accountId = process.env.GBP_ACCOUNT_ID;
  const locationId = process.env.GBP_LOCATION_ID;
  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50&orderBy=updateTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch reviews (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.reviews || [];
}

// ── Filter Unresponded Reviews ───────────────────────────────────────

function getUnrespondedReviews(reviews) {
  return reviews.filter((r) => !r.reviewReply && r.comment);
}

// ── Generate Reply via Claude ────────────────────────────────────────

async function generateReply(review) {
  const stars = review.starRating;
  const name = review.reviewer?.displayName || 'there';
  const comment = review.comment || '';
  const createTime = review.createTime || '';

  const userPrompt = `Generate a reply to this Google review.

Reviewer: ${name}
Rating: ${stars}
Date: ${createTime}
Review: "${comment}"

Write ONLY the reply text — no quotes, no prefix, no explanation.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.content[0].text.trim();
}

// ── Post Reply to Google Business Profile ────────────────────────────

async function postReply(accessToken, reviewName, replyText) {
  const url = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: replyText }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to post reply (${res.status}): ${text}`);
  }

  return res.json();
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  // Validate env vars
  const required = [
    'GOOGLE_REVIEW_REFRESH_TOKEN',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GBP_ACCOUNT_ID',
    'GBP_LOCATION_ID',
    'ANTHROPIC_API_KEY',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('[review-responder] Starting...');

  // 1. Get OAuth access token
  const accessToken = await getAccessToken();
  console.log('[review-responder] Authenticated with Google');

  // 2. Fetch reviews
  const reviews = await fetchReviews(accessToken);
  console.log(`[review-responder] Fetched ${reviews.length} reviews`);

  // 3. Filter unresponded
  const unresponded = getUnrespondedReviews(reviews);
  console.log(`[review-responder] ${unresponded.length} unresponded reviews`);

  if (unresponded.length === 0) {
    console.log('[review-responder] All reviews have replies. Done.');
    return;
  }

  // 4. Generate and post replies
  for (const review of unresponded) {
    const name = review.reviewer?.displayName || 'Anonymous';
    const stars = review.starRating;
    console.log(`[review-responder] Replying to ${name} (${stars})...`);

    try {
      const reply = await generateReply(review);
      console.log(`[review-responder] Generated: "${reply.substring(0, 80)}..."`);

      await postReply(accessToken, review.name, reply);
      console.log(`[review-responder] Posted reply to ${name}`);
    } catch (err) {
      console.error(`[review-responder] Failed for ${name}: ${err.message}`);
    }

    // Rate limit: wait 2s between replies
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('[review-responder] Done.');
}

main().catch((err) => {
  console.error(`[review-responder] Fatal: ${err.message}`);
  process.exit(1);
});
