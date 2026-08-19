-- addon_entitlements + location_plans — who may open an add-on, decided per LOCATION.
--
-- WHY LOCATION AND NEVER USER. The gate that shipped before this one read
-- `product_keys` by `user_id`. A CRM sub-account is used by several people —
-- `profiles` currently holds sixteen accounts pointing at the single location
-- `nphConTwfHcVE1oA0uep` — so a user-keyed entitlement means the person who
-- bought it can open the add-on and their colleague cannot, on the same
-- sub-account, with the same subscription. It also breaks the moment the buyer
-- leaves. The thing that is sold, installed, billed and revoked is the
-- location; that is what the key has to be.
--
-- TRI-STATE, NOT A BOOLEAN. active / grace / locked. Grace exists because a
-- lapsed card and a cancelled account are not the same event, and turning a
-- working product off on the strength of a failed webhook is how you lose a
-- customer who was going to pay. Seven days, and the countdown is shown to the
-- customer rather than expiring silently.
--
-- REVOCATION IS A VETO. status='revoked' outranks the tier ladder and the
-- install. Any other order means "take this away from them" can be quietly
-- undone by an unrelated plan change.
--
-- location_id <> '' IS A CHECK CONSTRAINT, not a convention. An empty string is
-- not null, and this database already carries an `crm_installations` row with
-- location_id = '' that read as the newest install in the table and was treated
-- as real (fixed in d013372). A blank key here would grant an entitlement to
-- every caller who could not resolve their location.

create table if not exists public.addon_entitlements (
  location_id text not null check (location_id <> ''),
  addon_slug  text not null check (addon_slug <> ''),

  -- 'purchase' — paid for directly (Stripe)
  -- 'grant'    — given by an operator; the reason belongs in `note`
  -- 'install'  — materialised from a CRM install (the hybrid; see lib/addons/entitlements.ts)
  -- 'tier'     — materialised from the plan ladder
  source      text not null default 'grant'
                check (source in ('purchase', 'grant', 'install', 'tier')),

  -- Only two values. 'grace' and 'locked' are DERIVED from the clock, never
  -- stored — a stored lifecycle state is a state that needs a cron to stay
  -- true, and goes stale the first time the cron misses.
  status      text not null default 'active' check (status in ('active', 'revoked')),

  granted_at  timestamptz not null default now(),
  -- null = perpetual. Set it and the grace window starts here.
  expires_at  timestamptz,
  grace_days  integer not null default 7 check (grace_days >= 0 and grace_days <= 90),

  company_id  text,
  note        text,
  updated_at  timestamptz not null default now(),

  primary key (location_id, addon_slug)
);

create index if not exists addon_entitlements_slug_idx
  on public.addon_entitlements (addon_slug);
create index if not exists addon_entitlements_company_idx
  on public.addon_entitlements (company_id);

comment on table public.addon_entitlements is
  'Per-location add-on entitlements. Keyed on location_id, never user_id. active/grace/locked is derived from expires_at + grace_days at read time.';


-- location_plans — the ladder anchor: which pricing tier this LOCATION is on.
--
-- WHY A NEW TABLE AND NOT profiles.plan. `profiles.plan` is per user, and
-- backfilling it onto locations would be the exact leak this migration exists
-- to close: sixteen accounts share `nphConTwfHcVE1oA0uep`, one of them on
-- 'enterprise', and a max-of-users rule would hand the CRM marketplace
-- reviewer the enterprise catalogue. It is also unsafe in the other direction —
-- several rows carrying plan='enterprise' were written by security tests
-- (`fake_admin@evil.com` among them). Nothing is backfilled here on purpose.
--
-- AN ABSENT ROW MEANS "NOT MEASURED", AND THE RESOLVER SAYS SO. It does not
-- mean 'free'. The gate still fails closed, but the reason it prints is that no
-- plan is recorded for the location — not an invented plan name.

create table if not exists public.location_plans (
  location_id text primary key check (location_id <> ''),
  -- Slugs come from lib/pricing.ts TIERS. Kept as text rather than an enum so a
  -- new tier is a pricing change, not a migration.
  tier        text not null check (tier in ('free', 'starter', 'pro', 'agency', 'enterprise')),
  source      text not null default 'manual'
                check (source in ('stripe', 'manual', 'provision', 'agency')),
  company_id  text,
  note        text,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

comment on table public.location_plans is
  'Pricing tier per CRM location. Feeds the tier half of the add-on gate. No row = tier unknown, which is printed rather than defaulted to free.';


-- Both tables decide access to paid capability inside a customer account, so
-- they follow the same rule as every other credential-adjacent table here:
-- service role only, no anon reach.
alter table public.addon_entitlements enable row level security;
alter table public.location_plans     enable row level security;

drop policy if exists "service role manages addon entitlements" on public.addon_entitlements;
create policy "service role manages addon entitlements"
  on public.addon_entitlements for all
  to service_role using (true) with check (true);

drop policy if exists "service role manages location plans" on public.location_plans;
create policy "service role manages location plans"
  on public.location_plans for all
  to service_role using (true) with check (true);
