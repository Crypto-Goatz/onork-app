-- Agency onboarding by PIT — how an agency connects 0nCORE to their CRM.
--
-- WHY PIT AND NOT OAUTH. The agency OAuth app cannot be granted `oauth.write`,
-- so it can never mint a per-sub-account token. Proven live on 2026-08-10: the
-- agency token lists all 87 sub-accounts but returns
-- `401 The token is not authorized for this scope` on /contacts. A location PIT
-- returns 200. So agency-level auth can enumerate clients and nothing more —
-- acting inside a client REQUIRES a credential scoped to that client.
--
-- That constraint shapes this schema, and it happens to match the commercial
-- model exactly: pasting a sub-account's PIT IS the act of connecting it. The
-- credential and the entitlement are the same gesture, so billing never has to
-- infer "is this account connected" from anything softer than a token we hold.
--
-- WHY TWO TABLES. The agency PIT is worth exactly one capability (list your
-- clients) and is useless for work. Location PITs are the working credentials.
-- Collapsing them into one table would invite code to grab "a PIT for this
-- agency" and use it against a location, which fails at runtime with an opaque
-- 401 — the exact confusion this split prevents.
--
-- This replaces the hardcoded per-customer PIT map in lib/crm.ts
-- (`'F76MNKOMQCMruMrumtdf': CRM_PIT_SPA`), which violates Critical Rule #1:
-- a literal that changes per customer does not belong in code.

-- ── The agency's own connection: one row per CRM company ──
create table if not exists public.agency_connections (
  id            uuid primary key default gen_random_uuid(),

  -- Who owns this connection in our world, and in theirs.
  user_id       uuid references auth.users(id) on delete cascade,
  company_id    text not null unique,
  company_name  text,

  -- Agency-scoped PIT. Lists sub-accounts. Cannot act inside one.
  agency_pit    text not null,

  -- Cached from /locations/search so the picker renders without a round trip.
  -- Advisory only — never the authority on what we may touch. A sub-account
  -- appearing here means "we can see it", never "we may act in it".
  locations     jsonb not null default '[]'::jsonb,
  locations_synced_at timestamptz,

  status        text not null default 'active',
  last_error    text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Connected sub-accounts: one row per location the agency actually wired up ──
create table if not exists public.location_connections (
  id            uuid primary key default gen_random_uuid(),

  company_id    text not null,
  location_id   text not null,
  location_name text,

  -- The working credential. Scoped to THIS location by the CRM itself.
  location_pit  text not null,

  -- Entitlement. `is_free` marks the one included account; everything else is
  -- billable. Deliberately NOT derived from "first connected" — an agency that
  -- connects their throwaway account first should be able to move the free slot
  -- without disconnecting anything.
  is_free       boolean not null default false,
  billing_status text not null default 'pending',   -- pending | active | past_due | canceled
  stripe_subscription_item_id text,

  -- Proof the PIT worked at connect time, so a later failure is legible as a
  -- revocation rather than "it never worked and nobody checked".
  verified_at   timestamptz,
  last_error    text,

  status        text not null default 'active',     -- active | disconnected

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (company_id, location_id)
);

-- One free account per agency. Enforced in the database because the alternative
-- is trusting every future write path to check, and the failure mode is silent
-- revenue loss rather than a visible error.
create unique index if not exists location_connections_one_free_per_company
  on public.location_connections (company_id)
  where is_free and status = 'active';

create index if not exists location_connections_company_idx
  on public.location_connections (company_id) where status = 'active';

-- ── RLS on, same migration. These tables hold live CRM credentials. ──
alter table public.agency_connections   enable row level security;
alter table public.location_connections enable row level security;

-- No anon/authenticated policies: PITs are never readable by a browser session,
-- even the owner's. Every read and write goes through a server route using the
-- service role. A client that needs to know "which accounts are connected" gets
-- a projection without the token, never the row.
create policy "service role manages agency connections"
  on public.agency_connections for all
  to service_role using (true) with check (true);

create policy "service role manages location connections"
  on public.location_connections for all
  to service_role using (true) with check (true);
