import test from 'node:test';
import assert from 'node:assert/strict';
import { setTestEnv, stubFetch, json, makeReq, makeRes, quiet } from './helpers.mjs';

setTestEnv();
const { default: affiliates } = await import('../api/affiliates.js');
const { default: portal } = await import('../api/affiliate-portal.js');

const of = (calls, part) => calls.filter((c) => `${c.method} ${c.url}`.includes(part));
const mail = ['api.resend.com/emails', () => json({ id: 'test-mail' })];
const DB_ERROR = 'duplicate key value violates unique constraint "affiliates_email_key"';

async function call(handler, req, routes) {
  const calls = stubFetch(routes);
  const res = makeRes();
  const logged = await quiet(() => handler(makeReq(req), res));
  return { calls, res, logged };
}

test('public affiliate endpoints return a generic error and log the database detail', async () => {
  const broken = [['/rest/v1/', () => new Response(DB_ERROR, { status: 409 })]];
  const requests = [
    { method: 'GET', query: { action: 'click', code: 'ABC' }, headers: {} },
    { method: 'GET', query: { action: 'check-code', code: 'ABC' } },
    { method: 'POST', query: { action: 'signup' }, body: { name: 'Dana', email: 'dana@example.com' } },
  ];
  for (const req of requests) {
    const { res, logged } = await call(affiliates, req, broken);
    assert.equal(res.statusCode, 500, req.query.action);
    assert.deepEqual(res.body, { error: 'Something went wrong. Please try again.' });
    assert.ok(logged.join('\n').includes('affiliates_email_key'), 'the detail is logged');
  }
});

test('signup stores a lowercase email and strips markup from name and referral source', async () => {
  const { calls, res } = await call(affiliates, {
    method: 'POST', query: { action: 'signup' },
    body: { name: '<img src=x onerror="window.__xss=1">Dana O\'Brien`', email: 'Dana.OBrien@Example.COM', phone: '727-555-0100<script>', referral_source: '"><script>window.__xss=1</script>' },
  }, [
    ['GET ', () => json([])],
    ['POST https://ikntrboqezhkbtfwtzsg.supabase.co/rest/v1/affiliates', (c) => json([{ ...c.json, id: 'a-1' }], 201)],
    mail,
  ]);
  assert.equal(res.statusCode, 200);
  const stored = of(calls, 'POST https://ikntrboqezhkbtfwtzsg.supabase.co')[0].json;
  assert.equal(stored.email, 'dana.obrien@example.com');
  assert.equal(stored.name, "img src=x onerror=window.__xss=1Dana O'Brien");
  for (const field of [stored.name, stored.notes, stored.phone]) assert.doesNotMatch(field, /[<>"`]/);
  assert.equal(of(calls, 'api.resend.com')[0].json.to, 'dana.obrien@example.com');
});

test('portal login and password reset look the email up in lowercase', async () => {
  const lookups = [];
  const routes = [
    ['GET ', (c) => { lookups.push(c.url); return json([]); }],
  ];
  await call(portal, { method: 'POST', query: { action: 'login' }, body: { email: '  Dana.OBrien@Example.COM ', password: 'correct horse' } }, routes);
  await call(portal, { method: 'POST', query: { action: 'forgot-password' }, body: { email: 'Dana.OBrien@Example.COM' } }, routes);
  await call(portal, { method: 'GET', query: { action: 'dashboard' }, headers: { 'x-affiliate-email': 'Dana.OBrien@Example.COM', 'x-affiliate-code': 'correct horse' } }, routes);
  assert.equal(lookups.length, 3);
  for (const url of lookups) assert.ok(url.includes(`email=eq.${encodeURIComponent('dana.obrien@example.com')}`), url);
});

test('a failed password reset email is logged and the answer stays generic', async () => {
  const GENERIC = { message: 'If an account exists with that email, a reset link has been sent.' };
  const account = [
    ['GET ', () => json([{ id: 'a-1', name: 'Dana', email: 'dana@example.com' }])],
    ['PATCH ', () => json([{ id: 'a-1' }])],
  ];
  const req = { method: 'POST', query: { action: 'forgot-password' }, body: { email: 'dana@example.com' } };

  const rejected = await call(portal, req, [...account, ['api.resend.com/emails', () => json({ message: 'domain is not verified' }, 403)]]);
  assert.deepEqual(rejected.res.body, GENERIC);
  assert.ok(rejected.logged.some((line) => line.includes('password reset email failed') && line.includes('403') && line.includes('domain is not verified')));

  const offline = await call(portal, req, [...account, ['api.resend.com/emails', () => { throw new Error('socket hang up'); }]]);
  assert.deepEqual(offline.res.body, GENERIC);
  assert.ok(offline.logged.some((line) => line.includes('password reset email failed') && line.includes('socket hang up')));

  const delivered = await call(portal, req, [...account, mail]);
  assert.deepEqual(delivered.res.body, GENERIC);
  assert.equal(delivered.logged.length, 0);

  const unknown = await call(portal, req, [['GET ', () => json([])]]);
  assert.deepEqual(unknown.res.body, GENERIC);
});
