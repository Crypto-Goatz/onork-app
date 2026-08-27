-- ─────────────────────────────────────────────────────────────────────────
-- GEMINI'S DAILY COST REPORT — the narrative beside the meter, never instead of it.
--
-- APPLIED to pwujhhmlrtxjmjzyttwn on 2026-08-27. Recorded here because a schema
-- that exists only in the database is a decision the next reader cannot see.
--
-- /hub/usage renders two things that must never be conflated: what the meter
-- MEASURED (derived from usage_events at request time) and what Gemini REPORTS
-- (a written daily read on spend). A number a person typed and a number the
-- database counted are different kinds of fact, and a dashboard that prints
-- them in the same style teaches the reader to trust both equally.
--
-- NOTE FOR THE NEXT READER: 20260821100000_ai_usage_meter.sql had never been
-- applied when this was written. The meter had recorded 6 AI calls with no
-- model and no token counts — exactly the "confident average that is wrong for
-- every real request" its own header warned about. It was applied the same day.
--
-- RLS ON IN THE SAME MIGRATION. A previous table in this estate shipped with
-- RLS off and left live CRM tokens anon-readable. The service role bypasses
-- RLS, so the owner-gated route reads and writes normally; this closes the
-- anon door only. Verified: anon insert 401, anon select [], service role 200.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.ai_cost_reports (
  id uuid primary key default gen_random_uuid(),
  -- The day the report is ABOUT, not the day it was written. One per day per
  -- author: a re-post corrects the day rather than appending a second opinion
  -- the page would have to choose between.
  report_date date not null,
  author text not null default 'Gemini',
  -- Nullable, because "could not determine" and "zero" are different facts and
  -- collapsing them biases the total downward where the data is weakest.
  reported_cost_usd numeric(12,4),
  summary text not null,
  breakdown jsonb,
  -- A cost report with no stated source is an opinion; the page prints this
  -- next to the figure.
  source text,
  created_at timestamptz not null default now(),
  unique (report_date, author)
);

create index if not exists ai_cost_reports_recent_idx
  on public.ai_cost_reports (report_date desc);

alter table public.ai_cost_reports enable row level security;

-- No anon/authenticated policy is created deliberately: this table is reached
-- only by the service role behind the owner-gated route. Adding a read policy
-- later should be a decision someone makes on purpose.

comment on table public.ai_cost_reports is
  'Gemini daily cost REPORTS rendered at /hub/usage. Reported figures, never measured ones.';
comment on column public.ai_cost_reports.reported_cost_usd is
  'NULL means the author did not determine a figure — NOT zero spend.';
