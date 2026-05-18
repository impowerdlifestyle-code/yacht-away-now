const RESEND_API_KEY = process.env.RESEND_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.AFFILIATE_ADMIN_KEY || 'yacht-affiliate-admin-2026')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, email, charter_type, charter_date, guests, duration, total, deposit, special_requests } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  const dateFormatted = charter_date
    ? new Date(charter_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'To be confirmed';

  try {
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Yacht Away Now <bookings@yachtawaynow.com>',
        to: email,
        reply_to: 'info@yachtawaynow.com',
        subject: `Your Yacht Charter is Confirmed! ⚓ — ${dateFormatted}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#071520;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#071520;">

  <!-- Hero Image -->
  <div style="position:relative;overflow:hidden;border-radius:0 0 16px 16px;">
    <img src="https://www.yachtawaynow.com/images/yacht-turquoise-hero-800.jpg" alt="Yacht Away Now" style="width:100%;height:280px;object-fit:cover;display:block;">
    <div style="position:absolute;bottom:0;left:0;right:0;height:120px;background:linear-gradient(transparent,#071520);"></div>
  </div>

  <div style="padding:0 32px;">

    <!-- Confirmation Badge -->
    <div style="text-align:center;margin:-30px 0 24px;position:relative;z-index:1;">
      <div style="display:inline-block;background:linear-gradient(135deg,#b8912e,#d4a853,#ffe5a0,#d4a853);padding:12px 28px;border-radius:50px;font-size:0.85rem;font-weight:700;color:#0b1d2e;letter-spacing:0.05em;text-transform:uppercase;">Booking Confirmed</div>
    </div>

    <!-- Greeting -->
    <h1 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;text-align:center;font-size:1.8rem;margin:0 0 8px;font-weight:700;">Welcome Aboard, ${name}!</h1>
    <p style="text-align:center;color:#8bbad4;font-size:0.92rem;margin:0 0 32px;line-height:1.6;">Your charter is confirmed and we can't wait to host you. Everything is set — contracts signed, deposit received. Here are your booking details:</p>

    <!-- Booking Details Card -->
    <div style="background:#0d2538;border:1px solid #163248;border-radius:14px;overflow:hidden;margin-bottom:24px;">
      <div style="background:linear-gradient(135deg,#0b1d2e,#122d45);padding:16px 24px;border-bottom:1px solid #163248;">
        <p style="margin:0;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.12em;color:#5a7d96;font-weight:600;">Charter Details</p>
      </div>
      <div style="padding:20px 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;color:#5a7d96;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;width:130px;vertical-align:top;">Charter Type</td>
            <td style="padding:10px 0;color:#f0f7fa;font-size:0.92rem;font-weight:500;">${charter_type || 'Private Charter'}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#5a7d96;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">Date</td>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#4ecdc4;font-size:0.92rem;font-weight:600;">${dateFormatted}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#5a7d96;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">Guests</td>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#f0f7fa;font-size:0.92rem;">${guests || 'TBD'} guests</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#5a7d96;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">Duration</td>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#f0f7fa;font-size:0.92rem;">${duration || 'TBD'}</td>
          </tr>
          ${total ? `<tr>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#5a7d96;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">Total</td>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#d4a853;font-size:1.1rem;font-weight:700;">$${total}</td>
          </tr>` : ''}
          ${deposit ? `<tr>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#5a7d96;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">Deposit Paid</td>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#4ecdc4;font-size:0.92rem;font-weight:600;">$${deposit}</td>
          </tr>` : ''}
          ${special_requests ? `<tr>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#5a7d96;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">Notes</td>
            <td style="padding:10px 0;border-top:1px solid #163248;color:#8bbad4;font-size:0.85rem;font-style:italic;">${special_requests}</td>
          </tr>` : ''}
        </table>
      </div>
    </div>

    <!-- Yacht Image -->
    <div style="border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <img src="https://www.yachtawaynow.com/images/yacht-sandbar.jpg" alt="Your yacht awaits" style="width:100%;height:200px;object-fit:cover;display:block;">
    </div>

    <!-- What to Expect -->
    <div style="background:#0d2538;border:1px solid #163248;border-radius:14px;padding:24px;margin-bottom:24px;">
      <h2 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;font-size:1.1rem;margin:0 0 16px;">What to Expect</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 12px 8px 0;vertical-align:top;width:30px;font-size:1.2rem;">&#128205;</td>
          <td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;"><strong style="color:#f0f7fa;">Meeting Point</strong><br>We'll send exact dock location and parking details 48 hours before your charter.</td>
        </tr>
        <tr>
          <td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#127866;</td>
          <td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">BYOB Welcome</strong><br>Bring your own beverages and snacks. We have a full galley with refrigerator, ice, and glassware.</td>
        </tr>
        <tr>
          <td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#9728;&#65039;</td>
          <td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">What to Bring</strong><br>Sunscreen, sunglasses, towels, and a good attitude. We handle the rest.</td>
        </tr>
        <tr>
          <td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#128247;</td>
          <td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Capture the Moment</strong><br>Our captain is happy to take photos. Drone footage available upon request.</td>
        </tr>
      </table>
    </div>

    <!-- Contact Card -->
    <div style="background:linear-gradient(135deg,#122d45,#0d2538);border:1px solid rgba(212,168,83,0.2);border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 6px;color:#d4a853;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Questions Before Your Charter?</p>
      <p style="margin:0 0 16px;color:#8bbad4;font-size:0.82rem;">We're here to make sure everything is perfect.</p>
      <div style="margin-bottom:8px;">
        <a href="tel:7276092248" style="display:inline-block;background:linear-gradient(135deg,#b8912e,#d4a853);color:#0b1d2e;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;font-size:0.85rem;">(727) 609-2248</a>
      </div>
      <p style="margin:0;color:#5a7d96;font-size:0.78rem;">or reply to this email</p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0 40px;border-top:1px solid #163248;">
      <img src="https://www.yachtawaynow.com/images/yacht-away-now-logo.png" alt="Yacht Away Now" style="height:40px;margin-bottom:12px;">
      <p style="margin:0 0 4px;color:#5a7d96;font-size:0.72rem;">Yacht Away Now — Private Charters</p>
      <p style="margin:0 0 4px;color:#5a7d96;font-size:0.72rem;">St. Petersburg, Florida</p>
      <p style="margin:0;color:#5a7d96;font-size:0.72rem;"><a href="https://www.yachtawaynow.com" style="color:#4ecdc4;text-decoration:none;">yachtawaynow.com</a></p>
    </div>

  </div>
</div>
</body>
</html>`,
      }),
    });

    const data = await result.json();
    if (!result.ok) return res.status(500).json({ error: data.message || 'Failed to send email' });
    return res.json({ sent: true, id: data.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
