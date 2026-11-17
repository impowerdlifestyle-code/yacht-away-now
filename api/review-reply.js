import { escapeHtml } from './_shared.js';
import { GBP_LOCATION_URL, getAccessToken } from './_gbp.js';
import { REVIEW_ID, replyHoldReason, validReplySig, loadDraft, moveDraft } from './_review-drafts.js';

function page(res, status, title, bodyHtml) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(status).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f1ea;color:#1c2b36;margin:0;padding:32px 16px;">
<main style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;text-align:center;">
<h1 style="font-size:1.3rem;margin:0 0 16px;">${escapeHtml(title)}</h1>
${bodyHtml}
</main></body></html>`);
}

const quote = (value) => `<blockquote style="margin:8px 0 20px;padding:12px 14px;border-left:3px solid #c9a84c;background:#f6f3ec;white-space:pre-wrap;text-align:left;">${escapeHtml(value)}</blockquote>`;

const HANDLED = {
  publishing: 'This reply is being published right now.',
  published: 'This reply was already published to Google.',
  skipped: 'This reply was already skipped. Nothing was posted.',
};

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return page(res, 405, 'Method not allowed', '');

  const action = String(req.query.action || '');
  const reviewId = String(req.query.id || '');
  const sig = String(req.query.sig || '');
  const invalid = () => page(res, 403, 'This link is not valid', '<p>Nothing was posted.</p>');
  if (!['approve', 'skip'].includes(action) || !REVIEW_ID.test(reviewId) || !sig) return invalid();

  try {
    const row = await loadDraft(reviewId);
    if (!row || !validReplySig(sig, action, reviewId, row.draft_text)) return invalid();
    if (row.status !== 'pending') return page(res, 200, 'Already handled', `<p>${HANDLED[row.status] || 'This reply is not waiting for approval.'}</p>`);

    // Mail scanners follow links with GET, so GET only ever shows this page.
    if (req.method === 'GET') {
      const approving = action === 'approve';
      return page(res, 200, approving ? 'Publish this reply to Google?' : 'Skip this drafted reply?', `
<p>Review from <strong>${escapeHtml(row.reviewer_name)}</strong>, ${escapeHtml(row.star_rating)} stars:</p>
${quote(row.review_text || '(rating only, no written review)')}
<p>Drafted reply:</p>
${quote(row.draft_text)}
<form method="POST" action="/api/review-reply?action=${action}&amp;id=${encodeURIComponent(reviewId)}&amp;sig=${encodeURIComponent(sig)}">
<button type="submit" style="background:#0b1d2e;color:#ffffff;border:0;border-radius:8px;padding:12px 26px;font-size:1rem;font-weight:bold;cursor:pointer;">${approving ? 'Publish this exact reply' : 'Skip, I will reply myself'}</button>
</form>`);
    }

    const now = new Date().toISOString();

    if (action === 'skip') {
      const skipped = await moveDraft(reviewId, 'pending', { status: 'skipped', decided_at: now });
      return page(res, 200, skipped ? 'Skipped' : 'Already handled', '<p>Nothing was posted. Reply to this review yourself in Google Business Profile.</p>');
    }

    const claimed = await moveDraft(reviewId, 'pending', { status: 'publishing', decided_at: now });
    if (!claimed) return page(res, 200, 'Already handled', '<p>This reply is not waiting for approval.</p>');

    const comment = claimed.draft_text;
    try {
      const holdReason = replyHoldReason(comment);
      if (holdReason) throw new Error(`the draft ${holdReason}`);

      const accessToken = await getAccessToken();
      const reviewUrl = `${GBP_LOCATION_URL}/reviews/${encodeURIComponent(reviewId)}`;

      const liveRes = await fetch(reviewUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      const live = await liveRes.json().catch(() => ({}));
      if (!liveRes.ok) throw new Error(`Google could not load the review (${liveRes.status})`);
      if (live.reviewReply) {
        await moveDraft(reviewId, 'publishing', { status: 'skipped', last_error: 'review already had a reply on Google' });
        return page(res, 200, 'Already replied', '<p>This review already has a reply on Google, so the draft was not posted.</p>');
      }

      const replyRes = await fetch(`${reviewUrl}/reply`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      if (!replyRes.ok) throw new Error(`Google rejected the reply (${replyRes.status})`);
    } catch (err) {
      console.error(`review-reply: publish failed for review ${reviewId}:`, err);
      await moveDraft(reviewId, 'publishing', { status: 'pending', last_error: String(err.message).slice(0, 500) });
      return page(res, 502, 'Not published', `<p>The reply was not posted: ${escapeHtml(err.message)}.</p><p>You can open the Approve link again to retry, or reply yourself in Google Business Profile.</p>`);
    }

    await moveDraft(reviewId, 'publishing', { status: 'published', published_at: new Date().toISOString(), last_error: null })
      .catch((err) => console.error(`review-reply: reply for review ${reviewId} is live but the row was not marked published:`, err));
    return page(res, 200, 'Published', `<p>This reply is now live on Google:</p>${quote(comment)}`);
  } catch (err) {
    console.error('review-reply error:', err);
    return page(res, 500, 'Something went wrong', '<p>Nothing was posted. Please try the link again in a few minutes.</p>');
  }
}
