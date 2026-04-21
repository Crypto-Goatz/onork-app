-- CRO9 Neuro Engine — 0nCore add-on
-- Applied directly to pwujhhmlrtxjmjzyttwn on 2026-04-21.
-- See lib/cro9/engine.ts for the orchestrator that drives these tables.

create table if not exists public.cro9_sites (
  id                         uuid primary key default uuid_generate_v4(),
  user_id                    uuid not null,
  location_id                text,
  site_url                   text not null,
  domain                     text not null,
  gsc_property               text,
  ga4_property_id            text,
  apply_mode                 text not null default 'briefs_only'
                             check (apply_mode in ('briefs_only','snippet','wordpress')),
  status                     text not null default 'trial'
                             check (status in ('trial','active','paused','canceled','expired')),
  trial_ends_at              timestamptz,
  site_token                 text unique,
  serpapi_key_encrypted      text,
  stripe_subscription_id     text,
  last_run_at                timestamptz,
  last_run_status            text,
  last_run_summary           jsonb,
  baseline_snapshot          jsonb,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index if not exists cro9_sites_user_idx   on public.cro9_sites(user_id);
create index if not exists cro9_sites_status_idx on public.cro9_sites(status) where status in ('trial','active');
create index if not exists cro9_sites_token_idx  on public.cro9_sites(site_token) where site_token is not null;

create table if not exists public.cro9_tasks (
  id                     uuid primary key default uuid_generate_v4(),
  site_id                uuid not null references public.cro9_sites(id) on delete cascade,
  url                    text not null,
  primary_keyword        text,
  secondary_keywords     text[] default '{}',
  bucket                 text not null,
  priority_action        text not null,
  score                  numeric not null,
  score_components       jsonb,
  status                 text not null default 'pending'
                         check (status in ('pending','briefed','applied','measuring','improved','flat','regressed','archived')),
  clicks                 integer default 0,
  impressions            integer default 0,
  position               numeric,
  ctr                    numeric,
  expected_ctr           numeric,
  ctr_gap                numeric,
  brief                  jsonb,
  baseline_metrics       jsonb,
  current_metrics        jsonb,
  delta                  jsonb,
  measure_window_days    integer default 14,
  created_at             timestamptz not null default now(),
  briefed_at             timestamptz,
  applied_at             timestamptz,
  measured_at            timestamptz
);
create index if not exists cro9_tasks_site_idx   on public.cro9_tasks(site_id, created_at desc);
create index if not exists cro9_tasks_status_idx on public.cro9_tasks(status) where status in ('applied','measuring','pending');
create index if not exists cro9_tasks_url_idx    on public.cro9_tasks(site_id, url);

create table if not exists public.cro9_action_history (
  id           uuid primary key default uuid_generate_v4(),
  site_id      uuid not null references public.cro9_sites(id) on delete cascade,
  task_id      uuid references public.cro9_tasks(id) on delete set null,
  action_type  text not null,
  payload      jsonb,
  outcome      jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists cro9_action_history_site_idx on public.cro9_action_history(site_id, created_at desc);

create table if not exists public.cro9_adaptive_weights (
  site_id       uuid not null references public.cro9_sites(id) on delete cascade,
  factor        text not null check (factor in ('impressions','position','ctrGap','conversions','freshness')),
  value         numeric not null,
  update_count  integer not null default 0,
  last_updated  timestamptz not null default now(),
  primary key (site_id, factor)
);

create table if not exists public.cro9_serp_snapshots (
  id           uuid primary key default uuid_generate_v4(),
  site_id      uuid not null references public.cro9_sites(id) on delete cascade,
  keyword      text not null,
  top_results  jsonb not null,
  features     jsonb,
  captured_at  timestamptz not null default now()
);
create index if not exists cro9_serp_snapshots_kw_idx on public.cro9_serp_snapshots(site_id, keyword, captured_at desc);

create table if not exists public.cro9_rewrites (
  id                uuid primary key default uuid_generate_v4(),
  task_id           uuid not null references public.cro9_tasks(id) on delete cascade,
  site_id           uuid not null references public.cro9_sites(id) on delete cascade,
  field             text not null check (field in ('title','meta','h1','intro','schema','alt','internal_links','full_rewrite')),
  original_value    text,
  rewritten_value   text,
  applied_at        timestamptz,
  applied_by        text
);
create index if not exists cro9_rewrites_task_idx on public.cro9_rewrites(task_id);

alter table public.cro9_sites            enable row level security;
alter table public.cro9_tasks            enable row level security;
alter table public.cro9_action_history   enable row level security;
alter table public.cro9_adaptive_weights enable row level security;
alter table public.cro9_serp_snapshots   enable row level security;
alter table public.cro9_rewrites         enable row level security;

drop policy if exists cro9_sites_owner on public.cro9_sites;
create policy cro9_sites_owner on public.cro9_sites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists cro9_tasks_via_site on public.cro9_tasks;
create policy cro9_tasks_via_site on public.cro9_tasks for select using (
  exists (select 1 from public.cro9_sites s where s.id = cro9_tasks.site_id and s.user_id = auth.uid())
);

drop policy if exists cro9_history_via_site on public.cro9_action_history;
create policy cro9_history_via_site on public.cro9_action_history for select using (
  exists (select 1 from public.cro9_sites s where s.id = cro9_action_history.site_id and s.user_id = auth.uid())
);

drop policy if exists cro9_weights_via_site on public.cro9_adaptive_weights;
create policy cro9_weights_via_site on public.cro9_adaptive_weights for select using (
  exists (select 1 from public.cro9_sites s where s.id = cro9_adaptive_weights.site_id and s.user_id = auth.uid())
);

drop policy if exists cro9_serp_via_site on public.cro9_serp_snapshots;
create policy cro9_serp_via_site on public.cro9_serp_snapshots for select using (
  exists (select 1 from public.cro9_sites s where s.id = cro9_serp_snapshots.site_id and s.user_id = auth.uid())
);

drop policy if exists cro9_rewrites_via_site on public.cro9_rewrites;
create policy cro9_rewrites_via_site on public.cro9_rewrites for select using (
  exists (select 1 from public.cro9_sites s where s.id = cro9_rewrites.site_id and s.user_id = auth.uid())
);
