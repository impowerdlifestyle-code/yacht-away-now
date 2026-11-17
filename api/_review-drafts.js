import crypto from 'node:crypto';
import { SUPABASE_URL, supabaseHeaders, safeEqual } from './_shared.js';

const TABLE = `${SUPABASE_URL}/rest/v1/review_reply_drafts`;
const SITE = 'https://www.yachtawaynow.com';

export const REVIEW_ID = /^[A-Za-z0-9_-]{1,200}$/;

const HELD_TERMS = /refund|discount|free|complimentary|compensat|credit|guarantee|lawsuit|legal/i;

// Runs on the model's reply before it is offered to the owner and again before
// it is posted. A reply that trips any rule goes to a person to write by hand.
export function replyHoldReason(reply) {
  if (/\$|\bdollars?\b|\busd\b/i.test(reply)) return 'mentions a dollar amount';
  if (/%|\bpercent/i.test(reply)) return 'mentions a percentage';
  const term = reply.match(HELD_TERMS);
  if (term) return `contains "${term[0].toLowerCase()}"`;
  const hosts = reply.match(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b/gi) || [];
  for (const raw of hosts) {
    const host = raw.toLowerCase();
    if (host !== 'yachtawaynow.com' && !host.endsWith('.yachtawaynow.com')) return `links to ${host}`;
  }
  if (/https?:\/\//i.test(reply) && hosts.length === 0) return 'contains a link';
  return null;
}

// The signature covers the action, the review and the exact draft text, so a
// Skip link cannot be turned into an Approve link and a link stops working if
// the stored draft is ever changed.
function replySig(action, reviewId, draftText) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET is not set');
  const draftHash = crypto.createHash('sha256').update(draftText).digest('hex');
  return crypto.createHmac('sha256', secret).update(`review-reply\n${action}\n${reviewId}\n${draftHash}`).digest('hex');
}

export function replyLink(action, reviewId, draftText) {
  return `${SITE}/api/review-reply?action=${action}&id=${encodeURIComponent(reviewId)}&sig=${replySig(action, reviewId, draftText)}`;
}

export function validReplySig(sig, action, reviewId, draftText) {
  if (!process.env.CRON_SECRET || typeof draftText !== 'string' || !draftText) return false;
  return safeEqual(sig, replySig(action, reviewId, draftText));
}

async function rows(res, what) {
  if (!res.ok) throw new Error(`review drafts ${what} failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export async function loadDrafts(reviewIds) {
  if (reviewIds.length === 0) return new Map();
  const list = reviewIds.map((id) => `"${id}"`).join(',');
  const found = await rows(
    await fetch(`${TABLE}?review_id=in.(${encodeURIComponent(list)})&select=*`, { headers: supabaseHeaders() }),
    'lookup',
  );
  return new Map(found.map((row) => [row.review_id, row]));
}

export async function loadDraft(reviewId) {
  return (await loadDrafts([reviewId])).get(reviewId) || null;
}

// Returns the stored row, or null when another run stored this review first.
export async function insertDraft(row) {
  const stored = await rows(
    await fetch(TABLE, {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'return=representation,resolution=ignore-duplicates' }),
      body: JSON.stringify(row),
    }),
    'insert',
  );
  return stored[0] || null;
}

// Changes the row only while it is still in fromStatus, so two clicks on the
// same link cannot both win. Returns the changed row or null.
export async function moveDraft(reviewId, fromStatus, changes) {
  const changed = await rows(
    await fetch(`${TABLE}?review_id=eq.${encodeURIComponent(reviewId)}&status=eq.${fromStatus}`, {
      method: 'PATCH',
      headers: supabaseHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(changes),
    }),
    'update',
  );
  return changed[0] || null;
}
