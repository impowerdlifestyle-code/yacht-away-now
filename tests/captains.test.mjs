import test from 'node:test';
import assert from 'node:assert/strict';
import { setTestEnv, stubFetch, json, makeReq, makeRes, quiet } from './helpers.mjs';

setTestEnv();
const { default: captains } = await import('../api/captains.js');

const ROWS = [
  { id: 'c-1', name: 'Alex Marlowe', email: 'alex@example.com' },
  { id: 'c-2', name: 'Jordan Pettibone', email: 'jordan@example.com' },
  { id: 'c-3', name: 'Jordan Pascoe', email: 'jp@example.com' },
  { id: 'c-4', name: 'Maria de la Cruz-Whitfield', email: 'maria@example.com' },
  { id: 'c-5', name: 'Cher', email: 'cher@example.com' },
  { id: 'c-6', name: 'Owner One Testerson', email: 'Josh@YachtAwayNow.com' },
  { id: 'c-7', name: 'Owner Two Testerson', email: 'ciaran@voreli.ai' },
];
const LAST_NAMES = ['Marlowe', 'Pettibone', 'Pascoe', 'Cruz', 'Whitfield', 'Testerson'];

async function get(routes) {
  const calls = stubFetch(routes);
  const res = makeRes();
  await quiet(() => captains(makeReq(), res));
  return { calls, res };
}

test('the public roster carries ids and first name plus initial, never a last name', async () => {
  const { calls, res } = await get([['/rest/v1/captains', () => json(ROWS)]]);
  assert.match(calls[0].url, /status=eq\.active/);
  assert.equal(res.statusCode, 200);

  const raw = JSON.stringify(res.body);
  for (const last of LAST_NAMES) assert.ok(!raw.includes(last), `${last} leaked`);
  assert.doesNotMatch(raw, /@|example\.com|phone/);

  assert.deepEqual(res.body.roster, [
    { id: 'c-1', name: 'Alex M.' },
    { id: 'c-2', name: 'Jordan Pe.' },
    { id: 'c-3', name: 'Jordan Pa.' },
    { id: 'c-4', name: 'Maria C.' },
    { id: 'c-5', name: 'Cher' },
  ]);
});

test('the business owners are left off the list', async () => {
  const { res } = await get([['/rest/v1/captains', () => json(ROWS)]]);
  assert.ok(!res.body.roster.some((c) => c.id === 'c-6' || c.id === 'c-7'));
  assert.ok(!JSON.stringify(res.body).includes('Owner'));
});

test('captains stays a list of unique strings for the current contract page picker', async () => {
  const { res } = await get([['/rest/v1/captains', () => json(ROWS)]]);
  assert.equal(res.body.ok, true);
  assert.ok(Array.isArray(res.body.captains));
  assert.ok(res.body.captains.every((name) => typeof name === 'string' && name));
  assert.equal(new Set(res.body.captains).size, res.body.captains.length);
  assert.deepEqual(res.body.captains, res.body.roster.map((c) => c.name));
});

test('a database failure returns an empty roster and no error detail', async () => {
  const { res } = await get([['/rest/v1/captains', () => json({ message: 'permission denied for table captains' }, 401)]]);
  assert.deepEqual(res.body, { ok: false, captains: [], roster: [], error: 'Roster unavailable' });
});
