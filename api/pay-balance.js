// The "Pay Balance Now" link in the welcome email points here. A Stripe
// Checkout Session expires 24 hours after it is created, and the balance can
// be paid any time up to 7 days before departure, so the session is minted
// when the guest clicks instead of when the email is sent.
import { SITE_URL, validLinkToken, getBooking, lowerEmail, cleanName } from './_shared.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const fail = (why) => {
    console.error(`pay-balance: ${why}`);
    return res.redirect(303, `${SITE_URL}/contract?pay_error=true`);
  };

  const id = String((req.query && req.query.booking) || '');
  if (!validLinkToken('pay', id, String((req.query && req.query.t) || ''))) return fail('bad or missing token');
  if (!process.env.SUPABASE_SERVICE_KEY || !process.env.STRIPE_SECRET_KEY) return fail('SUPABASE_SERVICE_KEY or STRIPE_SECRET_KEY is not set');

  let b;
  try {
    b = await getBooking(id);
  } catch (err) {
    return fail(`lookup failed for ${id}: ${err}`);
  }
  if (!b || b.archived) return fail(`booking ${id} not found`);
  if (b.payment_status === 'paid_full') return res.redirect(303, `${SITE_URL}/contract?balance_paid=true`);
  if (b.payment_status !== 'deposit_paid' || b.status === 'cancelled') return fail(`booking ${id} is ${b.payment_status}/${b.status}, no balance to pay`);

  const total = Number(b.total_price);
  const deposit = Number(b.deposit_amount);
  const balance = Math.round((total - deposit) * 100) / 100;
  if (!(total > 0) || !(deposit > 0) || balance < 1) return fail(`cannot work out the balance for booking ${id}`);

  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', `${SITE_URL}/contract?balance_paid=true`);
  params.append('cancel_url', `${SITE_URL}/contract?balance_canceled=true`);
  params.append('customer_email', lowerEmail(b.email));
  params.append('line_items[0][price_data][currency]', 'usd');
  params.append('line_items[0][price_data][product_data][name]', 'Charter Balance Payment');
  params.append('line_items[0][price_data][product_data][description]',
    `Remaining balance for ${b.charter_type || 'Charter'}, ${b.charter_date || 'date TBD'}`
  );
  params.append('line_items[0][price_data][unit_amount]', Math.round(balance * 100).toString());
  params.append('line_items[0][quantity]', '1');
  params.append('payment_method_types[0]', 'card');
  params.append('payment_intent_data[metadata][charterer_name]', cleanName(`${b.first_name || ''} ${b.last_name || ''}`, 120));
  params.append('payment_intent_data[metadata][type]', 'balance_payment');
  params.append('payment_intent_data[metadata][booking_id]', b.id);

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const session = await stripeRes.json();
    if (!stripeRes.ok || !session.url) return fail(`Stripe refused the session for ${id}: ${session.error?.message || stripeRes.status}`);
    return res.redirect(303, session.url);
  } catch (err) {
    return fail(`Stripe call failed for ${id}: ${err}`);
  }
}
