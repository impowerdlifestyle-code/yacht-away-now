-- Last-sent time per alert key, so repeated owner alerts and repeated
-- contract-link emails are rate limited across every serverless instance
-- (api/_shared.js throttled()). Keys in use: turnstile-misconfigured,
-- lead-not-forwarded, contract-link:<booking id>, unmatched:<payment id>.
--
-- Until this is applied the limit still holds inside one warm instance only.
--
-- Written by the service role only. RLS is on with no policies.

create table if not exists public.alert_throttle (
  key text primary key,
  sent_at timestamptz not null default now()
);

alter table public.alert_throttle enable row level security;
