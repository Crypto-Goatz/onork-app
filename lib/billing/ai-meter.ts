import { createClient } from '@supabase/supabase-js'

/**
 * The AI usage meter — recording at ZERO before anything is priced.
 *
 * WHY THIS EXISTS. `usage_events` had been in production, correctly keyed and
 * sitting on top of an atomic wallet, and had never held a single row. Nobody
 * could say how many AI calls this platform makes in a day, which model they
 * land on, or what they cost — so any price put on an AI request would have
 * been invented. A price you invent is a public number you later have to walk
 * back, and walking one back costs more than launching without one.
 *
 * So this records and does not charge. `price_cents` is 0 and the status is
 * `metered`, which is deliberately NOT one of the four states the billing gate
 * uses (`pending` / `posted` / `failed` / `skipped`). A metered row has no
 * wallet charge behind it, no entitlement gate in front of it and no receipt —
 * it is an observation. Keeping it in its own status is what stops a future
 * reconciliation job from reading a week of free traffic as unpaid invoices.
 *
 * SEPARATE FROM lib/billing/gate.ts ON PURPOSE. `settle()` bills work that has
 * an approved price, an entitlement and a burst receipt to be idempotent on. An
 * AI call has none of those three, and bending settle() to accept "no receipt,
 * no entitlement, no price" would remove the checks that make the paid path
 * safe. Two paths; only one of them can move money.
 *
 * IT IS AWAITED, NOT FIRED AND FORGOTTEN. Every route here runs serverless, and
 * a floating promise after the response is returned is killed often enough that
 * the meter would under-count without ever erroring. An insert costs tens of
 * milliseconds against an AI call that costs seconds. A meter that quietly
 * loses rows is worse than no meter, because it produces a number people trust.
 *
 * IT NEVER THROWS. Metering is an observation of the work, not part of it — a
 * failed insert must never turn a good AI answer into an error for the user.
 */

/** The rows this meter records, so a query can find them without guessing. */
export const AI_METER_KEY = 'AI_CALL'

/** The status that means "counted, not charged". See the header. */
export const METERED = 'metered'

/**
 * `usage_events.company_id` is NOT NULL, and several AI surfaces genuinely have
 * no agency behind them — the console chat is keyed to a signed-in person, and
 * some background jobs belong to the platform itself.
 *
 * Rather than refuse to record those (which would bias the volume number toward
 * exactly the paths that already have billing) they are recorded under this
 * sentinel. How big this slice turns out to be is itself a pricing input: if
 * most AI traffic cannot be attributed to an agency, per-agency AI pricing is
 * not a thing that can be built yet, and it is much better to learn that from a
 * count than from a launch.
 */
export const UNATTRIBUTED = 'unattributed'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export interface AiUsage {
  /** Where the call came from — `console.chat`, `burst.plan`, `groq.report`. */
  surface: string
  /** The model id ACTUALLY sent to the provider, not the one asked for. */
  model: string
  /** Which transport answered — `groq`, `gateway`, `anthropic`, `crm_agent`. */
  provider?: string | null
  /** The agency, when the surface has one. */
  companyId?: string | null
  /** The sub-account, when the surface has one. */
  locationId?: string | null
  /** The signed-in person, for surfaces keyed to a user rather than an agency. */
  userId?: string | null
  promptTokens?: number | null
  completionTokens?: number | null
  latencyMs?: number | null
}

/**
 * Whether `usage_events` has the AI dimension columns yet.
 *
 * The columns arrive in 20260821100000_ai_usage_meter.sql, and this deploys
 * before a human can run that against the canonical project. Rather than block
 * the count on a migration, the first insert finds out: PostgREST rejects an
 * unknown column with PGRST204 *before* touching the table, so the retry cannot
 * duplicate a row. The answer is cached per process, so exactly one call per
 * cold start pays for the discovery.
 *
 * The day the migration lands, the same code starts recording tokens with no
 * deploy. undefined = not yet known.
 */
let hasDimensions: boolean | undefined

/** Drop the cached probe result. Exists for tests and for the verify script. */
export function resetDimensionProbe(): void {
  hasDimensions = undefined
}

/**
 * Record one AI call at zero cost. Returns whether a row landed, so a caller
 * that cares (the verify script) can tell, and everyone else can ignore it.
 */
export async function recordAiUsage(u: AiUsage): Promise<{ recorded: boolean; error?: string }> {
  const base = {
    company_id: u.companyId || UNATTRIBUTED,
    location_id: u.locationId || null,
    meter_key: AI_METER_KEY,
    price_cents: 0,
    quantity: 1,
    status: METERED,
  }

  const dimensions = {
    surface: u.surface,
    model: u.model,
    provider: u.provider ?? null,
    user_id: u.userId ?? null,
    prompt_tokens: u.promptTokens ?? null,
    completion_tokens: u.completionTokens ?? null,
    latency_ms: u.latencyMs ?? null,
  }

  try {
    const sb = admin()

    if (hasDimensions !== false) {
      const { error } = await sb.from('usage_events').insert({ ...base, ...dimensions })
      if (!error) {
        hasDimensions = true
        return { recorded: true }
      }
      // Any error other than "that column does not exist" is a real failure and
      // is reported as one. Retrying those without the dimensions would hide a
      // broken meter behind a row that looks fine.
      if (error.code !== 'PGRST204') {
        console.error('[ai-meter] insert failed:', error.message)
        return { recorded: false, error: error.message }
      }
      hasDimensions = false
      console.warn(
        '[ai-meter] usage_events has no AI dimension columns yet — recording counts only. ' +
          'Apply supabase/migrations/20260821100000_ai_usage_meter.sql to capture model and tokens.',
      )
    }

    const { error } = await sb.from('usage_events').insert(base)
    if (error) {
      console.error('[ai-meter] insert failed:', error.message)
      return { recorded: false, error: error.message }
    }
    return { recorded: true }
  } catch (err) {
    // Metering must never break the thing being metered.
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ai-meter] threw:', message)
    return { recorded: false, error: message }
  }
}

/**
 * Pull the OpenAI-shaped `usage` block off a chat/completions response.
 *
 * Groq, the Vercel AI Gateway and every OpenAI-compatible transport return the
 * same shape, so one reader covers all of them. Missing counts stay null rather
 * than becoming 0 — "we did not learn the token count" and "this call used no
 * tokens" are different facts, and averaging the second into a price would drag
 * the number down.
 */
export function tokensFrom(payload: unknown): { promptTokens: number | null; completionTokens: number | null } {
  const usage = (payload as { usage?: Record<string, unknown> } | null)?.usage
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return {
    // Anthropic spells the same two numbers differently.
    promptTokens: num(usage?.prompt_tokens) ?? num(usage?.input_tokens),
    completionTokens: num(usage?.completion_tokens) ?? num(usage?.output_tokens),
  }
}

export interface MeterTotal {
  key: string
  count: number
  costCents: number
}

export interface UsageSummary {
  /** First day of the current UTC month, ISO — what the totals cover. */
  since: string
  totalCents: number
  byMeter: MeterTotal[]
  /** AI only, and the numbers the price will eventually come from. */
  ai: {
    calls: number
    promptTokens: number | null
    completionTokens: number | null
    /** How many of those calls could not be tied to an agency. */
    unattributed: number
  }
}

/**
 * Month-to-date usage for one agency, plus the platform-wide AI figures.
 *
 * The AI half is deliberately NOT scoped to the agency: while the meter is free
 * the question being answered is "what does this platform actually spend on
 * models", and scoping it to whoever is looking would answer a different one.
 */
export async function usageSummary(companyId: string): Promise<UsageSummary> {
  const now = new Date()
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const empty: UsageSummary = {
    since,
    totalCents: 0,
    byMeter: [],
    ai: { calls: 0, promptTokens: null, completionTokens: null, unattributed: 0 },
  }

  try {
    const sb = admin()

    const [billed, ai] = await Promise.all([
      sb.from('usage_events')
        .select('meter_key, price_cents, quantity, status')
        .eq('company_id', companyId)
        .gte('created_at', since),
      sb.from('usage_events')
        .select('company_id')
        .eq('meter_key', AI_METER_KEY)
        .gte('created_at', since),
    ])

    if (billed.error || ai.error) {
      // A summary that cannot be read is reported as zero-and-logged rather
      // than thrown, because it decorates a dashboard rather than gating it.
      console.error('[ai-meter] summary read failed:', billed.error?.message || ai.error?.message)
      return empty
    }

    const totals = new Map<string, MeterTotal>()
    let totalCents = 0
    for (const row of billed.data ?? []) {
      // Only money that actually moved. A `pending` or `failed` row counted as
      // spend would show an agency a bill they were never charged.
      if (row.status !== 'posted') continue
      const t = totals.get(row.meter_key) ?? { key: row.meter_key, count: 0, costCents: 0 }
      t.count += row.quantity ?? 1
      t.costCents += (row.price_cents ?? 0) * (row.quantity ?? 1)
      totals.set(row.meter_key, t)
      totalCents += (row.price_cents ?? 0) * (row.quantity ?? 1)
    }

    const aiRows = ai.data ?? []
    return {
      since,
      totalCents,
      byMeter: [...totals.values()],
      ai: {
        calls: aiRows.length,
        // Token totals need the dimension columns; asked for separately below
        // so a pre-migration database still returns a usable call count.
        ...(await aiTokenTotals(since)),
        unattributed: aiRows.filter((r) => r.company_id === UNATTRIBUTED).length,
      },
    }
  } catch (err) {
    console.error('[ai-meter] summary threw:', err instanceof Error ? err.message : String(err))
    return empty
  }
}

/** Null until the dimension columns exist — never 0, which would read as "free". */
async function aiTokenTotals(since: string): Promise<{ promptTokens: number | null; completionTokens: number | null }> {
  if (hasDimensions === false) return { promptTokens: null, completionTokens: null }
  const { data, error } = await admin()
    .from('usage_events')
    .select('prompt_tokens, completion_tokens')
    .eq('meter_key', AI_METER_KEY)
    .gte('created_at', since)
  if (error) {
    if (error.code === '42703' || error.code === 'PGRST204') hasDimensions = false
    return { promptTokens: null, completionTokens: null }
  }
  const sum = (k: 'prompt_tokens' | 'completion_tokens') =>
    (data ?? []).reduce((n, r) => n + ((r as Record<string, number | null>)[k] ?? 0), 0)
  return { promptTokens: sum('prompt_tokens'), completionTokens: sum('completion_tokens') }
}
