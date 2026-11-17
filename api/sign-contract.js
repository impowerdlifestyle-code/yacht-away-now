// Records a signed charter contract WITHOUT charging a deposit.
// Used when the charterer has already paid (or pays separately) and only
// needs their signature on file. Reached from /contract?nopay=1.
import {
  SUPABASE_URL, supabaseHeaders, isPaid, lowerEmail, cleanName, isSignature, cleanInitials,
  validLinkToken, getBooking, resolveCaptain, notifyOwners, postDashboard, createCalendarEvent, alertOwners,
} from './_shared.js';

const PRE_SIGNATURE_STATUSES = ['new', 'contacted', 'contract_sent'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!process.env.SUPABASE_SERVICE_KEY || !process.env.YAN_BOOKING_SECRET) {
    console.error('sign-contract: SUPABASE_SERVICE_KEY or YAN_BOOKING_SECRET is not set');
    return res.status(500).json({ ok: false, error: 'Signing is unavailable right now. Please call (727) 609-2248.' });
  }

  const body = req.body || {};
  const bookingId = typeof body.booking_id === 'string' ? body.booking_id : '';
  if (!validLinkToken('contract', bookingId, body.token)) {
    return res.status(401).json({ ok: false, error: 'This contract link is not valid. Please open the link from your email again, or call (727) 609-2248.' });
  }
  if (!isSignature(body.signature_data)) {
    return res.status(400).json({ ok: false, error: 'A signature is required' });
  }

  let booking;
  try {
    booking = await getBooking(bookingId);
  } catch (lookupErr) {
    console.error('sign-contract lookup error:', lookupErr);
    return res.status(503).json({ ok: false, error: 'We could not look up your booking. Please try again or call (727) 609-2248.' });
  }
  if (!booking || booking.archived || booking.status === 'cancelled') {
    return res.status(409).json({ ok: false, error: 'This booking is no longer open for signing. Please call (727) 609-2248.' });
  }

  const email = lowerEmail(booking.email);
  const name = cleanName(body.name, 120) || cleanName(`${booking.first_name || ''} ${booking.last_name || ''}`, 120);
  const phone = cleanName(body.phone, 40) || booking.phone || '';
  const charter_type = cleanName(body.charter_type, 80) || booking.charter_type || '';
  const charter_date = booking.charter_date || null;
  const captain = await resolveCaptain(body);
  const signer_name = cleanName(body.signer_name, 120);
  const guestCount = parseInt(body.guests, 10);
  const guests = Number.isFinite(guestCount) && guestCount > 0 && guestCount <= 99 ? guestCount : null;
  const signature_data = body.signature_data;
  const initials = cleanInitials(body.initials);
  const bookingTotal = Number(booking.total_price) > 0 ? Number(booking.total_price) : null;

  const signedAt = new Date().toISOString();
  let firstSignatureOnPaidBooking = false;

  try {
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

    const contractRow = {
      charterer_name: name,
      email,
      phone: phone || null,
      charter_type: charter_type || null,
      charter_date,
      guests,
      captain: captain || null,
      total_price: bookingTotal,
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
  const followUps = { owner_notify: notifyOwners({
    event: 'contract_signed',
    booking_id: booking.id,
    name,
    email,
    phone: phone || null,
    charter_type: charter_type || null,
    charter_date,
    guests,
    total_price: bookingTotal,
  }) };
  if (firstSignatureOnPaidBooking) {
    followUps.calendar = createCalendarEvent(booking);
    followUps.captain_dispatch = postDashboard('/api/captain-dispatch', { booking_id: booking.id });
  }
  const results = await Promise.all(Object.values(followUps));
  const failed = Object.keys(followUps).filter((k, i) => !results[i] && k !== 'owner_notify');
  if (failed.length > 0) {
    await alertOwners(
      `Follow-ups failed after signing: ${name}`,
      `${name} (${email}) signed for booking ${booking.id} (${charter_date || 'no date'}), but these steps failed: ${failed.join(', ')}.\nDo them by hand in the dashboard.`,
    );
  }

  return res.status(200).json({ ok: true });
}
