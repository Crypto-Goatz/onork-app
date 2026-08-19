-- The table three shipped surfaces have been querying since the day they were
-- written, and which has never existed.
--
-- WHAT WAS BROKEN. app/use-cases/page.tsx, app/use-cases/[slug]/page.tsx and
-- app/api/cron/use-cases/route.ts all address `public.use_cases`. It is not in
-- this project. PostgREST answers an unknown relation with PGRST205, supabase-js
-- leaves `data` null, the index reads `useCases || []` and renders "0 Use Cases"
-- over a hero that promises them, every /use-cases/<slug> takes the `if (!uc)
-- notFound()` branch, and the cron registered in vercel.json at `0 8 * * *` has
-- returned 500 on its insert every morning since it was scheduled. Same failure
-- as the blog defect in cb8b3e3 — a select naming something the database does
-- not have, swallowed by `|| []`.
--
-- WHY THE SHAPE IS NOT A DESIGN DECISION. Every column below is one the shipped
-- code already reads or writes. The cron's insert names slug, title, subtitle,
-- category, description, problem, solution, how_it_works, features, metrics,
-- meta_title, meta_description, keywords, cta_text, cta_url, status,
-- generated_by and generation_prompt. The index additionally orders on
-- `featured` desc then `sort_order` asc — an order-by on a column that does not
-- exist is the same PGRST error and the same blank page, so both are here. The
-- detail page reads `testimonial` and `updated_at`. Nothing is invented and
-- nothing is spare.
--
-- WHY NOT NULL ON THE PROSE. The detail page renders {uc.problem}, {uc.solution}
-- and uc.description.slice(0, 120) with no guard. A row missing one of those is
-- a published page with a hole in it. Better the insert fails loudly at 8am and
-- the cron logs it than the page ships empty and nobody notices for a month.
--
-- WHY status DEFAULTS TO 'draft'. Both read paths filter status = 'published'.
-- The cron sets 'published' explicitly because that is its job; anything else
-- that lands a row here — a manual insert, an import, a half-finished draft —
-- should have to say so to go live.

create table if not exists public.use_cases (
  id                uuid primary key default gen_random_uuid(),

  -- ── Identity ──────────────────────────────────────────────────────────────
  -- slug is the URL. Unique because /use-cases/<slug> resolves with .single(),
  -- which errors on a second match rather than picking one.
  slug              text not null unique,
  title             text not null,
  subtitle          text,
  category          text not null,

  -- ── Prose the detail page renders unguarded ───────────────────────────────
  description       text not null,
  problem           text not null,
  solution          text not null,

  -- ── Structured blocks. Shapes are fixed by the JSX that maps over them. ───
  -- how_it_works: [{step, title, description}]
  -- features:     [{title, description}]
  -- metrics:      [{value, label, detail?}]   (index shows the first 3)
  -- testimonial:  {quote, author, role} | null — nothing writes it yet; the
  --               detail page already renders it when present.
  how_it_works      jsonb not null default '[]'::jsonb,
  features          jsonb not null default '[]'::jsonb,
  metrics           jsonb not null default '[]'::jsonb,
  testimonial       jsonb,

  -- ── SEO ───────────────────────────────────────────────────────────────────
  meta_title        text,
  meta_description  text,
  keywords          text[] not null default '{}',

  -- ── Call to action ────────────────────────────────────────────────────────
  cta_text          text not null default 'Get Started',
  cta_url           text not null default '/login',

  -- ── Publication + ordering. Both read paths filter and sort on these. ─────
  status            text not null default 'draft'
                      check (status in ('draft', 'published', 'archived')),
  featured          boolean not null default false,
  sort_order        integer not null default 0,

  -- ── Provenance: which pipeline produced this row, and from what prompt. ───
  -- 'groq-cron' for the daily generator. A human-written row says so here.
  generated_by      text,
  generation_prompt text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- The index's exact query: status filter, then featured desc, sort_order asc.
create index if not exists use_cases_published_order_idx
  on public.use_cases (status, featured desc, sort_order asc);

-- The cron reads every slug on each run to avoid regenerating a topic.
create index if not exists use_cases_category_idx
  on public.use_cases (category);

create or replace function public.use_cases_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists use_cases_touch_updated_at on public.use_cases;
create trigger use_cases_touch_updated_at
  before update on public.use_cases
  for each row execute function public.use_cases_touch_updated_at();

-- RLS follows store_listings, not blog_posts: published rows are public, and
-- everything else is service-role only. The page prefers the service key but
-- falls back to the anon key, so the anon read path has to actually work.
alter table public.use_cases enable row level security;

drop policy if exists "Public read published use cases" on public.use_cases;
create policy "Public read published use cases"
  on public.use_cases for select
  using (status = 'published');

drop policy if exists "Service role full access on use_cases" on public.use_cases;
create policy "Service role full access on use_cases"
  on public.use_cases for all
  to service_role
  using (true) with check (true);

comment on table public.use_cases is
  '0nCore use-case articles behind /use-cases and /use-cases/[slug]. Written by the daily Groq generator at /api/cron/use-cases (0 8 * * *). Only status = published is readable by anon.';
