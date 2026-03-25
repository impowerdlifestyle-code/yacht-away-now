export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { first_name, last_name, phone, email, charter_type, preferred_date, guests, duration, message } = req.body;

  if (!first_name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required' });
  }

  try {
    const response = await fetch('https://formspree.io/f/xpwdqbkr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        first_name,
        last_name: last_name || '',
        phone,
        email,
        charter_type: charter_type || 'Not specified',
        preferred_date: preferred_date || 'Flexible',
        guests: guests || 'Not specified',
        duration: duration || 'Not specified',
        message: message || '',
        _source: 'AI Chat Concierge',
      }),
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to submit booking' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
