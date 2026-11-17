// For a guest holding an old contract link with no token in it. They give an
// email, and if a booking matches, a fresh link goes to the address on file.
// The answer is the same either way, so this cannot be used to find out who
// has booked.
import { isEmail, lowerEmail, escapeHtml, findBookingByEmail, contractUrl, throttled } from './_shared.js';

const RESEND_WINDOW_MS = 10 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const email = lowerEmail((req.body || {}).email);
  if (!isEmail(email)) return res.status(400).json({ ok: false, error: 'A valid email is required' });

  try {
    await sendLink(email);
  } catch (err) {
    console.error('contract-link error:', err);
  }
  return res.status(200).json({ ok: true });
}

async function sendLink(email) {
  if (!process.env.SUPABASE_SERVICE_KEY || !process.env.RESEND_API_KEY || !process.env.YAN_BOOKING_SECRET) {
    console.error('contract-link: SUPABASE_SERVICE_KEY, RESEND_API_KEY or YAN_BOOKING_SECRET is not set');
    return;
  }
  const b = await findBookingByEmail(email);
  if (!b || b.status === 'cancelled' || b.status === 'completed') return;
  if (await throttled(`contract-link:${b.id}`, RESEND_WINDOW_MS)) return;

  const url = contractUrl(b.id);
  const rawFirstName = (b.first_name || '').trim() || 'there';
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Yacht Away Now <bookings@yachtawaynow.com>',
      to: lowerEmail(b.email),
      reply_to: 'josh@yachtawaynow.com',
      subject: 'Your charter contract link',
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#071520;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#071520;padding:32px;">
  <div style="text-align:center;margin-bottom:8px;">
    <img src="https://www.yachtawaynow.com/images/yacht-away-now-logo.png" alt="Yacht Away Now" style="height:44px;">
  </div>
  <h1 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;text-align:center;font-size:1.5rem;margin:24px 0 8px;font-weight:700;">Your contract link, ${escapeHtml(rawFirstName)}</h1>
  <p style="text-align:center;color:#8bbad4;font-size:0.95rem;margin:0 0 28px;line-height:1.7;">You asked for a fresh link to your charter contract. Use the button below to review and sign it.</p>
  <div style="text-align:center;margin-bottom:28px;">
    <a href="${escapeHtml(url)}" style="display:inline-block;background:linear-gradient(135deg,#b8912e,#d4a853);color:#0b1d2e;padding:15px 34px;border-radius:50px;text-decoration:none;font-weight:700;font-size:0.95rem;">Review &amp; Sign Contract</a>
  </div>
  <p style="text-align:center;color:#8bbad4;font-size:0.85rem;line-height:1.7;margin:0 0 24px;">This link is personal to your booking, so please do not forward it. If you did not ask for it, you can ignore this email.</p>
  <p style="text-align:center;color:#5a7d96;font-size:0.8rem;margin:0;">Questions? Reply to this email or call <a href="tel:7276092248" style="color:#4ecdc4;text-decoration:none;">(727) 609-2248</a>.</p>
</div>
</body></html>`,
      text: `Your contract link, ${rawFirstName}

You asked for a fresh link to your charter contract. Review and sign it here:

${url}

This link is personal to your booking, so please do not forward it. If you did not ask for it, you can ignore this email.

Questions? Reply to this email or call (727) 609-2248.`,
    }),
  });
  if (!result.ok) console.error(`contract-link: email was not sent: ${result.status} ${(await result.text()).slice(0, 300)}`);
}
