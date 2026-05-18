export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret, subject, message, reply_to } = req.body;

  if (secret !== process.env.NOTIFY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: process.env.WEB3FORMS_KEY,
        subject: subject || 'Yacht Away Now Notification',
        from_name: 'Yacht Away Now — Contract System',
        reply_to: reply_to || 'noreply@yachtawaynow.com',
        message,
      }),
    });

    const text = await result.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: result.ok, raw: text.substring(0, 200) };
    }
    return res.status(result.ok ? 200 : 502).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
