'use client'

/**
 * Truth Dashboard — `/dashboard/admin/truth`
 *
 * Light-theme island in an otherwise dark app. Single source of truth for
 * "is this surface actually AI?" Shows green/yellow/red per add-on with the
 * exact reasons each red one is lying.
 *
 * Three vertical zones:
 *   1. Hero card — overall truth score (huge number) + green/yellow/red counts
 *   2. AI surfaces grid — the registered AI claims, sorted red→yellow→green
 *   3. Honest surfaces grid — automation/crud rows, no AI badge
 */

import { useEffect, useMemo, useState } from 'react'
import {
  RefreshCw, ShieldCheck, ShieldAlert, ShieldX, Loader2, ExternalLink,
  Sparkles, AlertTriangle, CheckCircle2, FileCode2, Activity,
} from 'lucide-react'
import { toast } from 'sonner'

interface Result {
  slug: string
  display_name: string
  category: 'ai' | 'automation' | 'crud'
  status: 'green' | 'yellow' | 'red'
  brain_wired: boolean
  groq_only: boolean
  has_outcomes: boolean
  outcomes_24h: number
  outcomes_7d: number
  success_rate: number
  reasons: string[]
  handler_paths?: string[]
  surface_route?: string
  description?: string
}

interface Summary {
  total: number
  ai_count: number
  green: number
  yellow: number
  red: number
  truth_score: number
}

export default function TruthDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [reverifying, setReverifying] = useState(false)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/truth')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'load failed')
      setSummary(json.summary)
      setResults(json.results)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed')
    } finally {
      setLoading(false)
    }
  }

  async function reverify() {
    setReverifying(true)
    try {
      const res = await fetch('/api/admin/truth', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'reverify failed')
      toast.success(`Audit saved — ${json.persisted} rows`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'failed')
    } finally {
      setReverifying(false)
    }
  }

  const aiResults = useMemo(() => {
    const order = { red: 0, yellow: 1, green: 2 } as const
    return results
      .filter((r) => r.category === 'ai')
      .sort((a, b) => order[a.status] - order[b.status])
  }, [results])

  const honestResults = useMemo(
    () => results.filter((r) => r.category !== 'ai'),
    [results]
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin · Truth Audit
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              What's actually AI right now?
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              The single source of truth for every "AI" claim in the product. Green = wired through the brain.
              Yellow = wired, no data flowing yet. Red = lying. Reasons are listed per row.
            </p>
          </div>
          <button
            onClick={reverify}
            disabled={reverifying}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] transition hover:border-slate-300 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_12px_32px_-8px_rgba(0,0,0,0.12)] disabled:opacity-50"
          >
            {reverifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Re-verify + save
          </button>
        </div>

        {/* Hero — overall score */}
        {loading ? (
          <SkeletonHero />
        ) : summary ? (
          <HeroCard summary={summary} />
        ) : null}

        {/* AI surfaces */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">AI surfaces</h2>
            <span className="text-xs text-slate-500">
              {aiResults.length} registered · {aiResults.filter((r) => r.status === 'green').length} honest
            </span>
          </div>
          {loading ? (
            <SkeletonGrid />
          ) : aiResults.length === 0 ? (
            <EmptyCard message="No AI surfaces registered." />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {aiResults.map((r) => <AddonCard key={r.slug} r={r} />)}
            </div>
          )}
        </section>

        {/* Honest non-AI surfaces */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Honest non-AI surfaces</h2>
            <span className="text-xs text-slate-500">
              {honestResults.length} registered · automation/CRUD only, no AI badge
            </span>
          </div>
          {loading ? (
            <SkeletonGrid />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {honestResults.map((r) => <HonestRow key={r.slug} r={r} />)}
            </div>
          )}
        </section>

        <p className="pt-6 text-center text-xs text-slate-400">
          Source of truth: <code className="rounded bg-slate-200/50 px-1.5 py-0.5">lib/brain/registry.ts</code> ·
          Build-time check: <code className="rounded bg-slate-200/50 px-1.5 py-0.5">npm run truth-lint</code>
        </p>
      </div>
    </div>
  )
}

// ── Hero card ───────────────────────────────────────────────────────

function HeroCard({ summary }: { summary: Summary }) {
  const score = summary.truth_score
  const ringColor =
    score >= 90 ? 'text-emerald-500' :
    score >= 60 ? 'text-amber-500' : 'text-rose-500'

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_24px_60px_-20px_rgba(0,0,0,0.10)]">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[auto_1fr]">
        <ScoreRing score={score} colorClass={ringColor} />
        <div className="flex flex-col justify-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Truth Score</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {score >= 90 ? 'Production-honest.' :
             score >= 60 ? 'Mostly honest — a few liars.' :
             'Caught lying. Refactor needed.'}
          </div>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            {summary.green} of {summary.ai_count} AI claims pass the contract.{' '}
            {summary.red > 0 && <span className="font-medium text-rose-600">{summary.red} red</span>}
            {summary.red > 0 && summary.yellow > 0 && ', '}
            {summary.yellow > 0 && <span className="font-medium text-amber-600">{summary.yellow} yellow</span>}
            {(summary.red > 0 || summary.yellow > 0) && ' need attention.'}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Pill icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Green" value={summary.green} tone="emerald" />
            <Pill icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Yellow" value={summary.yellow} tone="amber" />
            <Pill icon={<ShieldX className="h-3.5 w-3.5" />} label="Red" value={summary.red} tone="rose" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreRing({ score, colorClass }: { score: number; colorClass: string }) {
  const circ = 2 * Math.PI * 56
  const offset = circ - (score / 100) * circ
  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <svg className="h-48 w-48 -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
        <circle
          cx="64" cy="64" r="56" fill="none"
          stroke="currentColor" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className={`${colorClass} transition-[stroke-dashoffset] duration-700`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <div className={`text-5xl font-semibold tracking-tight ${colorClass}`}>{score}</div>
        <div className="text-xs font-medium uppercase tracking-wider text-slate-400">/ 100</div>
      </div>
    </div>
  )
}

function Pill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'emerald' | 'amber' | 'rose' }) {
  const map = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber:   'border-amber-200 bg-amber-50 text-amber-700',
    rose:    'border-rose-200 bg-rose-50 text-rose-700',
  } as const
  return (
    <div className={`flex items-center justify-between rounded-xl border ${map[tone]} px-3 py-2`}>
      <div className="flex items-center gap-1.5 text-xs font-medium">
        {icon} {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

// ── AI add-on card ──────────────────────────────────────────────────

function AddonCard({ r }: { r: Result }) {
  const tone =
    r.status === 'green' ? 'border-emerald-200/70 bg-white' :
    r.status === 'yellow' ? 'border-amber-200/70 bg-white' :
    'border-rose-200/70 bg-white'

  const StatusIcon =
    r.status === 'green' ? CheckCircle2 :
    r.status === 'yellow' ? AlertTriangle : ShieldX

  const statusColor =
    r.status === 'green' ? 'text-emerald-600' :
    r.status === 'yellow' ? 'text-amber-600' : 'text-rose-600'

  return (
    <div className={`group rounded-2xl border ${tone} p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.10)] transition-all hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_20px_48px_-14px_rgba(0,0,0,0.14)]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 shrink-0 ${statusColor}`} />
            <h3 className="truncate text-base font-semibold tracking-tight">{r.display_name}</h3>
          </div>
          {r.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{r.description}</p>
          )}
        </div>
        {r.surface_route && (
          <a
            href={r.surface_route}
            target="_blank" rel="noreferrer"
            className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
            title="Open surface"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <ContractCheck label="Brain wired" pass={r.brain_wired} />
        <ContractCheck label="Groq only" pass={r.groq_only} />
        <ContractCheck label="Outcomes" pass={r.has_outcomes} />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Activity className="h-3 w-3" /> 24h
        </div>
        <div className="font-mono tabular-nums text-slate-700">{r.outcomes_24h}</div>
        <div className="text-slate-300">·</div>
        <div className="text-slate-500">7d</div>
        <div className="font-mono tabular-nums text-slate-700">{r.outcomes_7d}</div>
        <div className="text-slate-300">·</div>
        <div className="text-slate-500">success</div>
        <div className="font-mono tabular-nums text-slate-700">{r.success_rate}%</div>
      </div>

      {r.reasons.length > 0 && (
        <div className="mt-3 space-y-1 rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2">
          {r.reasons.slice(0, 4).map((reason, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-rose-700">
              <span className="text-rose-400">→</span>
              <code className="break-all">{reason}</code>
            </div>
          ))}
          {r.reasons.length > 4 && (
            <div className="text-[11px] text-rose-500">+ {r.reasons.length - 4} more</div>
          )}
        </div>
      )}

      {r.handler_paths && r.handler_paths.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
          <FileCode2 className="h-3 w-3" />
          <code className="truncate">{r.handler_paths[0]}</code>
          {r.handler_paths.length > 1 && <span>+{r.handler_paths.length - 1}</span>}
        </div>
      )}
    </div>
  )
}

function ContractCheck({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md px-2 py-1.5 ${pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
      <span className="font-medium">{label}</span>
      <span className="font-mono">{pass ? '✓' : '✗'}</span>
    </div>
  )
}

// ── Honest non-AI row ──────────────────────────────────────────────

function HonestRow({ r }: { r: Result }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_6px_16px_-8px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
        <h3 className="truncate text-sm font-medium">{r.display_name}</h3>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium uppercase tracking-wider">{r.category}</span>
        {r.surface_route && <code className="truncate">{r.surface_route}</code>}
      </div>
    </div>
  )
}

// ── Skeletons / empty ──────────────────────────────────────────────

function SkeletonHero() {
  return (
    <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_24px_60px_-20px_rgba(0,0,0,0.08)]" />
  )
}
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ))}
    </div>
  )
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <Sparkles className="mx-auto mb-3 h-6 w-6 text-slate-300" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}
