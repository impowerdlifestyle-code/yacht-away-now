// Prefill for the contract page. The link carries only a booking id and its
// token, so the guest's details come from here instead of from the URL.
import { validLinkToken, getBooking, isPaid } from './_shared.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const id = String((req.query && req.query.booking_id) || '');
  if (!validLinkToken('contract', id, String((req.query && req.query.t) || ''))) {
    return res.status(401).json({ ok: false, error: 'This contract link is not valid.' });
  }

  let b;
  try {
    b = await getBooking(id);
  } catch (err) {
    console.error('contract-booking lookup error:', err);
    return res.status(503).json({ ok: false, error: 'We could not load your booking. Please try again or call (727) 609-2248.' });
  }
  if (!b || b.archived || b.status === 'cancelled') {
    return res.status(404).json({ ok: false, error: 'This booking is no longer open. Please call (727) 609-2248.' });
  }

  return res.status(200).json({
    ok: true,
    booking: {
      id: b.id,
      name: `${b.first_name || ''} ${b.last_name || ''}`.trim(),
      email: b.email || '',
      phone: b.phone || '',
      address: b.address || '',
      charter_type: b.charter_type || '',
      charter_date: b.charter_date || '',
      charter_time: b.charter_time || '',
      boat: b.boat || '',
      duration: b.duration || '',
      guests: b.guests || '',
      total_price: Number(b.total_price) > 0 ? Number(b.total_price) : null,
      paid: isPaid(b),
      paid_in_full: b.payment_status === 'paid_full',
      signed: !!b.contract_signed_at,
    },
  });
}
