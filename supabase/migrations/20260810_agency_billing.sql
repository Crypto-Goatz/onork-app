-- agency_billing — the agency's Stripe identity and founding status.
--
-- WHY THIS EXISTS NOW. /api/agency/{subscribe,billing-status,billing-overview}
-- have queried `agency_billing` and `agency_added_clients` since they were
-- written, but NO migration ever created either table. The failure was silent
-- and expensive: a missing table makes the count read return no rows, so
-- `billableClients()` always received 0, the per-client line item was never
-- added to checkout, and `isFounding` always resolved true so the $19 base fee
-- was never charged either. Every agency subscription created so far carries
-- the metered API item and nothing else. The $5/client model has never been
-- able to bill anyone.
--
-- WHY NO agency_added_clients. That table would be a second register of "which
-- clients has this agency added", and `location_connections` already is one —
-- it holds a row per connected sub-account because that row holds the token.
-- Two registers means one can say a client is billable while the other says the
-- credential is gone, and the disagreement is invisible until an invoice is
-- wrong. Billing counts `location_connections` directly.

create table if not exists public.agency_billing (
  id                  uuid primary key default gen_random_uuid(),
  company_id          text not null unique,

  stripe_customer_id  text,
  stripe_subscription_id text,

  -- Founding agencies never pay the base fee, permanently. Recorded per agency
  -- at signup rather than derived from a live count, so the grandfather does not
  -- move as other agencies sign up.
  is_founding         boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists agency_billing_customer_idx
  on public.agency_billing (stripe_customer_id);

-- Holds a Stripe customer mapping; service-role only, same as the other
-- credential-adjacent tables.
alter table public.agency_billing enable row level security;

create policy "service role manages agency billing"
  on public.agency_billing for all
  to service_role using (true) with check (true);
