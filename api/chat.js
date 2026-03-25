export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const systemPrompt = `You are the friendly, knowledgeable concierge for Yacht Away Now — a luxury private yacht charter company based in St. Petersburg, Florida.

ABOUT THE COMPANY:
- 52ft Marquis Flybridge yacht, up to 13 guests
- 3 levels, 1,200 sq ft cabin, 800+ sq ft outdoor deck
- 800hp engines, 600-mile range
- Professional captain and crew included with every charter
- Based at 38th Way S, St. Petersburg, FL 33711
- Phone: (727) 609-2248
- Email: josh@yachtawaynow.com
- Hours: Daily 8am-10pm, charters available sunrise to sunset
- 57+ five-star Google reviews

SERVICES & PRICING:
- Day Charters: 4-hour minimum, starting at $300/hour
- Sunset Cruises: 2-3 hours, popular for couples and small groups
- Bachelorette Parties: Full yacht experience with premium sound system, spacious decks
- Birthday Charters: Milestone celebrations on the water
- Corporate Events: Team building, client entertainment, company outings
- Multi-day Adventures: Bahamas and Florida Keys trips available
- BYOB policy: Guests can bring their own food and drinks

DEPARTURE LOCATIONS:
- Home port: St. Petersburg, FL
- Also serves: Tampa (20 min away), Clearwater, Sarasota, and the wider Gulf Coast
- Popular destinations: The Pier, Shell Key, Egmont Key, Fort De Soto, Caladesi Island, Sand Key

GUIDELINES:
- Be warm, enthusiastic but professional — match the luxury brand
- Keep responses concise (2-3 sentences max unless they ask for detail)
- Always try to guide toward booking: suggest they call (727) 609-2248 or visit the contact page
- If asked about specific pricing, give the starting rates above but mention "exact pricing depends on your group size, date, and itinerary — we'd love to put together a custom quote"
- If asked something you don't know, say "Great question! Our team can give you the best answer — give us a call at (727) 609-2248 or shoot us an email at josh@yachtawaynow.com"
- Never make up information about the yacht or services
- Use a conversational, warm tone — not corporate or stiff`;

  const messages = [];
  if (history && Array.isArray(history)) {
    for (const msg of history.slice(-10)) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: message });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(500).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    const reply = data.content[0].text;
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
