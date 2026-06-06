// Emails a charterer a signature-only contract link (no payment) when their
// deposit is already on file. Gated to existing, non-archived bookings so it
// can't be used to send arbitrary mail. Reachable from the dashboard later.
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbnRyYm9xZXpoa2J0Znd0enNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDY4NTksImV4cCI6MjA5MTY4Mjg1OX0.LmtivYm_0aOtZQ7p7a2_S99Eaqhy3boBe-D-5WPSI4Y';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  // Only send to a real, non-archived booking.
  const findRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?email=eq.${encodeURIComponent(email)}&archived=eq.false&order=created_at.desc&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const matches = await findRes.json();
  if (!Array.isArray(matches) || matches.length === 0) {
    return res.status(404).json({ error: 'No active booking found for that email' });
  }
  const b = matches[0];
  const firstName = (b.first_name || (b.last_name ? '' : 'there')).trim() || 'there';
  const fullName = `${b.first_name || ''} ${b.last_name || ''}`.trim();

  const params = new URLSearchParams();
  if (fullName) params.set('name', fullName);
  params.set('email', b.email);
  if (b.phone) params.set('phone', b.phone);
  if (b.charter_type) params.set('charter_type', b.charter_type);
  if (b.charter_date) params.set('date', b.charter_date);
  if (b.guests != null) params.set('guests', String(b.guests));
  if (b.duration) params.set('duration', b.duration);
  params.set('nopay', '1');
  const contractUrl = `https://www.yachtawaynow.com/contract?${params.toString()}`;

  const datePretty = b.charter_date
    ? new Date(b.charter_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;

  try {
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Captain Josh <bookings@yachtawaynow.com>',
        to: b.email,
        reply_to: 'josh@yachtawaynow.com',
        bcc: 'ciaran@voreli.ai',
        subject: `One last step — sign your charter contract ⚓`,
        html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#071520;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#071520;">
  <div style="position:relative;overflow:hidden;">
    <img src="https://www.yachtawaynow.com/images/yacht-turquoise-hero-800.jpg" alt="Yacht Away Now" style="width:100%;height:220px;object-fit:cover;display:block;">
    <div style="position:absolute;bottom:0;left:0;right:0;height:120px;background:linear-gradient(transparent,#071520);"></div>
    <div style="position:absolute;bottom:18px;left:0;right:0;text-align:center;">
      <img src="https://www.yachtawaynow.com/images/yacht-away-now-logo.png" alt="Yacht Away Now" style="height:44px;">
    </div>
  </div>
  <div style="padding:8px 32px 0;">
    <h1 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;text-align:center;font-size:1.6rem;margin:24px 0 8px;font-weight:700;">You're almost set, ${firstName}!</h1>
    <p style="text-align:center;color:#8bbad4;font-size:0.95rem;margin:0 0 28px;line-height:1.7;">Thanks for your deposit${datePretty ? ` — your charter on <strong style="color:#4ecdc4;">${datePretty}</strong> is being held` : ''}. There's just one last step: review and sign your charter paperwork (Coast Guard &amp; liability docs we keep on file for every trip).</p>

    <div style="background:#0d2538;border:1px solid #163248;border-radius:14px;padding:26px 24px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 6px;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.14em;color:#5a7d96;font-weight:600;">Deposit Received ✓</p>
      <p style="margin:0 0 20px;color:#8bbad4;font-size:0.9rem;line-height:1.6;">No further payment is needed. Just add your initials and signature — it takes about two minutes.</p>
      <a href="${contractUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8912e,#d4a853);color:#0b1d2e;padding:15px 34px;border-radius:50px;text-decoration:none;font-weight:700;font-size:0.95rem;">Review &amp; Sign Contract →</a>
      <p style="margin:16px 0 0;font-size:0.74rem;color:#5a7d96;">Secure &middot; legally binding e-signature &middot; no payment due</p>
    </div>

    <p style="color:#8bbad4;font-size:0.88rem;line-height:1.7;margin:0 0 20px;">Once it's signed, your date is fully locked and I'll follow up with dock details before we cast off. Any questions, just reply to this email or call me.</p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="tel:7276092248" style="display:inline-block;background:#0d2538;border:1px solid #163248;color:#4ecdc4;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;font-size:0.85rem;">(727) 609-2248</a>
    </div>

    <p style="color:#8bbad4;font-size:0.9rem;line-height:1.6;margin:0 0 4px;">See you on the water,</p>
    <p style="color:#f0f7fa;font-size:0.95rem;font-weight:700;margin:0 0 28px;">Captain Josh<br><span style="color:#5a7d96;font-weight:400;font-size:0.8rem;">Yacht Away Now &middot; St. Petersburg, FL</span></p>

    <div style="text-align:center;padding:20px 0 40px;border-top:1px solid #163248;">
      <p style="margin:0 0 2px;color:#5a7d96;font-size:0.7rem;">Yacht Away Now — Private Charters &middot; St. Petersburg, Florida</p>
      <p style="margin:0;color:#5a7d96;font-size:0.7rem;"><a href="https://www.yachtawaynow.com" style="color:#4ecdc4;text-decoration:none;">yachtawaynow.com</a></p>
    </div>
  </div>
</div>
</body></html>`,
        text: `You're almost set, ${firstName}!

Thanks for your deposit${datePretty ? ` — your charter on ${datePretty} is being held` : ''}. One last step: review and sign your charter paperwork (Coast Guard & liability docs we keep on file for every trip).

Your deposit is already received — no further payment is needed. Just add your initials and signature, about two minutes:

${contractUrl}

Once it's signed, your date is fully locked and I'll follow up with dock details before we cast off. Questions? Reply here or call (727) 609-2248.

See you on the water,
Captain Josh
Yacht Away Now · St. Petersburg, FL`,
      }),
    });

    const data = await result.json();
    if (!result.ok) return res.status(500).json({ error: data.message || 'Failed to send email', contractUrl });

    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${b.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status: b.status === 'new' || b.status === 'contacted' ? 'contract_sent' : b.status,
        contract_sent_at: new Date().toISOString(),
        contract_link: contractUrl,
      }),
    }).catch(() => {});

    return res.json({ sent: true, id: data.id, contractUrl });
  } catch (e) {
    return res.status(500).json({ error: e.message, contractUrl });
  }
}
