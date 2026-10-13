// Records a signed charter contract WITHOUT charging a deposit.
// Used when the charterer has already paid (or pays separately) and only
// needs their signature on file. Reached from /contract?nopay=1.
import { SUPABASE_URL, supabaseHeaders, clip, isEmail, isIsoDate, isPaid, findBooking, postDashboard, createCalendarEvent } from './_shared.js';

const MAX_SIGNATURE_CHARS = 2000000;
const PRE_SIGNATURE_STATUSES = ['new', 'contacted', 'contract_sent'];

function cleanInitials(initials) {
  if (!initials || typeof initials !== 'object' || Array.isArray(initials)) return null;
  const out = {};
  for (const [k, v] of Object.entries(initials).slice(0, 8)) out[clip(k, 40)] = clip(v, 8);
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('sign-contract: SUPABASE_SERVICE_KEY is not set');
    return res.status(500).json({ ok: false, error: 'Signing is unavailable right now. Please call (727) 609-2248.' });
  }

  const body = req.body || {};
  const email = clip(body.email, 254);
  const name = clip(body.name, 120);
  const phone = clip(body.phone, 40);
  const charter_type = clip(body.charter_type, 80);
  const charter_date = isIsoDate(body.charter_date) ? body.charter_date : null;
  const captain = clip(body.captain, 120);
  const signer_name = clip(body.signer_name, 120);
  const guestCount = parseInt(body.guests, 10);
  const guests = Number.isFinite(guestCount) && guestCount > 0 && guestCount <= 99 ? guestCount : null;
  const claimedTotal = Number(body.total_price);
  const signature_data = typeof body.signature_data === 'string' ? body.signature_data : '';
  const initials = cleanInitials(body.initials);

  if (!isEmail(email)) return res.status(400).json({ ok: false, error: 'A valid email is required' });
  if (!signature_data) return res.status(400).json({ ok: false, error: 'Signature is required' });
  if (signature_data.length > MAX_SIGNATURE_CHARS || !signature_data.startsWith('data:image/')) {
    return res.status(400).json({ ok: false, error: 'Invalid signature' });
  }

  const signedAt = new Date().toISOString();
  let booking = null;
  let firstSignatureOnPaidBooking = false;

  try {
    booking = await findBooking({ id: body.booking_id, email });
    if (booking && (booking.email || '').toLowerCase() !== email.toLowerCase()) {
      booking = await findBooking({ email });
    }

    if (booking) {
      const paid = isPaid(booking);
      const update = { contract_signed_at: signedAt };
      if (!paid) {
        if (!booking.status || PRE_SIGNATURE_STATUSES.includes(booking.status)) update.status = 'contract_signed';
        if (captain) update.captain = captain;
        if (guests) update.guests = guests;
      }
      // A paid booking takes its signature once. The is.null filter makes the
      // first signer the only one who triggers the calendar and the captains.
      const filter = paid
        ? `id=eq.${encodeURIComponent(booking.id)}&contract_signed_at=is.null`
        : `id=eq.${encodeURIComponent(booking.id)}`;
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?${filter}`, {
        method: 'PATCH',
        headers: supabaseHeaders({ Prefer: 'return=representation' }),
        body: JSON.stringify(update),
      });
      if (!patchRes.ok) throw new Error(`Booking update failed: ${patchRes.status} ${await patchRes.text()}`);
      const patched = await patchRes.json();
      firstSignatureOnPaidBooking = paid && Array.isArray(patched) && patched.length > 0;
    }

    const bookingTotal = Number(booking?.total_price);
    const contractRow = {
      charterer_name: name,
      email,
      phone: phone || null,
      charter_type: charter_type || null,
      charter_date: charter_date || booking?.charter_date || null,
      guests,
      captain: captain || null,
      total_price: bookingTotal > 0 ? bookingTotal : (Number.isFinite(claimedTotal) && claimedTotal > 0 ? claimedTotal : null),
      deposit_amount: null,
      signer_name: signer_name || name,
      signature_data,
      signed_at: signedAt,
      stripe_session_id: null,
    };
    const postContract = (extra) => fetch(`${SUPABASE_URL}/rest/v1/signed_contracts`, {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ ...contractRow, ...extra }),
    });
    // Store initials if the column exists; fall back gracefully if not so
    // signing never breaks before the migration runs.
    let cResp = await postContract(initials ? { initials } : {});
    if (!cResp.ok && initials) cResp = await postContract({});
    if (!cResp.ok) throw new Error(`Signed contract insert failed: ${cResp.status} ${await cResp.text()}`);
  } catch (dbErr) {
    console.error('Supabase sign-contract error:', dbErr);
    return res.status(500).json({ ok: false, error: 'Failed to record signature' });
  }

  // Payment landed before the signature, so the Stripe webhook held back the
  // calendar event and the captain dispatch. Both fire here instead.
  const followUps = [
    postDashboard('/api/owner-notify', {
      event: 'contract_signed',
      booking_id: booking?.id || null,
      name,
      email,
      phone: phone || null,
      charter_type: charter_type || null,
      charter_date: charter_date || booking?.charter_date || null,
      guests,
      total_price: Number(booking?.total_price) > 0 ? Number(booking.total_price) : null,
    }),
  ];
  if (firstSignatureOnPaidBooking) {
    followUps.push(createCalendarEvent(booking));
    followUps.push(postDashboard('/api/captain-dispatch', { booking_id: booking.id }));
  }
  await Promise.all(followUps);

  return res.status(200).json({ ok: true });
}
