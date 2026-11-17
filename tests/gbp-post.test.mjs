import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setTestEnv, stubFetch, json, cronReq, makeRes, quiet } from './helpers.mjs';

setTestEnv();
const { default: gbpPost } = await import('../api/gbp-post.js');
const { REVIEW_COUNT, RATES, MIN_HOURS } = await import('../api/_business-facts.js');

const token = ['oauth2.googleapis.com/token', () => json({ access_token: 'test-google-token' })];
const mail = ['api.resend.com/emails', () => json({ id: 'test-mail' })];
const count = (n) => [/GET .*\/reviews\?pageSize=1/, () => json({ totalReviewCount: n })];
const publish = [/POST .*\/localPosts/, () => json({ state: 'LIVE' })];
const of = (calls, part) => calls.filter((c) => `${c.method} ${c.url}`.includes(part));

async function run(routes) {
  const calls = stubFetch(routes);
  const res = makeRes();
  await quiet(() => gbpPost(cronReq(), res));
  return { calls, res };
}

test('the weekly post goes out when Google agrees with the published review count', async () => {
  const { calls, res } = await run([token, count(REVIEW_COUNT), publish, mail]);
  assert.equal(res.body.success, true);
  assert.equal(of(calls, '/localPosts').length, 1);
  assert.equal(of(calls, 'api.resend.com').length, 0);
});

test('a review-count mismatch skips the post and emails the owner', async () => {
  const { calls, res } = await run([token, count(REVIEW_COUNT - 4), publish, mail]);
  assert.equal(res.body.skipped, 'review count mismatch');
  assert.equal(of(calls, '/localPosts').length, 0);
  const sent = of(calls, 'api.resend.com');
  assert.equal(sent.length, 1);
  assert.ok(sent[0].json.subject.includes(String(REVIEW_COUNT - 4)));
  assert.ok(sent[0].json.subject.includes(String(REVIEW_COUNT)));
  assert.doesNotMatch(sent[0].json.subject + sent[0].json.text, /—/);
});

test('the post is skipped when the live count cannot be read', async () => {
  const { calls, res } = await run([token, [/GET .*\/reviews\?pageSize=1/, () => json({ error: { code: 403 } }, 403)], publish, mail]);
  assert.equal(res.body.skipped, 'review count unavailable');
  assert.equal(of(calls, '/localPosts').length, 0);
  assert.equal(of(calls, 'api.resend.com').length, 1);
});

test('post copy carries no year and takes its numbers from the shared constants', async () => {
  const source = fs.readFileSync(new URL('../api/gbp-post.js', import.meta.url), 'utf8');
  const posts = source.slice(source.indexOf('const POSTS = ['), source.indexOf('export default'));
  assert.doesNotMatch(posts, /\b20\d\d\b/, 'a year is hard-coded in post copy');
  assert.doesNotMatch(posts, /\$\d/, 'a price is hard-coded in post copy');
  assert.doesNotMatch(posts, new RegExp(`\\b${REVIEW_COUNT}\\b`), 'the review count is hard-coded in post copy');

  // Every post in the rotation, by pinning the clock to each week in turn.
  const RealDate = Date;
  const summaries = new Set();
  try {
    for (let week = 0; week < 23; week++) {
      const fixed = new RealDate(2026, 0, 1 + week * 7, 12).getTime();
      globalThis.Date = class extends RealDate {
        constructor(...args) { super(...(args.length ? args : [fixed])); }
        static now() { return fixed; }
      };
      const { calls } = await run([token, count(REVIEW_COUNT), publish, mail]);
      summaries.add(of(calls, '/localPosts')[0].json.summary);
    }
  } finally {
    globalThis.Date = RealDate;
  }
  assert.equal(summaries.size, 23);
  const all = [...summaries].join('\n');
  assert.doesNotMatch(all, /\b20\d\d\b|undefined|NaN|\$\{/);
  assert.ok(all.includes(`${REVIEW_COUNT} Five-Star Google Reviews`));
  assert.ok(all.includes(`$${RATES.marquis.weekday}/hr weekdays, $${RATES.marquis.weekend}/hr weekends, ${MIN_HOURS}-hour minimum`));
});
