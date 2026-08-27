'use client'

/**
 * USAGE — what the AI actually did, and what Gemini says it cost.
 *
 * THE PAGE IS BUILT AROUND ONE DISTINCTION AND EVERYTHING ELSE SERVES IT:
 * a number the database COUNTED and a number a peer REPORTED are different
 * kinds of fact. They get different columns, different labels and different
 * styling, and the page never adds them together. The day they disagree, the
 * reader has to know which one to go and chase.
 *
 * IT REFUSES TO DRAW A DASHBOARD IT CANNOT FILL. The meter records at price 0
 * by design, so there is no measured cost to show — and showing `$0.00` would
 * be a measurement of "free", which is false: these calls are billed to us.
 * Absent is the honest rendering of unknown. Likewise, when no row carries a
 * model, the breakdown says how many rows lack one instead of drawing an empty
 * chart. A surface yielding nothing must print its numbers — "6 calls, 0 with a
 * model recorded" — because silence reads as broken, and this estate has
 * already lost an investigation to a page that rendered nothing when it meant
 * "nothing met the threshold".
 *
 * EVERY FIGURE CARRIES THE MOMENT IT WAS TRUE. The route derives at request
 * time and stamps `measuredAt`, which is printed as an ABSOLUTE time. A
 * relative "x ago" computed once and cached freezes at "just now" and lies for
 * the life of the cache — the same bug this estate shipped onto ten public
 * pages under a live badge.
 */
import { useEffect, useState } from 'react'
import { Gauge, AlertCircle, Loader2, FileText, RefreshCw } from 'lucide-react'

type Bucket = { name: string; calls: number; promptTokens: number; completionTokens: number; tokensKnown: number }
type Report = {
  report_date: string; author: string; reported_cost_usd: string | number | null
  summary: string; breakdown: Record<string, unknown> | null; source: string | null; created_at: string
}
type Data = {
  windowDays: number
  measured: {
    calls: number; costKnown: boolean; costNote: string
    firstSeen: string | null; lastSeen: string | null
    withDimensions: number; withTokens: number; dimensionCoverage: number | null
    promptTokens: number; completionTokens: number
    latencyP50: number | null; latencyP95: number | null
    bySurface: Bucket[]; byModel: Bucket[]; byProvider: Bucket[]
    byDay: { date: string; calls: number }[]
  }
  reported: { available: boolean; error: string | null; reports: Report[] }
  measuredAt: string
}

const num = (n: number) => n.toLocaleString('en-US')
/** Absolute, never relative — see the header. */
const stamp = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

function Stat({ label, value, sub, unknown }: { label: string; value: string; sub?: string; unknown?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${unknown ? 'text-white/30' : 'text-white'}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] leading-snug text-white/35">{sub}</div>}
    </div>
  )
}

/** A breakdown that states its own coverage rather than implying completeness. */
function Breakdown({ title, rows, total }: { title: string; rows: Bucket[]; total: number }) {
  const real = rows.filter((r) => r.name !== 'unrecorded')
  const unrecorded = rows.find((r) => r.name === 'unrecorded')
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-[11px] uppercase tracking-wider text-white/40">{title}</h3>
      {real.length === 0 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-white/45">
          Nothing recorded a {title.toLowerCase().replace(/^by /, '')}.{' '}
          {unrecorded
            ? `All ${num(unrecorded.calls)} call${unrecorded.calls === 1 ? '' : 's'} in this window predate the dimension columns.`
            : 'No calls in this window.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {real.map((r) => (
            <li key={r.name} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate text-white/75">{r.name}</span>
              <span className="shrink-0 tabular-nums text-white/45">
                {num(r.calls)}
                {r.tokensKnown > 0 && (
                  <span className="ml-2 text-white/30">
                    {num(r.promptTokens + r.completionTokens)} tok
                  </span>
                )}
              </span>
            </li>
          ))}
          {unrecorded && (
            <li className="flex items-baseline justify-between gap-3 border-t border-white/5 pt-2 text-[13px]">
              <span className="italic text-white/35">unrecorded</span>
              <span className="tabular-nums text-white/35">{num(unrecorded.calls)}</span>
            </li>
          )}
        </ul>
      )}
      <div className="mt-3 border-t border-white/5 pt-2 text-[10px] text-white/25">
        over {num(total)} call{total === 1 ? '' : 's'} in window
      </div>
    </div>
  )
}

export default function UsageView() {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  const load = async (d: number) => {
    setLoading(true)
    setErr(null)
    try {
      const r = await fetch(`/api/hub/usage?days=${d}`, { credentials: 'same-origin' })
      const j = await r.json()
      // Show the route's own words. A generic "failed to load" is how an
      // outage hides behind a spinner.
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setData(j)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(days) }, [days])

  const m = data?.measured

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Gauge className="h-5 w-5 text-[#6EE05A]" /> Usage
          </h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-white/45">
            What the meter <span className="text-white/70">counted</span>, kept separate from what
            Gemini <span className="text-white/70">reported</span>. Counted and claimed are
            different kinds of fact and this page never adds them together.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-2.5 py-1 text-xs transition ${
                days === d ? 'bg-[#6EE05A]/12 text-[#6EE05A]' : 'text-white/45 hover:bg-white/[0.06]'
              }`}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => load(days)}
            aria-label="Refresh"
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {err && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] p-4 text-[13px] text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Could not read the meter</div>
            <div className="mt-0.5 font-mono text-[12px] text-red-200/70">{err}</div>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="mt-10 flex items-center gap-2 text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading the meter…
        </div>
      )}

      {m && (
        <>
          {/* ── MEASURED ────────────────────────────────────────────── */}
          <section className="mt-7">
            <h2 className="text-[11px] uppercase tracking-widest text-white/35">
              Measured · counted from usage_events at request time
            </h2>

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="AI calls" value={num(m.calls)} sub={`last ${data.windowDays} days`} />
              <Stat
                label="Measured cost"
                value="unknown"
                unknown
                sub="recorded at price 0 by design — not free, unpriced"
              />
              <Stat
                label="Tokens"
                value={m.withTokens ? num(m.promptTokens + m.completionTokens) : 'unknown'}
                unknown={!m.withTokens}
                sub={`${num(m.withTokens)} of ${num(m.calls)} calls reported a count`}
              />
              <Stat
                label="Latency p50 / p95"
                value={m.latencyP50 != null ? `${num(m.latencyP50)} / ${num(m.latencyP95 ?? 0)} ms` : 'unknown'}
                unknown={m.latencyP50 == null}
                sub="null where the provider reported none"
              />
            </div>

            {/* The honest empty state: print the numbers, never render silence. */}
            {m.calls > 0 && m.withDimensions === 0 && (
              <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-[13px] leading-relaxed text-amber-100/85">
                <span className="font-medium">
                  {num(m.calls)} call{m.calls === 1 ? '' : 's'} counted, {num(m.withDimensions)} with a
                  model recorded.
                </span>{' '}
                The dimension columns were applied on 2026-08-27; every row above predates them, and
                the meter caches its column probe per process, so warm serverless instances keep
                recording counts only until they cycle. Model and token breakdowns fill in from the
                next cold start — they are empty here because the data does not exist, not because
                the page failed.
              </div>
            )}

            <p className="mt-3 text-[11px] text-white/30">
              {m.calls > 0 && m.firstSeen
                ? `First call in window ${stamp(m.firstSeen)} · most recent ${stamp(m.lastSeen!)} · `
                : ''}
              measured at {stamp(data.measuredAt)}
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Breakdown title="By surface" rows={m.bySurface} total={m.calls} />
              <Breakdown title="By model" rows={m.byModel} total={m.calls} />
              <Breakdown title="By provider" rows={m.byProvider} total={m.calls} />
            </div>
          </section>

          {/* ── REPORTED ────────────────────────────────────────────── */}
          <section className="mt-9">
            <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/35">
              <FileText className="h-3.5 w-3.5" /> Reported · Gemini&rsquo;s daily cost report
            </h2>

            {!data.reported.available ? (
              <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/[0.07] p-4 text-[13px] text-red-200">
                Could not read the reports table — this is a read failure, not an empty inbox.
                <div className="mt-1 font-mono text-[12px] text-red-200/70">{data.reported.error}</div>
              </div>
            ) : data.reported.reports.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-white/12 p-5 text-[13px] leading-relaxed text-white/45">
                <span className="text-white/70">No report filed yet.</span> The table exists and is
                readable; Gemini has posted nothing to it. Reports arrive via{' '}
                <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[12px] text-white/60">
                  POST /api/hub/usage
                </code>{' '}
                with the write-only report key.
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {data.reported.reports.map((r) => (
                  <li
                    key={`${r.report_date}-${r.author}`}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-white/85">{r.report_date}</span>
                        <span className="text-[11px] text-white/35">{r.author}</span>
                      </div>
                      <span
                        className={`text-sm tabular-nums ${
                          r.reported_cost_usd == null ? 'text-white/30' : 'text-[#6EE05A]'
                        }`}
                      >
                        {r.reported_cost_usd == null
                          ? 'no figure given'
                          : `$${Number(r.reported_cost_usd).toFixed(2)} reported`}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-white/65">
                      {r.summary}
                    </p>
                    {r.breakdown && (
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-black/30 p-2.5 text-[11px] text-white/50">
                        {JSON.stringify(r.breakdown, null, 2)}
                      </pre>
                    )}
                    <div className="mt-2 text-[10px] text-white/25">
                      {/* A figure with no stated source is an opinion. */}
                      source: {r.source || 'not stated'} · filed {stamp(r.created_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
