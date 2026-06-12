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

  const GOOGLE_CALENDAR_WEBHOOK = process.env.GOOGLE_CALENDAR_WEBHOOK
    || 'https://script.google.com/macros/s/AKfycbwvbcNmqi9QRDriGsv7rKZNIAOOm9u8KbLxL6sOndNzUspmqT3ecC_Dj53LovtxsWrh/exec';

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
        const booking = matches[0];
        const update = {
          status: 'contract_signed',
          contract_signed_at: signed_at || new Date().toISOString(),
        };
        if (total_price) update.total_price = parseFloat(total_price);
        if (captain) update.captain = captain;
        if (guests) update.guests = parseInt(guests);

        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(update),
        });

        // Signature-only flow signs AFTER payment, so the Stripe webhook (the
        // normal calendar trigger) never fires. Same signed+paid gate applies:
        // only paid bookings reach the calendar.
        const paid = booking.payment_status === 'deposit_paid' || booking.payment_status === 'paid_full';
        if (paid && GOOGLE_CALENDAR_WEBHOOK && (booking.charter_date || charter_date)) {
          try {
            await fetch(GOOGLE_CALENDAR_WEBHOOK, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                first_name: booking.first_name || (name || '').split(' ')[0] || '',
                last_name: booking.last_name || (name || '').split(' ').slice(1).join(' ') || '',
                phone: booking.phone || phone || '',
                email,
                charter_type: booking.charter_type || charter_type || 'Charter',
                preferred_date: booking.charter_date || charter_date,
                preferred_time: booking.charter_time || '10:00',
                guests: booking.guests || guests || '',
                duration: booking.duration || '4hr',
                message: booking.special_requests || '',
              }),
            });
          } catch (calErr) {
            console.error('Calendar create error (non-fatal):', calErr);
          }
        }
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
      await fetch('https://yan-dashboard.vercel.app/api/owner-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'contract_signed',
          name,
          email,
          phone: phone || null,
          charter_type: charter_type || null,
          charter_date: charter_date || null,
          guests: guests || null,
          total_price: total_price || null,
        }),
      });
    } catch (notifyErr) {
      console.error('Owner notify error (non-fatal):', notifyErr);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('sign-contract error:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong recording your signature' });
  }
}
