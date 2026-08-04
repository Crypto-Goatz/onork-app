-- Burst runs and receipts — the audit trail for anything 0nCORE does to a
-- client account.
--
-- ONE RECEIPT PER LEG, WRITTEN BEFORE THE CALL GOES OUT. A receipt created
-- after a successful response cannot record the calls that never came back —
-- a timeout mid-write would leave a client account changed with nothing on our
-- side saying so. Rows start as 'pending' and are settled afterwards, so a
-- stuck 'pending' is itself the signal that something went out and we lost the
-- answer.
--
-- `billed` IS SEPARATE FROM `price_cents` on purpose. Price is what the leg
-- would cost; billed is whether we actually charged. A failed step carries its
-- price and billed=false, which is what makes "a step that fails is never
-- billed" checkable after the fact instead of merely intended.

create table if not exists public.burst_runs (
  id            uuid primary key default gen_random_uuid(),
  company_id    text not null,
  crm_user_id   text,
  command       text,
  -- The signed plan's id. UNIQUE is the replay guard: approving the same plan
  -- twice inserts a duplicate key rather than running a client's account twice.
  plan_id       text not null unique,
  status        text not null default 'running',
  leg_count     integer not null default 0,
  ok_count      integer not null default 0,
  failed_count  integer not null default 0,
  billed_cents  integer not null default 0,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create table if not exists public.burst_receipts (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.burst_runs(id) on delete cascade,
  -- Denormalised so a receipt can be scoped to an agency without a join, and
  -- so it survives as evidence even if the run row is ever removed.
  company_id   text not null,
  location_id  text,
  location_name text,
  capability   text not null,
  intent       text,
  status       text not null default 'pending',
  price_cents  integer not null default 0,
  billed       boolean not null default false,
  targets      integer not null default 0,
  detail       text,
  error        text,
  created_at   timestamptz not null default now(),
  settled_at   timestamptz
);

create index if not exists burst_runs_company_idx on public.burst_runs (company_id, created_at desc);
create index if not exists burst_receipts_company_idx on public.burst_receipts (company_id, created_at desc);
create index if not exists burst_receipts_run_idx on public.burst_receipts (run_id);
create index if not exists burst_receipts_location_idx on public.burst_receipts (location_id, created_at desc);

-- RLS on, with NO permissive policy, deliberately.
--
-- These rows are reached through the Custom Page app JWT, not a Supabase auth
-- session, so there is no auth.uid() to scope against — a policy written in
-- terms of one would be theatre. Access goes through server routes using the
-- service role, which scope by the companyId inside the signed JWT. Enabling
-- RLS without a policy means a leaked anon key reads nothing here.
alter table public.burst_runs enable row level security;
alter table public.burst_receipts enable row level security;
