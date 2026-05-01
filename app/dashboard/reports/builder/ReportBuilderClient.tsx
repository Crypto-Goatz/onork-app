'use client'

/**
 * Ultimate Report Builder — client UI.
 *
 * Single screen: URL input, scanner checkboxes grouped by category, run
 * button, live results panel that streams in as scanners complete.
 *
 * Designed to feel like the marketplace page (AnimatedGrid + green/cyan/violet
 * gradient + dark glass panels) so it slots into the rest of 0ncore visually.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react'
import { SCANNERS } from '@/lib/scanners/registry'
import type { ScannerSlug, ReportResult, ScanOutput } from '@/lib/scanners/types'
import type { CrmStackResult } from '@/lib/scanners/crm-stack'

const CATEGORY_LABEL: Record<string, string> = {
  stack: 'Stack Detection',
  sxo: 'SXO',
  technical: 'Technical',
  content: 'Content',
  competitive: 'Competitive',
}

const TIER_PILL: Record<string, { label: string; class: string }> = {
  free: { label: 'Free', class: 'bg-white/10 text-white/70' },
  pro: { label: 'Pro', class: 'bg-[#7ed957]/15 text-[#7ed957]' },
  agency: { label: 'Agency', class: 'bg-[#a78bfa]/15 text-[#a78bfa]' },
}

const STATUS_PILL: Record<string, { label: string; class: string }> = {
  live: { label: 'Live', class: 'text-[#22c55e]' },
  beta: { label: 'Beta', class: 'text-[#f59e0b]' },
  planned: { label: 'Planned', class: 'text-white/30' },
}

const STORAGE_KEY = 'znwp:reports:selected'

export default function ReportBuilderClient() {
  const [url, setUrl] = useState('')
  const [selected, setSelected] = useState<ScannerSlug[]>([])
  const [running, setRunning] = useState(false)
  const [report, setReport] = useState<ReportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Persist selection between visits — most operators run the same combo.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ScannerSlug[]
      if (saved.length) {
        setSelected(saved)
      } else {
        // Default selection: every live scanner that's free or beta.
        setSelected(
          SCANNERS.filter((s) => s.status === 'live' || s.status === 'beta').map(
            (s) => s.slug,
          ),
        )
      }
    } catch {
      // ignore
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected))
    } catch {
      // ignore
    }
  }, [selected])

  const grouped = useMemo(() => {
    const out: Record<string, typeof SCANNERS> = {}
    SCANNERS.forEach((s) => {
      if (!out[s.category]) out[s.category] = []
      out[s.category].push(s)
    })
    return out
  }, [])

  const totalEstimateSeconds = useMemo(
    () =>
      selected.reduce((sum, slug) => {
        const meta = SCANNERS.find((s) => s.slug === slug)
        return sum + (meta?.estimated_seconds ?? 0)
      }, 0),
    [selected],
  )

  function toggle(slug: ScannerSlug, status: string) {
    if (status === 'planned') return
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    )
  }

  function selectAll() {
    setSelected(SCANNERS.filter((s) => s.status !== 'planned').map((s) => s.slug))
  }
  function selectNone() {
    setSelected([])
  }
  function selectCrmFocus() {
    setSelected(['crm_stack', 'tech_stack', 'sxo_living_dom', 'security_headers'])
  }

  async function runReport() {
    if (!url.trim() || selected.length === 0) return
    setRunning(true)
    setError(null)
    setReport(null)
    try {
      const res = await fetch('/api/reports/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), scanners: selected }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || `Report failed (${res.status})`)
      } else {
        setReport(json as ReportResult)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#020810] text-white">
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[#7ed957]/[0.06] blur-[140px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/30 bg-[#7ed957]/8 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#7ed957]">
            <Sparkles className="h-3 w-3" />
            Ultimate Report Builder
          </div>
          <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-br from-[#7ed957] via-[#00d4ff] to-[#a78bfa] bg-clip-text text-transparent">
              Run any report. Any URL. On demand.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/65 sm:text-lg">
            Pick the scanners you want, hit run, and get a full multi-layer report in seconds. Built
            for sales calls, audits, comp scans, and gift-scans for new customers.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {/* URL input row */}
        <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur sm:flex-row sm:items-center">
          <Search className="hidden h-5 w-5 text-white/40 sm:block" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-base text-white outline-none focus:border-[#7ed957]/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter') runReport()
            }}
          />
          <button
            disabled={!url.trim() || selected.length === 0 || running}
            onClick={runReport}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ed957] px-6 py-3 text-sm font-bold text-[#020810] shadow-[0_0_24px_rgba(126,217,87,0.3)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running…
              </>
            ) : (
              <>
                Run report
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Quick-select bar */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-white/40">Quick select:</span>
          <button
            onClick={selectAll}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 hover:border-[#7ed957]/40 hover:text-[#7ed957]"
          >
            Everything available
          </button>
          <button
            onClick={selectCrmFocus}
            className="rounded-full border border-[#7ed957]/30 bg-[#7ed957]/10 px-3 py-1 text-[#7ed957] hover:bg-[#7ed957]/20"
          >
            <Database className="-mt-0.5 mr-1 inline h-3 w-3" />
            CRM-focused (sales call)
          </button>
          <button
            onClick={selectNone}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 hover:border-white/30"
          >
            None
          </button>
          <span className="ml-auto text-white/45">
            {selected.length} selected · ~{totalEstimateSeconds}s total
          </span>
        </div>

        {/* Scanner grid */}
        <div className="mb-12 grid gap-6 lg:grid-cols-2">
          {Object.entries(grouped).map(([cat, list]) => (
            <div
              key={cat}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/65">
                  {CATEGORY_LABEL[cat] ?? cat}
                </h2>
                <span className="font-mono text-[10px] text-white/30">
                  {list.filter((s) => selected.includes(s.slug)).length} / {list.length}
                </span>
              </div>
              <div className="space-y-2">
                {list.map((s) => {
                  const checked = selected.includes(s.slug)
                  const disabled = s.status === 'planned'
                  return (
                    <label
                      key={s.slug}
                      className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                        disabled
                          ? 'cursor-not-allowed border-white/[0.04] bg-white/[0.01] opacity-50'
                          : checked
                          ? 'border-[#7ed957]/40 bg-[#7ed957]/[0.05]'
                          : 'border-white/[0.06] bg-white/[0.01] hover:border-white/[0.18]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(s.slug, s.status)}
                        className="mt-1 h-4 w-4 cursor-pointer accent-[#7ed957]"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">{s.name}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${TIER_PILL[s.tier].class}`}
                          >
                            {TIER_PILL[s.tier].label}
                          </span>
                          <span
                            className={`font-mono text-[9px] uppercase tracking-widest ${STATUS_PILL[s.status].class}`}
                          >
                            ● {STATUS_PILL[s.status].label}
                          </span>
                          {s.requires && s.requires.length > 0 && (
                            <span className="font-mono text-[9px] text-white/40">
                              needs {s.requires.join(', ')}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-white/55">
                          {s.description}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-white/30">
                          ~{s.estimated_seconds}s
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Results */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.05] p-4 text-sm text-red-300">
            <ShieldAlert className="h-5 w-5" />
            {error}
          </div>
        )}

        {report && <ReportResultPanel report={report} />}
      </section>
    </main>
  )
}

// ━━━ Result Panel ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ReportResultPanel({ report }: { report: ReportResult }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur">
        <h2 className="text-lg font-bold">Report for</h2>
        <a
          href={report.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[#7ed957] hover:underline"
        >
          {report.domain}
        </a>
        <span className="ml-auto font-mono text-xs text-white/45">
          <Clock className="-mt-0.5 mr-1 inline h-3 w-3" />
          {report.duration_ms}ms · {report.results.filter((r) => r.ok).length}/
          {report.results.length} ok
          {report.composite_score !== undefined && (
            <span className="ml-3 text-white/65">
              · composite{' '}
              <span className="font-bold text-[#7ed957]">{report.composite_score}/100</span>
            </span>
          )}
        </span>
      </div>

      {report.results.map((r) => (
        <ScanOutputCard key={r.scanner} output={r} />
      ))}
    </div>
  )
}

function ScanOutputCard({ output }: { output: ScanOutput }) {
  const meta = SCANNERS.find((s) => s.slug === output.scanner)
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        {output.ok ? (
          <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
        ) : (
          <XCircle className="h-5 w-5 text-red-400" />
        )}
        <h3 className="text-base font-bold text-white">{meta?.name ?? output.scanner}</h3>
        <span className="ml-auto font-mono text-[10px] text-white/30">
          {output.duration_ms}ms{output.score !== undefined && ` · ${output.score}/100`}
        </span>
      </div>

      {output.summary && (
        <p className="mb-4 text-sm leading-relaxed text-white/75">{output.summary}</p>
      )}

      {!output.ok && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/[0.05] p-3 text-sm text-red-300">
          {output.error || 'Unknown error'}
        </p>
      )}

      {output.ok && output.scanner === 'crm_stack' && output.data != null ? (
        <CrmStackPanel data={output.data as CrmStackResult} />
      ) : null}

      {output.ok &&
        output.scanner !== 'crm_stack' &&
        output.data !== undefined && (
          <details className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.01] p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-white/45">
              Raw output
            </summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre text-[11px] text-white/65">
              {JSON.stringify(output.data, null, 2)}
            </pre>
          </details>
        )}
    </div>
  )
}

const VENDOR_CATEGORY_LABEL: Record<string, string> = {
  crm: 'CRM',
  email_marketing: 'Email Marketing',
  marketing_automation: 'Marketing Automation',
  analytics: 'Analytics',
  tag_manager: 'Tag Manager',
  ad_pixel: 'Ad Pixel',
  live_chat: 'Live Chat',
  support_desk: 'Support Desk',
  booking: 'Booking',
  payments: 'Payments',
  forms: 'Forms',
  reviews: 'Reviews',
  a_b_testing: 'A/B Testing',
  session_replay: 'Session Replay',
  consent_mgmt: 'Consent / Privacy',
  cdn: 'CDN / Hosting',
  cms: 'CMS',
  ecommerce: 'eCommerce',
  unknown: 'Unknown',
}

function CrmStackPanel({ data }: { data: CrmStackResult }) {
  const grouped: Record<string, CrmStackResult['vendors']> = {}
  data.vendors.forEach((v) => {
    if (!grouped[v.category]) grouped[v.category] = []
    grouped[v.category].push(v)
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total tools" value={data.total_vendors.toString()} accent="brand" />
        <Stat
          label="CRM detected"
          value={data.has_crm ? 'Yes' : 'No'}
          accent={data.has_crm ? 'green' : 'red'}
        />
        <Stat
          label="Analytics"
          value={data.has_analytics ? 'Yes' : 'No'}
          accent={data.has_analytics ? 'green' : 'red'}
        />
        <Stat
          label="Tag manager"
          value={data.has_tag_manager ? 'Yes' : 'No'}
          accent={data.has_tag_manager ? 'green' : 'amber'}
        />
      </div>

      {Object.keys(grouped).length > 0 && (
        <div className="space-y-3">
          {Object.entries(grouped).map(([cat, vendors]) => (
            <div
              key={cat}
              className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/45">
                  {VENDOR_CATEGORY_LABEL[cat] ?? cat}
                </span>
                <span className="font-mono text-[10px] text-white/30">
                  {vendors.length} {vendors.length === 1 ? 'tool' : 'tools'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {vendors.map((v) => (
                  <span
                    key={v.vendor}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {v.vendor}
                    <span className="font-mono text-[9px] text-white/40">{v.confidence}%</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {data.gaps.length > 0 && (
        <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/[0.05] p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#f59e0b]">
            <Zap className="h-3 w-3" />
            Sales angles · {data.gaps.length}
          </div>
          <ul className="space-y-1 text-sm text-white/75">
            {data.gaps.map((g) => (
              <li key={g} className="flex gap-2">
                <span className="text-[#f59e0b]">→</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type StatAccent = 'green' | 'red' | 'amber' | 'brand'
function Stat({ label, value, accent }: { label: string; value: string; accent: StatAccent }) {
  const colorClass: Record<StatAccent, string> = {
    green: 'text-[#22c55e]',
    red: 'text-[#ef4444]',
    amber: 'text-[#f59e0b]',
    brand: 'text-[#7ed957]',
  }
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">{label}</div>
      <div className={`mt-1 text-xl font-black tabular-nums ${colorClass[accent]}`}>{value}</div>
    </div>
  )
}
