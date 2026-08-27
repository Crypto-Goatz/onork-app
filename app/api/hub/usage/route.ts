/**
 * /api/hub/usage — what AI cost, in two clearly separated kinds of fact.
 *
 * THE WHOLE DESIGN IS THE SEPARATION. This route returns `measured` and
 * `reported` as distinct objects and never adds them together:
 *
 *   measured — derived from `usage_events` AT REQUEST TIME. Nothing is cached
 *              and no total is stored, because a stored total is a number that
 *              keeps being served long after it stopped being true. This estate
 *              published "Last shipped 62d ago" under a live badge for two
 *              months doing exactly that.
 *   reported — what Gemini wrote in `ai_cost_reports`. A figure a peer typed.
 *
 * A dashboard that renders both in the same style teaches the reader that a
 * counted number and a claimed number are equally reliable. They are not, and
 * the day they disagree the reader needs to know which one to chase.
 *
 * THE METER CANNOT PRICE ITSELF YET, AND SAYS SO. `usage_events.price_cents` is
 * 0 on every AI row by design (lib/billing/ai-meter.ts records at zero rather
 * than inventing a price). So `measured.costUsd` is deliberately absent — not
 * zero. Reporting 0 would be a measurement of "free", which is false: those
 * calls are billed to us. `costKnown: false` is the honest shape, and it is why
 * Gemini's reported figure has a job to do at all.
 *
 * DIMENSIONS MAY BE NULL AND THAT IS REPORTED, NOT HIDDEN. The dimension
 * columns arrived in a migration applied after rows already existed, so early
 * rows carry no model and no tokens. `withDimensions` counts how many rows can
 * actually answer the model/token questions, so a breakdown over 3 of 400 rows
 * cannot masquerade as a breakdown over all of them.
 */
import { NextRequest, NextResponse } from 'next/server'
import { isOwner } from '@/lib/owner'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AI_METER_KEY = 'AI_CALL'

type Row = {
  created_at: string
  surface: string | null
  model: string | null
  provider: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  latency_ms: number | null
}

/** Group rows by a nullable dimension, keeping "unknown" visible as its own bucket. */
function tally(rows: Row[], key: 'surface' | 'model' | 'provider') {
  const by = new Map<string, { name: string; calls: number; promptTokens: number; completionTokens: number; tokensKnown: number }>()
  for (const r of rows) {
    const name = r[key] ?? 'unrecorded'
    const cur = by.get(name) ?? { name, calls: 0, promptTokens: 0, completionTokens: 0, tokensKnown: 0 }
    cur.calls++
    // Sum only what was actually reported. A null token count adds nothing and
    // increments no denominator — averaging over it would invent data.
    if (r.prompt_tokens != null || r.completion_tokens != null) {
      cur.promptTokens += r.prompt_tokens ?? 0
      cur.completionTokens += r.completion_tokens ?? 0
      cur.tokensKnown++
    }
    by.set(name, cur)
  }
  return [...by.values()].sort((a, b) => b.calls - a.calls)
}

export async function GET(req: NextRequest) {
  // 404, not 403 — matches /api/hub/room. An unauthorised visitor learns nothing.
  if (!(await isOwner())) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days') ?? 30), 1), 365)
  const since = new Date(Date.now() - days * 86400_000).toISOString()

  const { data, error } = await db
    .from('usage_events')
    .select('created_at,surface,model,provider,prompt_tokens,completion_tokens,latency_ms')
    .eq('meter_key', AI_METER_KEY)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000)

  // Say the platform's own words. A generic string here is how an outage hides.
  if (error) {
    return NextResponse.json(
      { error: `usage_events read failed: ${error.message}`, code: error.code ?? null },
      { status: 502 },
    )
  }

  const rows = (data ?? []) as Row[]

  // Per-day call counts, with days that had no calls present as zero rather
  // than absent — a sparse series drawn as a line invents activity between points.
  const byDay = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    byDay.set(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10), 0)
  }
  for (const r of rows) {
    const d = r.created_at.slice(0, 10)
    if (byDay.has(d)) byDay.set(d, (byDay.get(d) ?? 0) + 1)
  }

  const latencies = rows.map((r) => r.latency_ms).filter((n): n is number => n != null).sort((a, b) => a - b)
  const withDimensions = rows.filter((r) => r.model != null).length
  const withTokens = rows.filter((r) => r.prompt_tokens != null || r.completion_tokens != null).length

  const { data: reports, error: repErr } = await db
    .from('ai_cost_reports')
    .select('report_date,author,reported_cost_usd,summary,breakdown,source,created_at')
    .order('report_date', { ascending: false })
    .limit(30)

  return NextResponse.json({
    windowDays: days,
    measured: {
      calls: rows.length,
      // Absent, not zero. See the header — the meter records at price 0 by
      // design, so any cost here would be a fabrication.
      costKnown: false,
      costNote:
        'The meter records AI calls at price 0 by design and no per-model rate card exists yet, so measured cost is UNKNOWN — not zero. These calls are billed to us.',
      firstSeen: rows.length ? rows[rows.length - 1].created_at : null,
      lastSeen: rows.length ? rows[0].created_at : null,
      withDimensions,
      withTokens,
      // The denominator that stops a breakdown over a handful of rows from
      // reading as a breakdown over all of them.
      dimensionCoverage: rows.length ? Math.round((withDimensions / rows.length) * 100) : null,
      promptTokens: rows.reduce((a, r) => a + (r.prompt_tokens ?? 0), 0),
      completionTokens: rows.reduce((a, r) => a + (r.completion_tokens ?? 0), 0),
      latencyP50: latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : null,
      latencyP95: latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : null,
      bySurface: tally(rows, 'surface'),
      byModel: tally(rows, 'model'),
      byProvider: tally(rows, 'provider'),
      byDay: [...byDay.entries()].map(([date, calls]) => ({ date, calls })),
    },
    reported: {
      // A read failure here must not masquerade as "Gemini filed nothing".
      available: !repErr,
      error: repErr ? repErr.message : null,
      reports: reports ?? [],
    },
    measuredAt: new Date().toISOString(),
  })
}

/**
 * POST — Gemini files the daily cost report.
 *
 * A WRITE-ONLY BEARER KEY, NOT AN ACCOUNT TOKEN. A shipped plugin in this
 * estate printed a `0n_` account token into public page source, where it
 * returned identity, tier and add-ons across every product. The lesson is that
 * a credential's blast radius should match its job: `USAGE_REPORT_KEY` files a
 * cost report and can do nothing else — it cannot read the room, the meter, or
 * anything in this route's GET.
 *
 * IT REFUSES TO RUN UNCONFIGURED. If the variable is unset the route 503s
 * rather than accepting anonymous writes, because a missing secret that
 * degrades to "allow" is the failure this estate has already paid for.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.USAGE_REPORT_KEY
  if (!expected) {
    return NextResponse.json(
      { error: 'USAGE_REPORT_KEY is not configured on this deployment; refusing to accept unauthenticated reports.' },
      { status: 503 },
    )
  }

  const presented = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  // Length check first so the comparison below cannot be used as a length oracle.
  if (presented.length !== expected.length || presented !== expected) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 })
  }

  const summary = typeof body.summary === 'string' ? body.summary.trim() : ''
  if (!summary) {
    return NextResponse.json({ error: 'summary is required — a report with no words is not a report.' }, { status: 400 })
  }

  const reportDate =
    typeof body.report_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.report_date)
      ? body.report_date
      : new Date().toISOString().slice(0, 10)

  // undefined stays NULL. "Could not determine" and "zero" must not collapse.
  const cost =
    body.reported_cost_usd === null || body.reported_cost_usd === undefined
      ? null
      : Number(body.reported_cost_usd)
  if (cost !== null && !Number.isFinite(cost)) {
    return NextResponse.json({ error: 'reported_cost_usd must be a number or null.' }, { status: 400 })
  }

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  // Upsert on (report_date, author): re-filing corrects the day rather than
  // leaving the page to choose between two reports about the same date.
  const { data, error } = await db
    .from('ai_cost_reports')
    .upsert(
      {
        report_date: reportDate,
        author: typeof body.author === 'string' && body.author.trim() ? body.author.trim() : 'Gemini',
        reported_cost_usd: cost,
        summary,
        breakdown: body.breakdown ?? null,
        source: typeof body.source === 'string' ? body.source : null,
      },
      { onConflict: 'report_date,author' },
    )
    .select('id,report_date,author')
    .single()

  // Assert on the row, not the receipt: a 201 with nothing stored is the
  // failure mode this estate has hit three times in one day.
  if (error || !data) {
    return NextResponse.json(
      { error: `report not stored: ${error?.message ?? 'no row returned'}` },
      { status: 502 },
    )
  }

  return NextResponse.json({ stored: true, ...data })
}
