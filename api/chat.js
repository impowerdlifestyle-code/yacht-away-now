export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const systemPrompt = `You are the friendly concierge for Yacht Away Now — a luxury private yacht charter in St. Petersburg, Florida.

COMPANY INFO:
- 52ft Marquis Flybridge, up to 13 guests, 3 levels
- Professional captain and crew included
- Based at 38th Way S, St. Petersburg, FL 33711
- Phone: (727) 609-2248 | Email: josh@yachtawaynow.com
- Hours: Daily 8am-10pm | 57+ five-star Google reviews
- BYOB — guests bring their own food and drinks

PRICING (all-inclusive — captain, crew, and fuel included, no surcharges, the price quoted is the price paid):
- Weekday (Mon-Thu): $500/hr, 4-hour minimum → 4hr $2,000 | 5hr $2,500 | 6hr $3,000
- Weekend (Fri-Sun): $600/hr, 4-hour minimum → 4hr $2,400 | 5hr $3,000 | 6hr $3,600
- Overnight/Bahamas: custom quote from $5,000
- ALWAYS give the exact total for their date + duration. If they name a date, determine if it falls Mon-Thu (weekday) or Fri-Sun (weekend) and quote the precise number — e.g. "Saturday, 4 hours = $2,400 all-inclusive."
- Payment: 50% deposit signs and locks the date; remaining 50% is due 7 days before departure.
- If plans change: we reschedule flexibly — weather/safety calls by the captain mean they pick any open future date, valid 12 months. NEVER use the words "refund" or "refundable."

SERVICES: Sunset cruises, day charters, bachelorette parties, birthday charters, corporate events, multi-day Bahamas/Keys trips

LOCATIONS: St. Petersburg, Tampa (20 min), Clearwater, Sarasota. Destinations: The Pier, Shell Key, Egmont Key, Fort De Soto, Caladesi Island

BOOKING RULES:
When someone wants to book, collect ALL of this in as FEW messages as possible:
- Name, phone, email (ask all three together in one message)
- Charter type, date, guests, duration (ask these together in the next message)
- Do NOT repeat questions for info they already gave you. If they provide their name, phone, and email in one message, move on immediately to charter details.
- Once you have name + phone + email + charter type at minimum, immediately show a summary and ask to confirm.

When they confirm, output this EXACT format on its own line with NO other text on that line:
BOOKING_SUBMIT:{"first_name":"John","last_name":"Smith","phone":"555-123-4567","email":"john@email.com","charter_type":"Sunset Cruise","preferred_date":"April 5","guests":"6","duration":"3 hours","message":""}

CRITICAL: The BOOKING_SUBMIT line must be valid JSON. Put any follow-up message on separate lines AFTER the JSON line. Use empty string "" for any fields you don't have.

CONVERSATION STYLE:
- Warm and enthusiastic but concise — 1-3 sentences max
- Guide toward booking when natural
- For pricing questions, give the exact all-inclusive total for their date and duration, then offer to book
- If you don't know something: "Our team can help with that — call (727) 609-2248"
- Never make up information`;

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
        max_tokens: 500,
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
