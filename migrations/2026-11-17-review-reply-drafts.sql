-- One row per Google review the responder has seen. The model writes a draft
-- once, the owner approves or skips it by email, and api/review-reply.js posts
-- exactly draft_text. A row is never regenerated.
--
-- status:
--   pending      draft waiting for the owner's Approve or Skip
--   held         draft tripped the keyword guard, a person replies by hand
--   needs_human  3 stars or fewer, no draft is written
--   publishing   Approve was pressed and the post to Google is in flight
--   published    draft_text is live on Google
--   skipped      owner chose to reply by hand
create table if not exists public.review_reply_drafts (
  review_id     text primary key,
  reviewer_name text,
  star_rating   smallint,
  review_text   text,
  draft_text    text,
  hold_reason   text,
  status        text not null check (status in ('pending', 'held', 'needs_human', 'publishing', 'published', 'skipped')),
  emailed_at    timestamptz,
  decided_at    timestamptz,
  published_at  timestamptz,
  last_error    text,
  created_at    timestamptz not null default now()
);

-- No policies on purpose: only the service key, which bypasses RLS, reads or writes this.
alter table public.review_reply_drafts enable row level security;
