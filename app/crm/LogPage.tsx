'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, AlertCircle, CheckCircle2, XCircle, MinusCircle, Clock,
  Stethoscope, ScrollText, RefreshCw, ChevronDown,
} from 'lucide-react'
import { useSso, authHeaders } from './useSso'
import AppSidebar from './AppSidebar'

/**
 * History and diagnostics — the built-in debugger.
 *
 * TWO HALVES that answer different questions. The log answers "what happened
 * and why did it fail"; the tester answers "is the plumbing sound right now".
 * A failure in the log with a green board means a data problem; a red board
 * means everything downstream is suspect. Together they locate a fault without
 * a shell.
 *
 * RAW ERRORS ARE KEPT, behind a disclosure. The readable line is for scanning,
 * the raw line is what actually identifies a bug — hiding it entirely to keep
 * the page tidy would defeat the reason the page exists.
 */

type Result = 'ok' | 'failed' | 'refused' | 'waiting'
interface Entry { at: string; source: string; what: string; result: Result; why?: string; raw?: string; client?: string | null }
interface Check { id: string; area: string; what: string; state: 'pass' | 'fail' | 'warn' | 'skip'; detail: string; fix?: string }

const RESULT_UI: Record<Result, { icon: typeof CheckCircle2; tone: string; label: string }> = {
  ok:      { icon: CheckCircle2, tone: 'text-[color:var(--oc-green-d)]', label: 'worked' },
  failed:  { icon: XCircle,      tone: 'text-[color:var(--oc-red)]',     label: 'failed' },
  refused: { icon: MinusCircle,  tone: 'text-[color:var(--oc-amber)]',   label: 'refused' },
  waiting: { icon: Clock,        tone: 'text-[color:var(--oc-text)]/50', label: 'no answer' },
}

const when = (iso: string) => {
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function LogPage() {
  const sso = useSso()
  const [tab, setTab] = useState<'history' | 'tester'>('history')
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [checks, setChecks] = useState<{ checks: Check[]; headline: string; summary: { failed: number; warned: number; passed: number } } | null>(null)
  const [only, setOnly] = useState<'all' | 'problems'>('problems')
  const [busy, setBusy] = useState(false)

  const load = () => {
    if (sso.state === 'pending') return
    setBusy(true)
    const h = { headers: authHeaders(sso.token) }
    Promise.all([
      fetch('/api/log', h).then((r) => r.json()).then((j) => setEntries(j.entries ?? [])).catch(() => setEntries([])),
      fetch('/api/diagnostics', h).then((r) => r.json()).then((j) => (j?.checks ? setChecks(j) : null)).catch(() => {}),
    ]).finally(() => setBusy(false))
  }
  useEffect(load, [sso.state, sso.token])

  const shown = (entries ?? []).filter((e) => (only === 'all' ? true : e.result !== 'ok'))

  return (
    <div className="oncore-app min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[color:var(--oc-border)] bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <img src="/brand/0ncore-logo-light.png" alt="0nCORE" className="h-[26px] w-auto shrink-0 object-contain" />
        <div className="truncate text-[12px] font-medium text-[color:var(--oc-text)]/75">History &amp; diagnostics</div>
        <button type="button" onClick={load} disabled={busy}
          className="oc-chip ml-auto inline-flex items-center gap-1.5 border border-[color:var(--oc-border)] bg-white px-2.5 py-1.5 text-[color:var(--oc-text)] transition-colors hover:border-[color:var(--oc-green-d)]">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Re-run
        </button>
      </header>

      <div className="flex">
        <main className="mx-auto min-w-0 max-w-4xl flex-1 p-4 sm:p-6">
          <div className="mb-4 flex gap-1.5">
            {([['history', 'History', ScrollText], ['tester', 'System check', Stethoscope]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" onClick={() => setTab(k)}
                className={`oc-chip inline-flex items-center gap-1.5 border px-3 py-2 transition-colors ${
                  tab === k ? 'border-[color:var(--oc-green-d)] bg-[color:var(--oc-green)]/12 text-[color:var(--oc-green-d)]'
                            : 'border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)]'}`}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {tab === 'tester' ? (
            !checks ? <Loading /> : (
              <div className="space-y-3">
                <div className={`oc-card p-4 ${checks.summary.failed ? 'border-l-4 border-l-[color:var(--oc-red)]' : checks.summary.warned ? 'border-l-4 border-l-[color:var(--oc-amber)]' : 'border-l-4 border-l-[color:var(--oc-green-d)]'}`}>
                  <h2 className="text-[16px] font-bold text-[color:var(--oc-ink)]">{checks.headline}</h2>
                  <p className="oc-mono mt-1 text-[11px] text-[color:var(--oc-text)]/60">
                    {checks.summary.passed} passed · {checks.summary.warned} need attention · {checks.summary.failed} broken
                  </p>
                </div>
                {checks.checks.map((c) => {
                  const tone = c.state === 'pass' ? 'text-[color:var(--oc-green-d)]'
                    : c.state === 'fail' ? 'text-[color:var(--oc-red)]'
                    : c.state === 'warn' ? 'text-[color:var(--oc-amber)]' : 'text-[color:var(--oc-text)]/40'
                  const Icon = c.state === 'pass' ? CheckCircle2 : c.state === 'fail' ? XCircle : c.state === 'warn' ? AlertCircle : MinusCircle
                  return (
                    <div key={c.id} className="flex items-start gap-3 rounded-[14px] border border-[color:var(--oc-border)] bg-white p-3.5">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-[13.5px] font-semibold text-[color:var(--oc-ink)]">{c.what}</span>
                          <span className="oc-mono text-[10px] uppercase tracking-[.1em] text-[color:var(--oc-text)]/45">{c.area}</span>
                        </div>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/80">{c.detail}</p>
                        {c.fix && (
                          <p className="mt-1.5 text-[12px] leading-relaxed text-[color:var(--oc-green-d)]">
                            <b>Fix:</b> {c.fix}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  {([['problems', 'Problems only'], ['all', 'Everything']] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setOnly(k)}
                      className={`oc-chip border px-3 py-1.5 transition-colors ${
                        only === k ? 'border-[color:var(--oc-green-d)] bg-[color:var(--oc-green)]/12 text-[color:var(--oc-green-d)]'
                                   : 'border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)]'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <span className="oc-mono text-[10.5px] text-[color:var(--oc-text)]/50">{shown.length} entries</span>
              </div>

              {!entries ? <Loading /> : shown.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-[color:var(--oc-border)] p-6 text-center text-[13px] text-[color:var(--oc-text)]/65">
                  {only === 'problems' ? 'Nothing has failed. Switch to Everything to see what ran.' : 'Nothing has run yet.'}
                </div>
              ) : shown.map((e, i) => {
                const ui = RESULT_UI[e.result]
                const Icon = ui.icon
                return (
                  <div key={i} className="rounded-[14px] border border-[color:var(--oc-border)] bg-white p-3.5">
                    <div className="flex items-start gap-3">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ui.tone}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-[13.5px] font-semibold text-[color:var(--oc-ink)]">{e.what}</span>
                          <span className={`oc-mono text-[10px] uppercase tracking-[.1em] ${ui.tone}`}>{ui.label}</span>
                        </div>
                        <div className="oc-mono mt-0.5 text-[10.5px] text-[color:var(--oc-text)]/50">
                          {e.source}{e.client ? ` · ${e.client}` : ''} · {when(e.at)}
                        </div>
                        {e.why && <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/80">{e.why}</p>}
                        {/* The raw error is what actually identifies a bug. */}
                        {e.raw && (
                          <details className="mt-1.5">
                            <summary className="oc-mono inline-flex cursor-pointer list-none items-center gap-1 text-[10.5px] text-[color:var(--oc-text)]/50 marker:hidden">
                              <ChevronDown className="h-3 w-3" /> technical detail
                            </summary>
                            <pre className="oc-mono mt-1.5 overflow-x-auto rounded-[10px] bg-[color:var(--oc-bg)] p-2.5 text-[10.5px] leading-relaxed text-[color:var(--oc-text)]/75">{e.raw}</pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>

        <AppSidebar current="log" activeCount={0} totalCount={0} usageLabel="$0" />
      </div>
    </div>
  )
}

function Loading() {
  return <div className="flex items-center gap-2 py-8 text-[13px] text-[color:var(--oc-text)]/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
}
