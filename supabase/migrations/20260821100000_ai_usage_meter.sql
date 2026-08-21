-- ─────────────────────────────────────────────────────────────────────────
-- THE AI USAGE METER — DIMENSIONS, NOT A PRICE.
--
-- `usage_events` was built for billed work: a meter key, a price, a receipt to
-- be idempotent on. It records WHAT was charged. That is enough for a site build,
-- where one unit is one site and the cost is the same every time.
--
-- It is not enough for AI. Two calls to the same meter key can differ by two
-- orders of magnitude in what they cost us, and the difference is the model and
-- the token count. Recording only "one AI call happened" a hundred thousand
-- times would produce a confident average that is wrong for every real request,
-- and a price built on it would be wrong in the expensive direction for exactly
-- the heavy users who notice.
--
-- So the columns added here are the pricing inputs, and they are added BEFORE a
-- price exists rather than after. lib/billing/ai-meter.ts already records
-- counts without them and starts filling them the moment this runs, with no
-- deploy — the app probes once per cold start and adapts. That is what makes
-- this migration safe to apply late and safe to apply during traffic.
--
-- NOTHING HERE IS NOT-NULL AND NOTHING HAS A DEFAULT THAT INVENTS DATA. A call
-- whose token count we never learned stores NULL, not 0. "We do not know" and
-- "it was free" are different facts, and collapsing them biases the average
-- downward precisely where the data is weakest.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.usage_events
  -- Where the call came from — 'console.chat', 'burst.plan'. Which SURFACE
  -- generates the volume decides where a price can be attached at all; a total
  -- with no breakdown cannot answer that.
  add column if not exists surface text,
  -- The model id ACTUALLY sent to the provider, not the one the caller asked
  -- for. Those differ here routinely: the allow-list rewrites ids per transport
  -- and the fallback chain silently lands somewhere else. Storing the request
  -- would record our intent and price it as if it were what ran.
  add column if not exists model text,
  -- Which transport answered — 'groq', 'gateway', 'anthropic', 'crm_agent'.
  -- Same model, very different cost per token depending on who served it.
  add column if not exists provider text,
  -- For surfaces keyed to a signed-in person rather than an agency (the console
  -- chat, the KB answers). Text rather than a uuid FK to auth.users: this table
  -- also holds rows for platform jobs and for CRM company ids that are not
  -- Supabase users, and a FK would make those rows unrecordable.
  add column if not exists user_id text,
  add column if not exists prompt_tokens integer,
  add column if not exists completion_tokens integer,
  add column if not exists latency_ms integer;

-- The one query this table now exists to answer: "what did AI do this month?"
-- Partial on the meter key because AI rows will outnumber billed rows by orders
-- of magnitude, and an index that also covers the paid path would be paid for
-- on every settle().
create index if not exists usage_events_ai_recent_idx
  on public.usage_events (created_at desc)
  where meter_key = 'AI_CALL';

-- Reading the meter by surface and by model — the two breakdowns a price gets
-- derived from.
create index if not exists usage_events_ai_surface_idx
  on public.usage_events (surface, model)
  where meter_key = 'AI_CALL';

comment on column public.usage_events.surface is
  'Origin of the call (ai-meter). NULL on rows written before 20260821100000.';
comment on column public.usage_events.model is
  'Model id as actually sent to the provider, never the requested id.';
comment on column public.usage_events.prompt_tokens is
  'NULL means the provider did not report a count — NOT zero tokens.';
