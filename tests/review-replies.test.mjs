import test from 'node:test';
import assert from 'node:assert/strict';
import { setTestEnv, stubFetch, json, makeReq, cronReq, makeRes, draftsTable, quiet } from './helpers.mjs';

setTestEnv();
const { default: responder } = await import('../api/review-responder.js');
const { default: reviewReply } = await import('../api/review-reply.js');
const { replyLink } = await import('../api/_review-drafts.js');

const token = ['oauth2.googleapis.com/token', () => json({ access_token: 'test-google-token' })];
const mail = ['api.resend.com/emails', () => json({ id: 'test-mail' })];
const model = (text) => ['api.anthropic.com/v1/messages', () => json({ content: [{ type: 'text', text }] })];
const reviewList = (reviews) => [/GET .*\/reviews\?pageSize=50/, () => json({ reviews, totalReviewCount: 133 })];

const fiveStar = { reviewId: 'rev-five', starRating: 'FIVE', comment: 'Best sunset cruise of our lives.', reviewer: { displayName: 'Dana Example' } };
const twoStar = { reviewId: 'rev-two', starRating: 'TWO', comment: 'We waited at the dock for an hour.', reviewer: { displayName: 'Sam Example' } };

const of = (calls, part) => calls.filter((c) => `${c.method} ${c.url}`.includes(part));
const linkQuery = (link) => Object.fromEntries(new URL(link).searchParams);

async function runCron(routes) {
  const calls = stubFetch(routes);
  const res = makeRes();
  await quiet(() => responder(cronReq(), res));
  return { calls, res };
}

async function callReply(method, query, routes) {
  const calls = stubFetch(routes);
  const res = makeRes();
  await quiet(() => reviewReply(makeReq({ method, query }), res));
  return { calls, res };
}

test('the cron refuses a caller without the cron secret', async () => {
  const calls = stubFetch([]);
  const res = makeRes();
  await responder(makeReq({ headers: {} }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('a 5-star review is drafted once, stored, emailed, and never posted by the cron', async () => {
  const drafts = draftsTable();
  const routes = [token, reviewList([fiveStar]), drafts.route, model('Dana, thank you for cruising with us!'), mail];

  const first = await runCron(routes);
  assert.equal(first.res.statusCode, 200);
  assert.equal(of(first.calls, 'api.anthropic.com').length, 1);
  assert.equal(of(first.calls, 'PUT ').length, 0, 'the cron never writes to Google');

  const row = drafts.table.get('rev-five');
  assert.equal(row.status, 'pending');
  assert.equal(row.draft_text, 'Dana, thank you for cruising with us!');
  assert.ok(row.emailed_at);

  const sent = of(first.calls, 'api.resend.com');
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].json.to, ['josh@yachtawaynow.com', 'ciaran@voreli.ai']);
  assert.equal(sent[0].json.from, 'Yacht Away Now Alerts <alerts@yachtawaynow.com>');
  assert.ok(sent[0].json.text.includes('Best sunset cruise of our lives.'));
  assert.ok(sent[0].json.text.includes('Dana, thank you for cruising with us!'));
  assert.ok(sent[0].json.text.includes(replyLink('approve', 'rev-five', row.draft_text)));
  assert.ok(sent[0].json.text.includes(replyLink('skip', 'rev-five', row.draft_text)));
  assert.doesNotMatch(sent[0].json.subject + sent[0].json.text + sent[0].json.html, /\u2014/);

  // Later runs see the stored row: no second draft, no second email.
  const second = await runCron([token, reviewList([fiveStar]), drafts.route, model('A DIFFERENT DRAFT'), mail]);
  assert.equal(of(second.calls, 'api.anthropic.com').length, 0);
  assert.equal(of(second.calls, 'api.resend.com').length, 0);
  assert.equal(drafts.table.get('rev-five').draft_text, 'Dana, thank you for cruising with us!');
});

test('a draft whose email failed is emailed again from the stored text, not regenerated', async () => {
  const drafts = draftsTable();
  await runCron([token, reviewList([fiveStar]), drafts.route, model('Stored draft.'), ['api.resend.com/emails', () => json({ message: 'rate limited' }, 429)]]);
  assert.equal(drafts.table.get('rev-five').emailed_at, null);

  const retry = await runCron([token, reviewList([fiveStar]), drafts.route, model('A DIFFERENT DRAFT'), mail]);
  assert.equal(of(retry.calls, 'api.anthropic.com').length, 0);
  assert.ok(of(retry.calls, 'api.resend.com')[0].json.text.includes('Stored draft.'));
  assert.ok(drafts.table.get('rev-five').emailed_at);
});

test('a draft that trips the guard is held once: no approve link, no regeneration', async () => {
  const drafts = draftsTable();
  const routes = [token, reviewList([fiveStar]), drafts.route, model('Come back for a free cruise, Dana!'), mail];

  const first = await runCron(routes);
  const row = drafts.table.get('rev-five');
  assert.equal(row.status, 'held');
  assert.equal(row.hold_reason, 'contains "free"');
  const sent = of(first.calls, 'api.resend.com');
  assert.equal(sent.length, 1);
  assert.match(sent[0].json.subject, /^Needs a human reply/);
  assert.doesNotMatch(sent[0].json.text + sent[0].json.html, /api\/review-reply/);

  const second = await runCron(routes);
  assert.equal(of(second.calls, 'api.anthropic.com').length, 0, 'a held draft is not regenerated');
  assert.equal(of(second.calls, 'api.resend.com').length, 0);

  const forged = await callReply('POST', linkQuery(replyLink('approve', 'rev-five', row.draft_text)), [drafts.route]);
  assert.equal(of(forged.calls, 'PUT ').length, 0, 'a held draft cannot be published even with a valid signature');
  assert.equal(drafts.table.get('rev-five').status, 'held');
});

test('a low-star review gets no draft and exactly one "needs a human reply" email', async () => {
  const drafts = draftsTable();
  const routes = [token, reviewList([twoStar]), drafts.route, mail];

  const first = await runCron(routes);
  const sent = of(first.calls, 'api.resend.com');
  assert.equal(sent.length, 1);
  assert.match(sent[0].json.subject, /^Needs a human reply/);
  assert.ok(sent[0].json.text.includes('We waited at the dock for an hour.'));
  assert.doesNotMatch(sent[0].json.text + sent[0].json.html, /api\/review-reply/);
  assert.equal(drafts.table.get('rev-two').status, 'needs_human');
  assert.equal(drafts.table.get('rev-two').draft_text, null);

  for (let hour = 0; hour < 3; hour++) {
    const again = await runCron(routes);
    assert.equal(of(again.calls, 'api.resend.com').length, 0);
  }
});

test('nothing is drafted or sent when the drafts table cannot be read', async () => {
  const { calls, res } = await runCron([
    token, reviewList([fiveStar, twoStar]),
    [/review_reply_drafts/, () => json({ message: 'relation does not exist' }, 404)],
  ]);
  assert.equal(res.statusCode, 500);
  assert.equal(of(calls, 'api.anthropic.com').length, 0);
  assert.equal(of(calls, 'api.resend.com').length, 0);
  assert.equal(of(calls, 'PUT ').length, 0);
});

const pendingRow = () => ({
  review_id: 'rev-five', reviewer_name: 'Dana Example', star_rating: 5,
  review_text: 'Best sunset <b>cruise</b>.', draft_text: 'Dana, thank you for cruising with us!',
  hold_reason: null, status: 'pending', emailed_at: '2026-11-17T00:00:00Z',
});
const liveReview = (body = {}) => [/GET .*\/reviews\/rev-five$/, () => json({ reviewId: 'rev-five', ...body })];
const putReply = ['PUT ', () => json({ comment: 'ok' })];

test('forged, swapped and stale approve links are rejected and publish nothing', async () => {
  const good = linkQuery(replyLink('approve', 'rev-five', pendingRow().draft_text));
  const skip = linkQuery(replyLink('skip', 'rev-five', pendingRow().draft_text));
  const forgeries = {
    'made-up signature': { ...good, sig: 'a'.repeat(64) },
    'no signature': { action: 'approve', id: 'rev-five' },
    'skip signature on approve': { ...good, sig: skip.sig },
    'signature for another review': { ...good, sig: linkQuery(replyLink('approve', 'rev-other', pendingRow().draft_text)).sig },
    'signature for different draft text': { ...good, sig: linkQuery(replyLink('approve', 'rev-five', 'Free cruise for everyone!')).sig },
    'unknown action': { ...good, action: 'publish' },
    'unknown review': { ...good, id: 'rev-missing' },
    'hostile id': { ...good, id: 'rev-five")&status=eq.pending' },
  };
  for (const [name, query] of Object.entries(forgeries)) {
    for (const method of ['GET', 'POST']) {
      const drafts = draftsTable([pendingRow()]);
      const { calls, res } = await callReply(method, query, [drafts.route]);
      assert.equal(res.statusCode, 403, `${name} via ${method}`);
      assert.equal(of(calls, 'googleapis.com').length, 0, `${name} via ${method} reached Google`);
      assert.equal(drafts.table.get('rev-five').status, 'pending');
    }
  }

  // A link signed for the old text dies when the stored draft changes.
  const drafts = draftsTable([{ ...pendingRow(), draft_text: 'Edited in the database.' }]);
  const stale = await callReply('POST', good, [drafts.route]);
  assert.equal(stale.res.statusCode, 403);
});

test('a link is useless without the server secret', async () => {
  const good = linkQuery(replyLink('approve', 'rev-five', pendingRow().draft_text));
  const saved = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const drafts = draftsTable([pendingRow()]);
    const { calls, res } = await callReply('POST', good, [drafts.route]);
    assert.equal(res.statusCode, 403);
    assert.equal(of(calls, 'googleapis.com').length, 0);
  } finally {
    process.env.CRON_SECRET = saved;
  }
});

test('GET shows a confirm page and changes nothing, so a mail scanner cannot publish', async () => {
  const drafts = draftsTable([pendingRow()]);
  const good = linkQuery(replyLink('approve', 'rev-five', pendingRow().draft_text));
  for (let scan = 0; scan < 3; scan++) {
    const { calls, res } = await callReply('GET', good, [drafts.route]);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /<form method="POST"/);
    assert.ok(res.body.includes('Dana, thank you for cruising with us!'));
    assert.ok(res.body.includes('Best sunset &lt;b&gt;cruise&lt;/b&gt;.'), 'review text is escaped');
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal(of(calls, 'googleapis.com').length, 0);
    assert.equal(of(calls, 'PATCH ').length, 0);
  }
  assert.equal(drafts.table.get('rev-five').status, 'pending');
});

test('POST publishes exactly the stored draft, once', async () => {
  const drafts = draftsTable([pendingRow()]);
  const good = linkQuery(replyLink('approve', 'rev-five', pendingRow().draft_text));
  const routes = [drafts.route, token, liveReview(), putReply];

  const { calls, res } = await callReply('POST', good, routes);
  assert.equal(res.statusCode, 200);
  const puts = of(calls, 'PUT ');
  assert.equal(puts.length, 1);
  assert.match(puts[0].url, /\/reviews\/rev-five\/reply$/);
  assert.deepEqual(puts[0].json, { comment: 'Dana, thank you for cruising with us!' });
  assert.equal(of(calls, 'api.anthropic.com').length, 0, 'publishing never calls the model');
  assert.equal(drafts.table.get('rev-five').status, 'published');
  assert.ok(drafts.table.get('rev-five').published_at);

  const again = await callReply('POST', good, routes);
  assert.equal(of(again.calls, 'PUT ').length, 0, 'a second click does not post again');
  assert.match(again.res.body, /already published/);
});

test('approve does not overwrite a reply the owner already posted by hand', async () => {
  const drafts = draftsTable([pendingRow()]);
  const good = linkQuery(replyLink('approve', 'rev-five', pendingRow().draft_text));
  const { calls } = await callReply('POST', good, [drafts.route, token, liveReview({ reviewReply: { comment: 'Thanks Dana. Josh' } }), putReply]);
  assert.equal(of(calls, 'PUT ').length, 0);
  assert.equal(drafts.table.get('rev-five').status, 'skipped');
});

test('a failed publish goes back to pending so the same link can retry', async () => {
  const drafts = draftsTable([pendingRow()]);
  const good = linkQuery(replyLink('approve', 'rev-five', pendingRow().draft_text));
  const failed = await callReply('POST', good, [drafts.route, token, liveReview(), ['PUT ', () => json({ error: {} }, 503)]]);
  assert.equal(failed.res.statusCode, 502);
  assert.equal(drafts.table.get('rev-five').status, 'pending');

  const retry = await callReply('POST', good, [drafts.route, token, liveReview(), putReply]);
  assert.equal(retry.res.statusCode, 200);
  assert.equal(drafts.table.get('rev-five').status, 'published');
});

test('skip marks the draft skipped and posts nothing; approve then no longer works', async () => {
  const drafts = draftsTable([pendingRow()]);
  const skip = linkQuery(replyLink('skip', 'rev-five', pendingRow().draft_text));
  const skipped = await callReply('POST', skip, [drafts.route]);
  assert.equal(skipped.res.statusCode, 200);
  assert.equal(drafts.table.get('rev-five').status, 'skipped');
  assert.equal(of(skipped.calls, 'googleapis.com').length, 0);

  const approve = linkQuery(replyLink('approve', 'rev-five', pendingRow().draft_text));
  const late = await callReply('POST', approve, [drafts.route, token, liveReview(), putReply]);
  assert.equal(of(late.calls, 'PUT ').length, 0);
});
