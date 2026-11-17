export const OWNERS = ['josh@yachtawaynow.com', 'ciaran@voreli.ai'];

const FROM = 'Yacht Away Now Alerts <alerts@yachtawaynow.com>';

export async function alertOwners({ subject, text, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.error(`owner alert not sent, RESEND_API_KEY is not set: ${subject}`);
    return false;
  }
  try {
    const mailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: OWNERS, subject, text, ...(html ? { html } : {}) }),
    });
    if (!mailRes.ok) console.error(`owner alert failed: ${mailRes.status} ${(await mailRes.text()).slice(0, 300)}`);
    return mailRes.ok;
  } catch (err) {
    console.error('owner alert failed:', err);
    return false;
  }
}
