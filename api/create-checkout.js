export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, name, email, phone, charter_type, charter_date, guests, captain, total_price, signature_data, signer_name, signed_at, initials } = req.body;

  if (!amount || amount < 1) {
    return res.status(400).json({ error: 'Invalid deposit amount' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const amountInCents = Math.round(amount * 100);

  try {
    // Create Stripe Checkout Session via REST API
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', 'https://www.yachtawaynow.com/contract?success=true');
    params.append('cancel_url', 'https://www.yachtawaynow.com/contract?canceled=true');
    params.append('customer_email', email);
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][product_data][name]', 'Yacht Charter Deposit (50%)');
    params.append('line_items[0][price_data][product_data][description]',
      `${charter_type || 'Charter'} — ${charter_date || 'TBD'} — ${guests || '?'} guests — Charter Total: $${total_price || 'TBD'}`
    );
    params.append('line_items[0][price_data][unit_amount]', amountInCents.toString());
    params.append('line_items[0][quantity]', '1');
    params.append('payment_method_types[0]', 'card');
    params.append('payment_intent_data[metadata][charterer_name]', name || '');
    params.append('payment_intent_data[metadata][phone]', phone || '');
    params.append('payment_intent_data[metadata][charter_type]', charter_type || '');
    params.append('payment_intent_data[metadata][charter_date]', charter_date || '');
    params.append('payment_intent_data[metadata][guests]', guests || '');
    params.append('payment_intent_data[metadata][captain]', captain || '');
    params.append('payment_intent_data[metadata][total_price]', (total_price || '').toString());
    params.append('payment_intent_data[metadata][deposit_amount]', amount.toString());

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error('Stripe error:', session);
      return res.status(500).json({ error: session.error?.message || 'Failed to create checkout session' });
    }

    // Update booking in Supabase: mark contract as signed
    const SUPABASE_URL = 'https://ikntrboqezhkbtfwtzsg.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbnRyYm9xZXpoa2J0Znd0enNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDY4NTksImV4cCI6MjA5MTY4Mjg1OX0.LmtivYm_0aOtZQ7p7a2_S99Eaqhy3boBe-D-5WPSI4Y';

    try {
      // Find the booking by email and update contract status
      const findRes = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const matches = await findRes.json();

      if (Array.isArray(matches) && matches.length > 0) {
        const bookingId = matches[0].id;
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            status: 'contract_signed',
            contract_signed_at: new Date().toISOString(),
            total_price: total_price ? parseFloat(total_price) : null,
            deposit_amount: amount,
            captain: captain || null,
            guests: guests ? parseInt(guests) : null,
          }),
        });
      }

      // Save signed contract data
      if (signature_data) {
        const contractRow = {
          charterer_name: name,
          email,
          phone: phone || null,
          charter_type: charter_type || null,
          charter_date: charter_date || null,
          guests: guests ? parseInt(guests) : null,
          captain: captain || null,
          total_price: total_price ? parseFloat(total_price) : null,
          deposit_amount: amount,
          signer_name: signer_name || name,
          signature_data,
          signed_at: signed_at || new Date().toISOString(),
          stripe_session_id: session.id,
        };
        const postContract = (extra) => fetch(`${SUPABASE_URL}/rest/v1/signed_contracts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ ...contractRow, ...extra }),
        });
        // Store initials if the column exists; fall back gracefully if not.
        let cResp = await postContract(initials ? { initials } : {});
        if (!cResp.ok && initials) cResp = await postContract({});
      }
    } catch (dbErr) {
      console.error('Supabase contract update error (non-fatal):', dbErr);
    }

    // Immediate owner alert (email + SMS to Josh & Ciaran) — contract signed
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

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Something went wrong creating the checkout session' });
  }
}
