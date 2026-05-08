const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbnRyYm9xZXpoa2J0Znd0enNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDY4NTksImV4cCI6MjA5MTY4Mjg1OX0.LmtivYm_0aOtZQ7p7a2_S99Eaqhy3boBe-D-5WPSI4Y';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { first_name, last_name, phone, email, charter_type, preferred_date, guests, duration, message, source, sms_consent } = req.body;

  if (!first_name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Save to Supabase dashboard database (primary purpose)
  let bookingId = null;
  try {
    const booking = {
      first_name,
      last_name: last_name || null,
      email,
      phone: phone || null,
      charter_type: charter_type || null,
      charter_date: preferred_date || null,
      duration: duration || null,
      guests: guests ? parseInt(guests) : null,
      special_requests: message || null,
      sms_consent: !!sms_consent && sms_consent !== 'false',
      status: 'new',
      payment_status: 'unpaid',
      source: source === 'chat' ? 'ai_concierge' : 'website',
    };

    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(booking),
    });

    if (!dbRes.ok) {
      const err = await dbRes.text();
      console.error('Supabase error:', err);
    } else {
      const inserted = await dbRes.json();
      bookingId = Array.isArray(inserted) && inserted[0] ? inserted[0].id : null;
    }
  } catch (err) {
    console.error('Supabase save error:', err);
  }

  // Create Google Calendar event in Eastern Time
  if (process.env.GOOGLE_CALENDAR_WEBHOOK) {
    try {
      await fetch(process.env.GOOGLE_CALENDAR_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name,
          last_name: last_name || '',
          phone: phone || '',
          email,
          charter_type: charter_type || 'Charter',
          preferred_date: preferred_date || new Date().toISOString().split('T')[0],
          preferred_time: req.body.preferred_time || '10:00',
          guests: guests || '',
          duration: duration || '4hr',
          message: message || '',
        }),
      });
    } catch (err) {
      console.error('Google Calendar webhook error (non-fatal):', err);
    }
  }

  // Send email notification (only for AI chatbot bookings — website form already sends via Web3Forms)
  if (source === 'chat' && process.env.WEB3FORMS_KEY) {
    try {
      const subject = `New Charter Booking — ${first_name} ${last_name || ''} (${charter_type || 'Charter'})`;
      const body = `
NEW BOOKING REQUEST — AI Chat Concierge
========================================

Name:           ${first_name} ${last_name || ''}
Phone:          ${phone || 'Not provided'}
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

      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: process.env.WEB3FORMS_KEY,
          subject,
          from_name: 'Yacht Away Now — AI Concierge',
          reply_to: email,
          ccemail: 'josh@yachtawaynow.com',
          message: body,
        }),
      });
    } catch (err) {
      console.error('Email error (non-fatal):', err);
    }
  }

  // Notify captains of new booking
  try {
    await fetch('https://yan-dashboard.vercel.app/api/captain-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookingId,
        first_name, last_name, email, phone,
        charter_type: charter_type || 'Charter',
        charter_date: preferred_date || 'TBD',
        charter_time: req.body.preferred_time || '',
        guests: guests || '',
        duration: duration || '4hr',
        total_price: null,
        special_requests: message || '',
      }),
    });
  } catch (err) {
    console.error('Captain notify error (non-fatal):', err);
  }

  return res.status(200).json({ success: true, booking_id: bookingId });
}
