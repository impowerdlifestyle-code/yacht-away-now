// Records a signed charter contract WITHOUT charging a deposit.
// Used when the charterer has already paid (or pays separately) and only
// needs their signature on file. Mirrors create-checkout's Supabase writes
// but skips Stripe entirely. Reached from /contract?nopay=1.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name, email, phone, charter_type, charter_date, guests, captain, total_price, signature_data, signer_name, signed_at } = req.body;

  if (!email) return res.status(400).json({ ok: false, error: 'Email is required' });
  if (!signature_data) return res.status(400).json({ ok: false, error: 'Signature is required' });

  const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbnRyYm9xZXpoa2J0Znd0enNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDY4NTksImV4cCI6MjA5MTY4Mjg1OX0.LmtivYm_0aOtZQ7p7a2_S99Eaqhy3boBe-D-5WPSI4Y';

  try {
    try {
      const findRes = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?email=eq.${encodeURIComponent(email)}&archived=eq.false&order=created_at.desc&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const matches = await findRes.json();

      if (Array.isArray(matches) && matches.length > 0) {
        const bookingId = matches[0].id;
        const update = {
          status: 'contract_signed',
          contract_signed_at: signed_at || new Date().toISOString(),
        };
        if (total_price) update.total_price = parseFloat(total_price);
        if (captain) update.captain = captain;
        if (guests) update.guests = parseInt(guests);

        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(update),
        });
      }

      await fetch(`${SUPABASE_URL}/rest/v1/signed_contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          charterer_name: name,
          email,
          phone: phone || null,
          charter_type: charter_type || null,
          charter_date: charter_date || null,
          guests: guests ? parseInt(guests) : null,
          captain: captain || null,
          total_price: total_price ? parseFloat(total_price) : null,
          deposit_amount: null,
          signer_name: signer_name || name,
          signature_data,
          signed_at: signed_at || new Date().toISOString(),
          stripe_session_id: null,
        }),
      });
    } catch (dbErr) {
      console.error('Supabase sign-contract error:', dbErr);
      return res.status(500).json({ ok: false, error: 'Failed to record signature' });
    }

    try {
      const contractMsg = `
CONTRACT SIGNED (deposit already on file — no payment collected)
========================================

Charterer:      ${name}
Email:          ${email}
Phone:          ${phone || 'Not provided'}
Charter Type:   ${charter_type || 'Not specified'}
Charter Date:   ${charter_date || 'TBD'}
Guests:         ${guests || 'Not specified'}
Captain:        ${captain || 'Not selected'}

Status: Customer signed all 4 contracts. No deposit charged (signature-only link).
View on dashboard: https://yan-dashboard.vercel.app/dashboard/contracts

========================================
Source: Signature-only contract link on yachtawaynow.com
      `.trim();

      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: process.env.WEB3FORMS_KEY,
          subject: `Contract Signed (no payment) — ${name} (${charter_type || 'Charter'})`,
          from_name: 'Yacht Away Now — Contract System',
          reply_to: email,
          ccemail: 'josh@yachtawaynow.com',
          message: contractMsg,
        }),
      });
    } catch (emailErr) {
      console.error('Email notification error (non-fatal):', emailErr);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('sign-contract error:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong recording your signature' });
  }
}
