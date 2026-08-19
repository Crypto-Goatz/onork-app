-- The state of a vendor endpoint we do not control, and the switch that lets us
-- stop depending on it without a deploy.
--
-- WHY A TABLE AND NOT AN ENV VAR. `POST /oauth/locationToken` was removed from
-- the platform's documentation on 2026-06-11 with no deprecation period and
-- still answers 201 (lib/crm/deprecations.ts). The day it stops, every location
-- with no pasted key and no live install loses credential resolution. The fix
-- is to stop calling it — and on Vercel an env var is snapshotted into the
-- deployment, so flipping one means a rebuild and a redeploy at whatever hour
-- the canary fires. A row is an UPDATE: seconds, no build, revertible by the
-- same UPDATE. The env var is kept as the belt-and-braces override for the case
-- where this table is the thing that is unreachable.
--
-- WHY THE CANARY MAY ARM THIS BUT ONLY ON 404/410. lib/crm/deprecations.ts is
-- explicit that we must not break a working call because the vendor stopped
-- documenting it — that would be us causing the outage. A 5xx, a timeout or a
-- 401 are all consistent with an endpoint that is alive and having a bad day,
-- so they are recorded and never armed on. 404 and 410 are the endpoint telling
-- us it is gone; continuing to call it after that helps nobody and costs every
-- resolution a round trip before it fails.

create table if not exists public.crm_endpoint_state (
  -- 'POST /oauth/locationToken'. Method + path, exactly as in DEPRECATED_ENDPOINTS.
  endpoint            text primary key,

  -- ── Observation: what the canary last saw. Never a decision, just a fact. ──
  last_status         integer,
  last_checked_at     timestamptz,
  last_alive_at       timestamptz,
  consecutive_failures integer not null default 0,
  last_error          text,

  -- ── Decision: may resolution still call this endpoint? ──
  -- false = normal. true = skip the call entirely and require a pasted
  -- per-location key, with an error that names the location and the fix.
  fallback_armed      boolean not null default false,
  armed_at            timestamptz,
  -- 'canary:404' | 'canary:410' | 'operator' | 'verification' — so a row that
  -- armed itself at 3am is distinguishable from one a person flipped.
  armed_by            text,
  note                text,

  updated_at          timestamptz not null default now()
);

-- RLS on in the same migration. This row decides whether a credential path runs;
-- a browser session has no business reading or writing it. Server routes use the
-- service role, same as the connection tables.
alter table public.crm_endpoint_state enable row level security;

create policy "service role manages crm endpoint state"
  on public.crm_endpoint_state for all
  to service_role using (true) with check (true);

-- Seed the one endpoint this exists for, disarmed. Present-and-false is a
-- different fact from absent: absent means nothing has ever looked, and the
-- reader must not treat "no row" as "healthy".
insert into public.crm_endpoint_state (endpoint, note)
values (
  'POST /oauth/locationToken',
  'Undocumented since 2026-06-11, still answering. Probed every 6h by runLocationTokenCanary(). Arm to force pasted-key resolution.'
)
on conflict (endpoint) do nothing;
