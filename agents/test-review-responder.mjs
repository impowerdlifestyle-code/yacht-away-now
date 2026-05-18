/**
 * Test the review responder's Claude reply generation
 * without touching Google APIs. Validates your ANTHROPIC_API_KEY works
 * and the tone/quality of generated replies.
 *
 * Usage: ANTHROPIC_API_KEY=sk-ant-... node agents/test-review-responder.mjs
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
- Sign off as "— Josh, Yacht Away Now" (only on longer responses)`;

const TEST_REVIEWS = [
  {
    name: '5-star positive',
    starRating: 'FIVE',
    reviewer: { displayName: 'Sarah Mitchell' },
    comment: 'Absolutely incredible experience! We booked the sunset cruise for my husband\'s 40th birthday and it exceeded every expectation. Captain Josh was amazing — so knowledgeable and fun. The views from the flybridge as the sun went down were breathtaking. We brought our own champagne and charcuterie board and it felt like a private floating restaurant. Already planning our next trip!',
  },
  {
    name: '4-star mostly positive',
    starRating: 'FOUR',
    reviewer: { displayName: 'David Chen' },
    comment: 'Great boat and great crew. We did the Egmont Key trip and the snorkeling was amazing. Only reason for 4 stars instead of 5 is that we felt a bit rushed at the island — would have loved another 30 minutes there. But overall a fantastic day on the water.',
  },
  {
    name: '2-star negative',
    starRating: 'TWO',
    reviewer: { displayName: 'Jessica Rivera' },
    comment: 'The yacht itself was beautiful but the communication leading up to our trip was frustrating. We had trouble getting answers about the boarding location and parking. Once we were on the water everything was fine but the pre-trip experience needs work.',
  },
];

async function generateReply(review) {
  const userPrompt = `Generate a reply to this Google review.

Reviewer: ${review.reviewer.displayName}
Rating: ${review.starRating}
Review: "${review.comment}"

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

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Set ANTHROPIC_API_KEY env var first.');
    console.error('Usage: ANTHROPIC_API_KEY=sk-ant-... node agents/test-review-responder.mjs');
    process.exit(1);
  }

  console.log('Testing review reply generation...\n');

  for (const review of TEST_REVIEWS) {
    console.log(`━━━ ${review.name} ━━━`);
    console.log(`From: ${review.reviewer.displayName} (${review.starRating})`);
    console.log(`Review: "${review.comment.substring(0, 100)}..."\n`);

    const reply = await generateReply(review);
    console.log(`Reply: ${reply}\n`);
  }

  console.log('Done. If the replies sound good, you\'re ready to connect Google APIs.');
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
