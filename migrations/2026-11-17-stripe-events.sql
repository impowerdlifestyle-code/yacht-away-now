-- One row per Stripe checkout.session.completed event the site has processed.
-- api/stripe-webhook.js inserts here BEFORE doing anything else, so the unique
-- event id turns a redelivery or a concurrent delivery into a no-op. A run
-- that fails deletes its row again so Stripe's retry is processed.
--
-- It also keeps every payment reference (deposit, balance, a mistaken second
-- deposit) after bookings.stripe_payment_id has moved on to the latest one.
--
-- Until this is applied the webhook logs "stripe_events unavailable" and falls
-- back to comparing bookings.stripe_payment_id, which is what it did before.
--
-- Written by the service role only. RLS is on with no policies, so the anon
-- key cannot read or write it.

create table if not exists public.stripe_events (
  event_id text primary key,
  session_id text,
  payment_intent text,
  booking_id text,
  type text,
  amount numeric,
  created_at timestamptz not null default now()
);

create index if not exists stripe_events_booking_id_idx on public.stripe_events (booking_id);

alter table public.stripe_events enable row level security;
