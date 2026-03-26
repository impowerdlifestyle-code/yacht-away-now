export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { first_name, last_name, phone, email, charter_type, preferred_date, guests, duration, message } = req.body;

  if (!first_name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required' });
  }

  const subject = `New Charter Booking — ${first_name} ${last_name || ''} (${charter_type || 'Charter'})`;

  const body = `
NEW BOOKING REQUEST — AI Chat Concierge
========================================

Name:           ${first_name} ${last_name || ''}
Phone:          ${phone}
Email:          ${email}
Charter Type:   ${charter_type || 'Not specified'}
Preferred Date: ${preferred_date || 'Flexible'}
Guests:         ${guests || 'Not specified'}
Duration:       ${duration || 'Not specified'}
Special Notes:  ${message || 'None'}

========================================
Source: AI Chat Concierge on yachtawaynow.com
Reply directly to this email to reach the customer at ${email}
  `.trim();

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: process.env.WEB3FORMS_KEY,
        subject: subject,
        from_name: 'Yacht Away Now — AI Concierge',
        reply_to: email,
        message: body,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('Web3Forms error:', result);
      return res.status(500).json({ error: 'Failed to send booking email' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
