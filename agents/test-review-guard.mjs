/**
 * Unit tests for reviewHoldReason, the code guard between Claude and the
 * Google listing. Touches no network.
 *
 * Usage: node --test agents/test-review-guard.mjs
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import handler, { reviewHoldReason } from '../api/review-responder.js';

const five = { starRating: 'FIVE', comment: 'Best sunset cruise, all 8 of us loved the flybridge.' };

test('a five-star review with text may be drafted', () => {
  assert.equal(reviewHoldReason(five), null);
});

test('a missing rating is held, never read as five stars', () => {
  assert.match(reviewHoldReason({ comment: 'Great' }), /rating is missing/);
  assert.match(reviewHoldReason({ starRating: 'STAR_RATING_UNSPECIFIED', comment: 'Great' }), /rating/);
});

test('one to four stars are held', () => {
  for (const starRating of ['ONE', 'TWO', 'THREE', 'FOUR']) {
    assert.ok(reviewHoldReason({ starRating, comment: 'ok' }), starRating);
  }
});

test('a review with no text is held', () => {
  assert.match(reviewHoldReason({ starRating: 'FIVE' }), /no text/);
  assert.match(reviewHoldReason({ starRating: 'FIVE', comment: '  ' }), /no text/);
});

test('a plain thank-you passes', () => {
  assert.equal(reviewHoldReason(five, 'Thank you, Sam. Come back and see us soon.\n\nCaptain Josh & The Yacht Away Now Crew'), null);
});

test('a number the reviewer wrote and the boat length may be repeated', () => {
  assert.equal(reviewHoldReason(five, 'Sam, glad all 8 of you enjoyed the 52ft Marquis.'), null);
});

test('an invented number is held', () => {
  assert.match(reviewHoldReason(five, 'Sam, see you for your 40th.'), /40/);
  assert.match(reviewHoldReason(five, 'Sam, all 18 of you were great.'), /18/);
});

test('a phone number, price, URL or email is held', () => {
  assert.ok(reviewHoldReason(five, 'Call (727) 609-2248 anytime.'));
  assert.ok(reviewHoldReason(five, 'Next time is only $ five hundred an hour.'));
  assert.ok(reviewHoldReason(five, 'Book at yachtawaynow.com.'));
  assert.ok(reviewHoldReason(five, 'Write to josh@yachtawaynow.com.'));
});

test('apology and compensation language is held', () => {
  for (const reply of [
    'We will refund you.',
    'Let us make it right.',
    'That was our fault.',
    'We will compensate you.',
    'Here is a discount.',
    'The next hour is free for you.',
    'We apologize.',
  ]) {
    assert.match(reviewHoldReason(five, reply), /apology or compensation/, reply);
  }
});

function call(headers, method = 'GET') {
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  return handler({ headers, method }, res).then(() => res);
}

test('the handler refuses every request that lacks the cron secret', async () => {
  process.env.CRON_SECRET = 'test-secret';
  assert.equal((await call({})).code, 401);
  assert.equal((await call({ authorization: 'Bearer wrong' })).code, 401);
  assert.equal((await call({}, 'POST')).code, 401);
});

test('the handler refuses every request when no cron secret is configured', async () => {
  delete process.env.CRON_SECRET;
  assert.equal((await call({})).code, 401);
  assert.equal((await call({ authorization: 'Bearer undefined' })).code, 401);
});
