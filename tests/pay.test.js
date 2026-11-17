// Run with every live credential unset:
//   env -i PATH="$PATH" HOME="$HOME" STRIPE_SECRET_KEY=sk_test_fake SUPABASE_SERVICE_KEY=fake \
//     RESEND_API_KEY=re_fake YAN_BOOKING_SECRET=test-booking-secret TURNSTILE_SECRET_KEY=ts_fake \
//     node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, call, token, SIGNATURE } from './harness.js';
import createCheckout from '../api/create-checkout.js';
import signContract from '../api/sign-contract.js';
import stripeWebhook from '../api/stripe-webhook.js';
import payBalance from '../api/pay-balance.js';
import contractBooking from '../api/contract-booking.js';
import contractLink from '../api/contract-link.js';
import sendContractInvite from '../api/send-contract-invite.js';
import book from '../api/book.js';
import availability from '../api/availability.js';
import { rateCardTotal, charterHours, cleanName, isSignature, linkToken } from '../api/_shared.js';

function world() {
  const w = createWorld();
  globalThis.fetch = w.fetch;
  return w;
}

const WEEKDAY = '2026-12-08';
const SATURDAY = '2026-12-05';

function checkoutBody(b, extra = {}) {
  return { booking_id: b.id, token: token('contract', b.id), signature_data: SIGNATURE, name: 'Ada Lovelace', signer_name: 'Ada Lovelace', ...extra };
}

test('rate card: weekday and weekend, both boats, 8 hours', () => {
  assert.equal(rateCardTotal({ date: WEEKDAY, boat: '52ft Marquis Flybridge', hours: 8 }), 4000);
  assert.equal(rateCardTotal({ date: SATURDAY, boat: '52ft Marquis Flybridge', hours: 8 }), 4800);
  assert.equal(rateCardTotal({ date: WEEKDAY, boat: 'Sly Fox', hours: 4 }), 2600);
  assert.equal(rateCardTotal({ date: SATURDAY, boat: 'Sly Fox', hours: 4 }), 3000);
  assert.equal(charterHours('8hr'), 8);
  assert.equal(charterHours('overnight'), null);
  assert.equal(charterHours('multi'), null);
  assert.equal(charterHours('2hr'), null);
});

test('checkout: 8hr Saturday charges half of $4,800, not the 4 hour price', async () => {
  const w = world();
  const b = w.booking({ charter_date: SATURDAY, duration: '8hr' });
  const res = await call(createCheckout, { body: checkoutBody(b, { amount: 2400 }) });
  assert.equal(res.statusCode, 200);
  assert.equal(w.sessions[0].params['line_items[0][price_data][unit_amount]'], '240000');
  assert.equal(w.sessions[0].params['payment_intent_data[metadata][total_price]'], '4800');
  assert.equal(w.sessions[0].params['payment_intent_data[metadata][booking_id]'], b.id);
  assert.equal(w.sessions[0].params.cancel_url, `https://www.yachtawaynow.com/contract?booking_id=${b.id}&t=${token('contract', b.id)}&canceled=true`);
  assert.equal(w.sessions[0].params.customer_email, 'guest@example.com');
});

test('checkout: 8hr weekday charges half of $4,000', async () => {
  const w = world();
  const b = w.booking({ charter_date: WEEKDAY, duration: '8hr' });
  const res = await call(createCheckout, { body: checkoutBody(b, { amount: 2000 }) });
  assert.equal(res.statusCode, 200);
  assert.equal(w.sessions[0].params['line_items[0][price_data][unit_amount]'], '200000');
});

test('checkout: price tampering is rejected and no session is created', async () => {
  const w = world();
  const b = w.booking({ charter_date: SATURDAY, duration: '8hr' });
  for (const tamper of [
    { amount: 1200, total_price: 2400 },
    { amount: 1200, total_price: 2400, duration: '4hr' },
    { amount: 1, total_price: 2 },
    { amount: 1200, charter_date: WEEKDAY, boat: 'none', duration: '4hr' },
  ]) {
    const res = await call(createCheckout, { body: checkoutBody(b, tamper) });
    assert.equal(res.statusCode, 400, JSON.stringify(tamper));
  }
  assert.equal(w.sessions.length, 0);
  assert.equal(b.contract_signed_at, null);
});

test('checkout: a customer may add hours but never remove them', async () => {
  const w = world();
  const b = w.booking({ charter_date: WEEKDAY, duration: '5hr' });
  const more = await call(createCheckout, { body: checkoutBody(b, { amount: 1500, duration: '6hr' }) });
  assert.equal(more.statusCode, 200);
  assert.equal(w.sessions[0].params['payment_intent_data[metadata][duration]'], '6hr');
  assert.equal(w.sessions[0].params['payment_intent_data[metadata][total_price]'], '3000');
  const fewer = await call(createCheckout, { body: checkoutBody(b, { amount: 1000, duration: '4hr' }) });
  assert.equal(fewer.statusCode, 400);
});

test('checkout: overnight, multi-day and custom are not self-checkout without an owner total', async () => {
  const w = world();
  for (const duration of ['overnight', 'multi', 'custom weekend']) {
    const b = w.booking({ duration });
    const res = await call(createCheckout, { body: checkoutBody(b, { amount: 4750, total_price: 9500, duration: '4hr' }) });
    assert.equal(res.statusCode, 409, duration);
    assert.match(res.body.error, /\(727\) 609-2248/);
  }
  assert.equal(w.sessions.length, 0);
  const quoted = w.booking({ duration: 'overnight', total_price: 9500 });
  const ok = await call(createCheckout, { body: checkoutBody(quoted, { amount: 4750 }) });
  assert.equal(ok.statusCode, 200);
  assert.equal(w.sessions[0].params['line_items[0][price_data][unit_amount]'], '475000');
});

test('checkout: an owner total is final and the browser cannot change it', async () => {
  const w = world();
  const b = w.booking({ total_price: 3200 });
  assert.equal((await call(createCheckout, { body: checkoutBody(b, { amount: 1000, total_price: 2000 }) })).statusCode, 400);
  assert.equal((await call(createCheckout, { body: checkoutBody(b, { amount: 1600 }) })).statusCode, 200);
  const full = await call(createCheckout, { body: checkoutBody(b, { amount: 3200, payment_type: 'full' }) });
  assert.equal(full.statusCode, 200);
  assert.equal(w.sessions[1].params['payment_intent_data[metadata][type]'], 'full_payment');
});

test('checkout: token required, forged token rejected, email is never a way in', async () => {
  const w = world();
  const b = w.booking({});
  const other = w.booking({ email: 'someone@example.com' });
  const base = { signature_data: SIGNATURE, amount: 1200, email: b.email, name: 'Ada' };
  for (const auth of [
    {},
    { booking_id: b.id },
    { booking_id: b.id, token: 'f'.repeat(64) },
    { booking_id: b.id, token: token('pay', b.id) },
    { booking_id: b.id, token: token('contract', other.id) },
    { booking_id: b.id, token: '' },
    { booking_id: { $ne: '' }, token: token('contract', b.id) },
  ]) {
    const res = await call(createCheckout, { body: { ...base, ...auth } });
    assert.equal(res.statusCode, 401, JSON.stringify(auth));
  }
  assert.equal(w.sessions.length, 0);
  assert.equal(b.status, 'new');
});

test('sign: token required, forged token rejected, signature validated', async () => {
  const w = world();
  const b = w.booking({ payment_status: 'deposit_paid', status: 'deposit_paid' });
  const good = { booking_id: b.id, token: token('contract', b.id), signature_data: SIGNATURE, name: 'Ada Lovelace' };
  assert.equal((await call(signContract, { body: { email: b.email, signature_data: SIGNATURE } })).statusCode, 401);
  assert.equal((await call(signContract, { body: { ...good, token: 'a'.repeat(64) } })).statusCode, 401);
  assert.equal((await call(signContract, { body: { ...good, token: undefined } })).statusCode, 401);
  for (const bad of ['', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,<script>', 'data:image/png;base64,', `data:image/png;base64,${'A'.repeat(1000001)}`]) {
    assert.equal((await call(signContract, { body: { ...good, signature_data: bad } })).statusCode, 400, bad.slice(0, 40));
  }
  assert.equal(b.contract_signed_at, null);
  assert.equal(w.signedContracts.length, 0);

  const ok = await call(signContract, { body: { ...good, name: '<b>Ada "The" O\'Brien</b>', signer_name: 'Ada<script>', captain: '"><img src=x>' } });
  assert.equal(ok.statusCode, 200);
  assert.ok(b.contract_signed_at);
  assert.equal(w.signedContracts[0].charterer_name, 'bAda The O’Brien/b');
  assert.equal(w.signedContracts[0].signer_name, 'Adascript');
  assert.equal(b.captain, undefined);
  assert.equal(w.signedContracts[0].captain, 'img src=x');
  assert.equal(w.signedContracts[0].email, 'guest@example.com');
  assert.ok(w.calendar.length === 1 && w.dashboard.some((d) => d.path === '/api/captain-dispatch'));
});

test('sanitisers', () => {
  assert.equal(cleanName(' <a href="x">Bob</a> ', 120), 'a href=xBob/a');
  assert.equal(isSignature(SIGNATURE), true);
  assert.equal(isSignature('data:image/png;base64,AAAA\n<script>'), false);
});

test('checkout: overlap with another paid booking on the same boat is refused', async () => {
  const w = world();
  w.booking({ payment_status: 'deposit_paid', status: 'deposit_paid', charter_time: '14:00', duration: '4hr' });
  const clash = w.booking({ charter_time: '12:00', duration: '4hr' });
  const res = await call(createCheckout, { body: checkoutBody(clash, { amount: 1200 }) });
  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /just been booked/);
  assert.equal(w.sessions.length, 0);

  const otherBoat = w.booking({ charter_time: '12:00', duration: '4hr', boat: 'Sly Fox' });
  assert.equal((await call(createCheckout, { body: checkoutBody(otherBoat, { amount: 1500 }) })).statusCode, 200);
  const backToBack = w.booking({ charter_time: '10:00', duration: '4hr' });
  assert.equal((await call(createCheckout, { body: checkoutBody(backToBack, { amount: 1200 }) })).statusCode, 200);
});

test('availability endpoint still reports paid ranges per boat', async () => {
  const w = world();
  w.booking({ payment_status: 'deposit_paid', charter_time: '14:00', duration: '4hr' });
  w.booking({ charter_time: '09:00' });
  const res = await call(availability, { method: 'GET', query: { date: SATURDAY } });
  assert.deepEqual(res.body.busy, [{ startMin: 840, endMin: 1080, boat: '52ft Marquis Flybridge' }]);
});

function depositMeta(b, extra = {}) {
  return { booking_id: b.id, type: 'deposit', charterer_name: 'Ada Lovelace', total_price: '2400', deposit_amount: '1200', duration: '4hr', ...extra };
}

test('webhook: records a deposit by metadata booking id and sends the first-party balance link', async () => {
  const w = world();
  w.stripeEvents = [];
  const old = w.booking({ charter_date: '2025-12-05', payment_status: 'paid_full', status: 'completed', stripe_payment_id: 'pi_old' });
  const b = w.booking({ contract_signed_at: '2026-11-17T00:00:00Z', status: 'contract_signed', email: 'Guest@Example.com' });
  const evt = w.addPayment({ amount: 1200, metadata: depositMeta(b) });
  const res = await call(stripeWebhook, { body: { id: evt } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.action, 'deposit_recorded');
  assert.equal(b.payment_status, 'deposit_paid');
  assert.equal(b.stripe_payment_id, 'pi_1');
  assert.equal(b.total_price, 2400);
  assert.equal(old.stripe_payment_id, 'pi_old');
  const welcome = w.emails.find((e) => /Welcome Aboard/.test(e.subject));
  assert.equal(welcome.to, 'guest@example.com');
  assert.ok(welcome.html.includes(`https://www.yachtawaynow.com/api/pay-balance?booking=${b.id}&amp;t=${token('pay', b.id)}`));
  assert.ok(!welcome.html.includes('checkout.stripe'));
  assert.ok(welcome.html.includes('52ft Marquis Flybridge'));
  assert.equal(w.calendar.length, 1);
  assert.deepEqual(res.body.failed, []);
});

test('webhook: welcome email names the booked boat', async () => {
  const w = world();
  const b = w.booking({ boat: 'Sly Fox' });
  await call(stripeWebhook, { body: { id: w.addPayment({ amount: 1500, metadata: depositMeta(b, { total_price: '3000' }) }) } });
  const html = w.emails.find((e) => /Welcome Aboard/.test(e.subject)).html;
  assert.ok(html.includes('Sly Fox') && html.includes('Staterooms'));
  assert.ok(!html.includes('Marquis') && !html.includes('13</span>Max Guests'));

  const w2 = world();
  const noBoat = w2.booking({ boat: null });
  await call(stripeWebhook, { body: { id: w2.addPayment({ amount: 1200, metadata: depositMeta(noBoat) }) } });
  assert.ok(!w2.emails.find((e) => /Welcome Aboard/.test(e.subject)).html.includes('Your Vessel'));
});

test('webhook: redelivery is a no-op, with and without the events table', async () => {
  for (const withTable of [true, false]) {
    const w = world();
    if (withTable) w.stripeEvents = [];
    const b = w.booking({});
    const evt = w.addPayment({ amount: 1200, metadata: depositMeta(b) });
    assert.equal((await call(stripeWebhook, { body: { id: evt } })).body.action, 'deposit_recorded');
    const emails = w.emails.length;
    const posts = w.dashboard.length;
    const again = await call(stripeWebhook, { body: { id: evt } });
    assert.equal(again.statusCode, 200);
    assert.equal(again.body.action, 'already_processed');
    assert.equal(w.emails.length, emails, `no second welcome email (table: ${withTable})`);
    assert.equal(w.dashboard.length, posts);
  }
});

test('webhook: concurrent deliveries of one event process it once', async () => {
  const w = world();
  w.stripeEvents = [];
  const b = w.booking({});
  const evt = w.addPayment({ amount: 1200, metadata: depositMeta(b) });
  const results = await Promise.all([call(stripeWebhook, { body: { id: evt } }), call(stripeWebhook, { body: { id: evt } })]);
  assert.deepEqual(results.map((r) => r.body.action).sort(), ['already_processed', 'deposit_recorded']);
  assert.equal(w.emails.filter((e) => /Welcome Aboard/.test(e.subject)).length, 1);
});

test('webhook: a paid session with no booking creates a flagged row and alerts the owners', async () => {
  const w = world();
  w.stripeEvents = [];
  w.booking({ email: 'returning@example.com', payment_status: 'paid_full', stripe_payment_id: 'pi_last_year' });
  for (const [i, metadata] of [
    { type: 'deposit', charterer_name: 'Grace Hopper', total_price: '2400', charter_date: SATURDAY },
    { type: 'deposit', charterer_name: 'Grace Hopper', booking_id: 'bk-does-not-exist' },
  ].entries()) {
    const evt = w.addPayment({ event: `evt_u${i}`, pi: `pi_u${i}`, amount: 1200, email: 'Returning@Example.com', metadata });
    const res = await call(stripeWebhook, { body: { id: evt } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.action, 'unmatched_flagged');
    const row = w.bookings.find((r) => r.id === res.body.booking_id);
    assert.equal(row.email, 'returning@example.com');
    assert.equal(row.stripe_payment_id, `pi_u${i}`);
    assert.equal(row.payment_status, 'deposit_paid');
    assert.equal(row.source, 'stripe_unmatched');
    assert.match(row.notes, /NEEDS OWNER REVIEW/);
  }
  assert.equal(w.bookings[0].stripe_payment_id, 'pi_last_year', 'the returning customer\'s old booking is untouched');
  const alerts = w.emails.filter((e) => /PAYMENT WITH NO BOOKING/.test(e.subject));
  assert.equal(alerts.length, 2);
  assert.deepEqual(alerts[0].to, ['josh@yachtawaynow.com', 'ciaran@voreli.ai']);
  assert.equal(w.emails.filter((e) => /Welcome Aboard/.test(e.subject)).length, 0);
});

test('webhook: a failed required step returns 500 and Stripe\'s retry is then processed', async () => {
  const w = world();
  w.stripeEvents = [];
  const b = w.booking({});
  const evt = w.addPayment({ amount: 1200, metadata: depositMeta(b) });
  w.fail['PATCH bookings'] = true;
  const failed = await call(stripeWebhook, { body: { id: evt } });
  assert.equal(failed.statusCode, 500);
  assert.equal(b.payment_status, 'unpaid');
  assert.equal(w.stripeEvents.length, 0, 'the claim is released so the retry is not skipped');
  assert.equal(w.emails.length, 0);
  w.fail = {};
  const retry = await call(stripeWebhook, { body: { id: evt } });
  assert.equal(retry.statusCode, 200);
  assert.equal(b.payment_status, 'deposit_paid');

  const w2 = world();
  w2.fail['POST bookings'] = true;
  const orphan = w2.addPayment({ amount: 1200, metadata: { type: 'deposit', charterer_name: 'No Row' } });
  const res = await call(stripeWebhook, { body: { id: orphan } });
  assert.equal(res.statusCode, 500);
  assert.equal(w2.emails.filter((e) => /could not be saved/.test(e.subject)).length, 1);

  const w3 = world();
  w3.fail['GET bookings'] = true;
  const evt3 = w3.addPayment({ amount: 1200, metadata: depositMeta({ id: 'bk-x' }) });
  assert.equal((await call(stripeWebhook, { body: { id: evt3 } })).statusCode, 500);
});

test('webhook: failed follow-ups are reported to the owners, payment stays recorded', async () => {
  const w = world();
  const b = w.booking({ contract_signed_at: '2026-11-17T00:00:00Z' });
  w.fail.calendar = true;
  w.fail['/api/captain-dispatch'] = true;
  w.fail['/api/owner-notify'] = true;
  const res = await call(stripeWebhook, { body: { id: w.addPayment({ amount: 1200, metadata: depositMeta(b) }) } });
  assert.equal(res.statusCode, 200);
  assert.equal(b.payment_status, 'deposit_paid');
  assert.deepEqual(res.body.failed.sort(), ['calendar', 'captain_dispatch']);
  const alert = w.emails.find((e) => /Follow-ups failed after payment/.test(e.subject));
  assert.match(alert.text, /calendar, captain_dispatch/);
  assert.ok(w.emails.some((e) => /dashboard alert failed/.test(e.subject)), 'owner-notify failure falls back to email');
});

test('webhook: a second deposit does not overwrite the first and alerts the owners', async () => {
  const w = world();
  w.stripeEvents = [];
  const b = w.booking({});
  await call(stripeWebhook, { body: { id: w.addPayment({ event: 'evt_a', pi: 'pi_first', session: 'cs_a', amount: 1200, metadata: depositMeta(b) }) } });
  const before = { emails: w.emails.length, calendar: w.calendar.length, paid_at: b.paid_at };
  const res = await call(stripeWebhook, { body: { id: w.addPayment({ event: 'evt_b', pi: 'pi_second', session: 'cs_b', amount: 1200, metadata: depositMeta(b) }) } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.action, 'duplicate_payment');
  assert.equal(b.stripe_payment_id, 'pi_first');
  assert.equal(b.paid_at, before.paid_at);
  assert.equal(w.emails.filter((e) => /Welcome Aboard/.test(e.subject)).length, 1);
  assert.equal(w.emails.length, before.emails + 1);
  assert.match(w.emails.at(-1).subject, /SECOND PAYMENT/);
  assert.match(w.emails.at(-1).text, /pi_first[\s\S]*pi_second/);
  assert.equal(w.stripeEvents.length, 2, 'both payments stay in the ledger');
});

test('webhook: a deposit the dashboard already marked paid is still recorded and welcomed', async () => {
  const w = world();
  const b = w.booking({ payment_status: 'deposit_paid', status: 'deposit_paid', stripe_payment_id: 'cs_sent_link' });
  const res = await call(stripeWebhook, { body: { id: w.addPayment({ amount: 1200, metadata: depositMeta(b) }) } });
  assert.equal(res.body.action, 'deposit_recorded');
  assert.equal(b.stripe_payment_id, 'pi_1');
  assert.equal(w.emails.filter((e) => /Welcome Aboard/.test(e.subject)).length, 1);
});

test('webhook: a conflict that slipped through alerts the owners', async () => {
  const w = world();
  w.booking({ payment_status: 'deposit_paid', status: 'deposit_paid', charter_time: '14:00' });
  const b = w.booking({ charter_time: '13:00' });
  const res = await call(stripeWebhook, { body: { id: w.addPayment({ amount: 1200, metadata: depositMeta(b) }) } });
  assert.equal(res.body.action, 'deposit_recorded');
  assert.ok(res.body.conflict_with);
  assert.ok(w.emails.some((e) => /DOUBLE BOOKING/.test(e.subject)));
});

test('webhook: hours added on the contract page reach the booking once paid', async () => {
  const w = world();
  const b = w.booking({ charter_date: WEEKDAY, duration: '5hr', boat: null });
  const meta = depositMeta(b, { total_price: '3900', deposit_amount: '1950', duration: '6hr', boat: 'Sly Fox' });
  await call(stripeWebhook, { body: { id: w.addPayment({ amount: 1950, metadata: meta }) } });
  assert.equal(b.duration, '6hr');
  assert.equal(b.boat, 'Sly Fox');
  assert.equal(b.total_price, 3900);
  assert.equal(b.deposit_amount, 1950);
});

test('webhook: balance payment by booking id marks paid in full', async () => {
  const w = world();
  const b = w.booking({ payment_status: 'deposit_paid', status: 'deposit_paid', total_price: 2400, deposit_amount: 1200, stripe_payment_id: 'pi_dep' });
  const res = await call(stripeWebhook, { body: { id: w.addPayment({ pi: 'pi_bal', amount: 1200, metadata: { type: 'balance_payment', booking_id: b.id } }) } });
  assert.equal(res.body.action, 'balance_paid');
  assert.equal(b.payment_status, 'paid_full');
});

test('pay-balance: mints a fresh session for the current balance on every click', async () => {
  const w = world();
  const b = w.booking({ payment_status: 'deposit_paid', status: 'deposit_paid', total_price: 4800, deposit_amount: 2400, email: 'Guest@Example.com' });
  const query = { booking: b.id, t: token('pay', b.id) };
  const first = await call(payBalance, { method: 'GET', query });
  assert.equal(first.statusCode, 303);
  assert.equal(first.redirectedTo, 'https://checkout.stripe.test/cs_test_1');
  assert.equal(w.sessions[0].params['line_items[0][price_data][unit_amount]'], '240000');
  assert.equal(w.sessions[0].params['payment_intent_data[metadata][type]'], 'balance_payment');
  assert.equal(w.sessions[0].params['payment_intent_data[metadata][booking_id]'], b.id);
  assert.equal(w.sessions[0].params.customer_email, 'guest@example.com');

  b.total_price = 5400;
  const second = await call(payBalance, { method: 'GET', query });
  assert.equal(second.redirectedTo, 'https://checkout.stripe.test/cs_test_2');
  assert.equal(w.sessions[1].params['line_items[0][price_data][unit_amount]'], '300000');

  b.payment_status = 'paid_full';
  const done = await call(payBalance, { method: 'GET', query });
  assert.equal(done.redirectedTo, 'https://www.yachtawaynow.com/contract?balance_paid=true');
  assert.equal(w.sessions.length, 2);
});

test('pay-balance: bad token, wrong purpose and unpaid bookings never reach Stripe', async () => {
  const w = world();
  const b = w.booking({ payment_status: 'deposit_paid', total_price: 2400, deposit_amount: 1200 });
  const unpaid = w.booking({});
  for (const query of [
    { booking: b.id },
    { booking: b.id, t: 'x' },
    { booking: b.id, t: token('contract', b.id) },
    { booking: unpaid.id, t: token('pay', unpaid.id) },
  ]) {
    const res = await call(payBalance, { method: 'GET', query });
    assert.equal(res.redirectedTo, 'https://www.yachtawaynow.com/contract?pay_error=true');
  }
  assert.equal(w.sessions.length, 0);
});

test('contract-booking: prefill needs the token', async () => {
  const w = world();
  const b = w.booking({ total_price: 3200 });
  assert.equal((await call(contractBooking, { method: 'GET', query: { booking_id: b.id } })).statusCode, 401);
  assert.equal((await call(contractBooking, { method: 'GET', query: { booking_id: b.id, t: token('pay', b.id) } })).statusCode, 401);
  const ok = await call(contractBooking, { method: 'GET', query: { booking_id: b.id, t: token('contract', b.id) } });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.booking.email, 'guest@example.com');
  assert.equal(ok.body.booking.total_price, 3200);
  assert.equal(ok.headers['cache-control'], 'no-store');
});

test('contract-link: same answer whether or not a booking exists, link goes to the address on file', async () => {
  const w = world();
  const b = w.booking({ email: 'OnFile@Example.com' });
  const hit = await call(contractLink, { body: { email: 'onfile@example.com' } });
  const miss = await call(contractLink, { body: { email: 'nobody@example.com' } });
  assert.deepEqual(hit.body, miss.body);
  assert.equal(hit.statusCode, miss.statusCode);
  assert.equal(w.emails.length, 1);
  assert.equal(w.emails[0].to, 'onfile@example.com');
  const link = `https://www.yachtawaynow.com/contract?booking_id=${b.id}&t=${token('contract', b.id)}`;
  assert.ok(w.emails[0].text.includes(link));
  assert.ok(!/[?&](name|email|phone)=/.test(w.emails[0].text));
  await call(contractLink, { body: { email: 'onfile@example.com' } });
  assert.equal(w.emails.length, 1, 'a second request inside the window sends nothing');
});

test('send-contract-invite: tokenised link, no contact details in the URL', async () => {
  const w = world();
  const b = w.booking({ payment_status: 'deposit_paid' });
  const headers = { 'x-yan-booking-secret': process.env.YAN_BOOKING_SECRET };
  const res = await call(sendContractInvite, { body: { email: 'GUEST@example.com' }, headers });
  assert.equal(res.body.contractUrl, `https://www.yachtawaynow.com/contract?booking_id=${b.id}&t=${token('contract', b.id)}&nopay=1`);
  assert.equal(b.contract_link, res.body.contractUrl);
  assert.equal((await call(sendContractInvite, { body: { booking_id: b.id }, headers })).body.sent, true);
  assert.equal((await call(sendContractInvite, { body: { email: 'guest@example.com' } })).statusCode, 401);
});

function lead(extra = {}) {
  return { first_name: 'Ada', last_name: 'Lovelace', email: 'Ada@Example.com', phone: '7274445555', charter_type: 'sunset', preferred_date: SATURDAY, preferred_time: '13:00', boat: 'Sly Fox', duration: '8hr', guests: '5-8', turnstile_token: 'tok', ...extra };
}

test('book: stores boat and duration, lowercases the email, hands back a tokenised link', async () => {
  const w = world();
  const res = await call(book, { body: lead(), headers: {} });
  assert.equal(res.statusCode, 200);
  const row = w.bookings[0];
  assert.equal(row.email, 'ada@example.com');
  assert.equal(row.boat, 'Sly Fox');
  assert.equal(row.duration, '8hr');
  const link = `https://www.yachtawaynow.com/contract?booking_id=${row.id}&t=${token('contract', row.id)}`;
  assert.equal(res.body.contract_url, link);
  assert.equal(res.headers['set-cookie'], `yan_contract=${row.id}.${token('contract', row.id)}; Path=/; Max-Age=86400; SameSite=Lax; Secure`);
  assert.equal(w.brain[0].contract_url, link);
  assert.equal(w.brain[0].email, 'ada@example.com');
});

test('book: the chat source is gone, everything is a website lead', async () => {
  const w = world();
  await call(book, { body: lead({ source: 'chat' }), headers: {} });
  assert.equal(w.bookings[0].source, 'website');
  assert.equal(w.emails.length, 0);
});

test('book: Turnstile misconfigured saves the lead, alerts by Resend once, and skips the Brain forward', async () => {
  const w = world();
  w.turnstile = { success: false, 'error-codes': ['invalid-input-secret'] };
  for (let i = 0; i < 5; i++) {
    const res = await call(book, { body: lead({ email: `victim${i}@example.com` }), headers: {} });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.forwarded, false);
  }
  assert.equal(w.bookings.length, 5);
  assert.equal(w.brain.length, 0, 'nothing is emailed to the supplied addresses');
  assert.equal(w.emails.filter((e) => /TURNSTILE MISCONFIGURED/.test(e.subject)).length, 1);
  assert.equal(w.emails.filter((e) => /not auto-emailed/.test(e.subject)).length, 1);
  assert.equal(w.emails.length, 2, 'five bot requests produce two owner emails, not ten');
  assert.ok(w.emails.every((e) => e.from === 'Yacht Away Now Alerts <alerts@yachtawaynow.com>' && e.to.includes('josh@yachtawaynow.com')));
});

test('book: a failed save alerts the owners through Resend', async () => {
  const w = world();
  w.fail['POST bookings'] = true;
  const res = await call(book, { body: lead(), headers: {} });
  assert.equal(res.statusCode, 502);
  assert.match(w.emails[0].subject, /LEAD NOT SAVED: Ada Lovelace/);
  assert.equal(res.headers['set-cookie'], 'yan_contract=; Path=/; Max-Age=0; SameSite=Lax; Secure');
});

test('token recipe is plain HMAC-SHA256 hex over "<purpose>:<booking id>" with the trimmed secret', () => {
  assert.equal(linkToken('contract', 'abc'), token('contract', 'abc'));
  assert.match(linkToken('contract', 'abc'), /^[a-f0-9]{64}$/);
  assert.notEqual(linkToken('contract', 'abc'), linkToken('pay', 'abc'));
});

test('captain: a roster id is stored as the full name, free text stays for Charterer\'s Choice', async () => {
  const w = world();
  const id = '11111111-2222-3333-4444-555555555555';
  w.captains.push({ id, name: 'Alex Morgan', status: 'active' }, { id: '99999999-2222-3333-4444-555555555555', name: 'Gone Captain', status: 'inactive' });
  const b = w.booking({});
  await call(createCheckout, { body: checkoutBody(b, { amount: 1200, captain: 'Alex M.', captain_id: id }) });
  assert.equal(b.captain, 'Alex Morgan');
  assert.equal(w.signedContracts[0].captain, 'Alex Morgan');

  const paid = w.booking({ payment_status: 'deposit_paid', charter_date: WEEKDAY });
  await call(signContract, { body: checkoutBody(paid, { captain: 'First Available' }) });
  assert.equal(w.signedContracts[1].captain, 'First Available');
  const c = w.booking({ charter_date: '2026-12-09' });
  await call(createCheckout, { body: checkoutBody(c, { amount: 1000, captain: 'Gone C.', captain_id: '99999999-2222-3333-4444-555555555555' }) });
  assert.equal(c.captain, 'Gone C.');
});
