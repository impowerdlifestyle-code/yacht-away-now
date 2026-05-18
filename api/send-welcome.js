const RESEND_API_KEY = process.env.RESEND_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });


  const { name, email, charter_type, charter_date, guests, duration } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  const firstName = name.split(' ')[0];
  const dateFormatted = charter_date
    ? new Date(charter_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

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
        reply_to: 'josh@yachtawaynow.com',
        subject: `Welcome Aboard, ${firstName}! Your Charter Awaits ⚓`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#071520;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#071520;">

  <!-- Hero -->
  <div style="position:relative;overflow:hidden;">
    <img src="https://www.yachtawaynow.com/images/yacht-turquoise-hero-800.jpg" alt="Yacht Away Now" style="width:100%;height:300px;object-fit:cover;display:block;">
    <div style="position:absolute;bottom:0;left:0;right:0;height:150px;background:linear-gradient(transparent,#071520);"></div>
    <div style="position:absolute;bottom:24px;left:0;right:0;text-align:center;">
      <img src="https://www.yachtawaynow.com/images/yacht-away-now-logo.png" alt="Yacht Away Now" style="height:50px;">
    </div>
  </div>

  <div style="padding:8px 32px 0;">

    <!-- Welcome -->
    <h1 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;text-align:center;font-size:2rem;margin:24px 0 8px;font-weight:700;">Welcome Aboard, ${firstName}!</h1>
    <p style="text-align:center;color:#8bbad4;font-size:0.95rem;margin:0 0 32px;line-height:1.7;">We're thrilled to have you join us on the water. Your unforgettable yacht experience is just around the corner.</p>

    <!-- Charter Summary (if provided) -->
    ${dateFormatted ? `
    <div style="background:#0d2538;border:1px solid #163248;border-radius:14px;overflow:hidden;margin-bottom:24px;">
      <div style="background:linear-gradient(135deg,#0b1d2e,#122d45);padding:14px 24px;border-bottom:1px solid #163248;">
        <p style="margin:0;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.12em;color:#5a7d96;font-weight:600;">Your Charter</p>
      </div>
      <div style="padding:16px 24px;">
        ${charter_type ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Charter Type</span><span style="color:#f0f7fa;font-weight:500;">${charter_type}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Date</span><span style="color:#4ecdc4;font-weight:600;">${dateFormatted}</span></div>
        ${guests ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(22,50,72,0.5);font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Guests</span><span style="color:#f0f7fa;">${guests}</span></div>` : ''}
        ${duration ? `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:0.88rem;"><span style="color:#5a7d96;font-size:0.78rem;">Duration</span><span style="color:#f0f7fa;">${duration}</span></div>` : ''}
      </div>
    </div>
    ` : ''}

    <!-- What's Next -->
    <div style="background:#0d2538;border:1px solid #163248;border-radius:14px;padding:28px 24px;margin-bottom:24px;">
      <h2 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;font-size:1.15rem;margin:0 0 20px;text-align:center;">What Happens Next</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 12px 10px 0;vertical-align:top;width:40px;">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#b8912e,#d4a853);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#0b1d2e;text-align:center;line-height:32px;">1</div>
          </td>
          <td style="padding:10px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;"><strong style="color:#f0f7fa;">Contract & Deposit</strong><br>You'll receive a contract link to review and sign electronically, followed by a secure deposit payment through Stripe.</td>
        </tr>
        <tr>
          <td style="padding:10px 12px 10px 0;vertical-align:top;">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#b8912e,#d4a853);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#0b1d2e;text-align:center;line-height:32px;">2</div>
          </td>
          <td style="padding:10px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Pre-Charter Details</strong><br>48 hours before your charter, we'll send you the exact dock location, parking info, and everything you need to know.</td>
        </tr>
        <tr>
          <td style="padding:10px 12px 10px 0;vertical-align:top;">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#b8912e,#d4a853);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#0b1d2e;text-align:center;line-height:32px;">3</div>
          </td>
          <td style="padding:10px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Cast Off!</strong><br>Show up, step aboard, and let us handle the rest. Your only job is to enjoy the ride.</td>
        </tr>
      </table>
    </div>

    <!-- Tips -->
    <div style="background:#0d2538;border:1px solid #163248;border-radius:14px;padding:24px;margin-bottom:24px;">
      <h2 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;font-size:1.05rem;margin:0 0 16px;">Pro Tips for Your Charter</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 12px 8px 0;vertical-align:top;width:30px;font-size:1.2rem;">&#127866;</td>
          <td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;"><strong style="color:#f0f7fa;">BYOB</strong> — Bring your own drinks and snacks. We have a full galley with fridge, ice, and glassware.</td>
        </tr>
        <tr>
          <td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#9728;&#65039;</td>
          <td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Sun Essentials</strong> — Reef-safe sunscreen, sunglasses, towels, and hats. The Florida sun is no joke.</td>
        </tr>
        <tr>
          <td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#127908;</td>
          <td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Set the Vibe</strong> — We have a Bluetooth sound system onboard. Queue up your playlist ahead of time.</td>
        </tr>
        <tr>
          <td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#128247;</td>
          <td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Capture It</strong> — Our captain is happy to take photos. Drone footage available upon request.</td>
        </tr>
        <tr>
          <td style="padding:8px 12px 8px 0;vertical-align:top;font-size:1.2rem;">&#128094;</td>
          <td style="padding:8px 0;color:#8bbad4;font-size:0.85rem;line-height:1.6;border-top:1px solid #163248;"><strong style="color:#f0f7fa;">Wildlife</strong> — Keep an eye out for dolphins, manatees, and sea turtles. They're regulars on our routes.</td>
        </tr>
      </table>
    </div>

    <!-- Second yacht photo -->
    <div style="border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <img src="https://www.yachtawaynow.com/images/yacht-night-leds.jpg" alt="Yacht at night with LED lights" style="width:100%;height:180px;object-fit:cover;display:block;">
    </div>

    <!-- Your Yacht -->
    <div style="background:linear-gradient(135deg,#122d45,#0d2538);border:1px solid rgba(212,168,83,0.15);border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.15em;color:#5a7d96;font-weight:600;">Your Vessel</p>
      <h3 style="font-family:Georgia,'Times New Roman',serif;color:#d4a853;font-size:1.3rem;margin:0 0 12px;">52ft Marquis Flybridge</h3>
      <table style="width:100%;max-width:360px;margin:0 auto;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 8px;text-align:center;color:#8bbad4;font-size:0.82rem;"><span style="display:block;font-size:1.3rem;font-weight:700;color:#f0f7fa;">3</span>Deck Levels</td>
          <td style="padding:6px 8px;text-align:center;color:#8bbad4;font-size:0.82rem;border-left:1px solid #163248;"><span style="display:block;font-size:1.3rem;font-weight:700;color:#f0f7fa;">13</span>Max Guests</td>
          <td style="padding:6px 8px;text-align:center;color:#8bbad4;font-size:0.82rem;border-left:1px solid #163248;"><span style="display:block;font-size:1.3rem;font-weight:700;color:#f0f7fa;">600mi</span>Range</td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:0.78rem;color:#5a7d96;">Full galley &middot; Bluetooth sound &middot; Flybridge lounge &middot; Swim platform</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <p style="color:#5a7d96;font-size:0.78rem;margin:0 0 12px;">Questions? We're here for you.</p>
      <a href="tel:7276092248" style="display:inline-block;background:linear-gradient(135deg,#b8912e,#d4a853);color:#0b1d2e;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:700;font-size:0.88rem;">(727) 609-2248</a>
      <p style="margin:10px 0 0;font-size:0.78rem;color:#5a7d96;">or just reply to this email</p>
    </div>

    <!-- Social -->
    <div style="text-align:center;margin-bottom:24px;">
      <p style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.12em;color:#5a7d96;margin:0 0 10px;">Follow Along</p>
      <a href="https://www.instagram.com/yachtawaynow" style="color:#4ecdc4;text-decoration:none;font-size:0.85rem;margin:0 12px;">Instagram</a>
      <a href="https://www.facebook.com/yachtawaynow" style="color:#4ecdc4;text-decoration:none;font-size:0.85rem;margin:0 12px;">Facebook</a>
      <a href="https://www.yachtawaynow.com" style="color:#4ecdc4;text-decoration:none;font-size:0.85rem;margin:0 12px;">Website</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0 40px;border-top:1px solid #163248;">
      <img src="https://www.yachtawaynow.com/images/yacht-away-now-logo.png" alt="Yacht Away Now" style="height:36px;margin-bottom:10px;">
      <p style="margin:0 0 2px;color:#5a7d96;font-size:0.7rem;">Yacht Away Now — Private Charters</p>
      <p style="margin:0 0 2px;color:#5a7d96;font-size:0.7rem;">St. Petersburg, Florida</p>
      <p style="margin:0;color:#5a7d96;font-size:0.7rem;"><a href="https://www.yachtawaynow.com" style="color:#4ecdc4;text-decoration:none;">yachtawaynow.com</a></p>
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
