'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, Search, X, CheckCircle2, Wrench, Clock, ArrowRight } from 'lucide-react'
import { useSso, authHeaders } from './useSso'
import AppSidebar from './AppSidebar'

/**
 * Every feature, and whether it actually works.
 *
 * CLICKING A BROKEN TOOL EXPLAINS ITSELF. The usual pattern is to grey out what
 * is unavailable, which tells someone they cannot have it and not why — so they
 * ask, or assume it is broken forever. Here a blocked tool opens and says what
 * is missing and the one action that clears it. That turns this page into the
 * first place to look rather than a wall.
 *
 * Built from /api/tools, which is generated from the registries — a
 * hand-maintained feature list drifts, and drift here means telling an agency
 * something works when it does not.
 */

type ToolState = 'ready' | 'blocked' | 'building'
interface Tool {
  key: string; name: string; group: string; what: string
  state: ToolState; reason?: string; fix?: string; href?: string; priceCents?: number
}

const STATE_UI: Record<ToolState, { label: string; chip: string; icon: typeof CheckCircle2 }> = {
  ready:    { label: 'Working',   chip: 'border-[color:var(--oc-green-d)]/35 bg-[color:var(--oc-green)]/12 text-[color:var(--oc-green-d)]', icon: CheckCircle2 },
  blocked:  { label: 'Blocked',   chip: 'border-[color:var(--oc-amber)]/40 bg-[color:var(--oc-amber)]/[0.09] text-[color:var(--oc-amber)]', icon: AlertCircle },
  building: { label: 'Building',  chip: 'border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] text-[color:var(--oc-text)]/60', icon: Clock },
}

export default function ToolsPage() {
  const sso = useSso()
  const [tools, setTools] = useState<Tool[] | null>(null)
  const [counts, setCounts] = useState({ ready: 0, blocked: 0, building: 0 })
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | ToolState>('all')
  const [open, setOpen] = useState<Tool | null>(null)

  useEffect(() => {
    if (sso.state === 'pending') return
    fetch('/api/tools', { headers: authHeaders(sso.token) })
      .then((r) => r.json())
      .then((j) => { setTools(j.tools ?? []); setCounts(j.counts ?? counts) })
      .catch(() => setTools([]))
  }, [sso.state, sso.token])

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = (tools ?? [])
      .filter((t) => (filter === 'all' ? true : t.state === filter))
      .filter((t) => (needle ? (t.name + t.what).toLowerCase().includes(needle) : true))
    const m = new Map<string, Tool[]>()
    for (const t of list) m.set(t.group, [...(m.get(t.group) ?? []), t])
    return [...m.entries()]
  }, [tools, q, filter])

  return (
    <div className="oncore-app min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[color:var(--oc-border)] bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <img src="/brand/0ncore-logo-light.png" alt="0nCORE" className="h-[26px] w-auto shrink-0 object-contain" />
        <div className="truncate text-[12px] font-medium text-[color:var(--oc-text)]/75">Tools</div>
      </header>

      <div className="flex">
        <main className="mx-auto min-w-0 max-w-4xl flex-1 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-bold text-[color:var(--oc-ink)]">Everything 0nCORE can do</h1>
              <p className="mt-0.5 text-[12.5px] text-[color:var(--oc-text)]/70">
                <span className="text-[color:var(--oc-green-d)]">{counts.ready} working</span>
                {counts.blocked > 0 && <> · <span className="text-[color:var(--oc-amber)]">{counts.blocked} blocked</span></>}
                {counts.building > 0 && <> · {counts.building} still building</>}
                {' '}· click anything to see why
              </p>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--oc-text)]/40" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a tool…" className="oc-input w-full pl-9" />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {([['all', 'All'], ['ready', 'Working'], ['blocked', 'Blocked'], ['building', 'Building']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setFilter(k)}
                className={`oc-chip border px-3 py-1.5 transition-colors ${
                  filter === k ? 'border-[color:var(--oc-green-d)] bg-[color:var(--oc-green)]/12 text-[color:var(--oc-green-d)]'
                               : 'border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)]'}`}>
                {label}
              </button>
            ))}
          </div>

          {!tools ? (
            <div className="flex items-center gap-2 py-8 text-[13px] text-[color:var(--oc-text)]/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : groups.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[color:var(--oc-text)]/60">Nothing matches that.</p>
          ) : groups.map(([group, items]) => (
            <section key={group} className="mb-5">
              <h2 className="oc-mono mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[color:var(--oc-text)]/50">{group}</h2>
              <div className="space-y-1.5">
                {items.map((t) => {
                  const ui = STATE_UI[t.state]
                  const Icon = ui.icon
                  const body = (
                    <>
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.state === 'ready' ? 'text-[color:var(--oc-green-d)]' : t.state === 'blocked' ? 'text-[color:var(--oc-amber)]' : 'text-[color:var(--oc-text)]/35'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-[color:var(--oc-ink)]">{t.name}</span>
                        <span className="block truncate text-[12px] text-[color:var(--oc-text)]/65">{t.what}</span>
                      </span>
                      {!!t.priceCents && <span className="oc-mono shrink-0 text-[11px] text-[color:var(--oc-text)]/55">${(t.priceCents / 100).toFixed(2)}</span>}
                      <span className={`oc-chip shrink-0 border px-2 py-0.5 text-[10.5px] ${ui.chip}`}>{ui.label}</span>
                    </>
                  )
                  // Working tools go somewhere. Everything else opens and explains.
                  return t.state === 'ready' && t.href ? (
                    <Link key={t.key} href={t.href}
                      className="flex w-full items-start gap-3 rounded-[12px] border border-[color:var(--oc-border)] bg-white px-3.5 py-2.5 text-left transition-colors hover:border-[color:var(--oc-green-d)]">
                      {body}
                    </Link>
                  ) : (
                    <button key={t.key} type="button" onClick={() => setOpen(t)}
                      className="flex w-full items-start gap-3 rounded-[12px] border border-[color:var(--oc-border)] bg-white px-3.5 py-2.5 text-left transition-colors hover:border-[color:var(--oc-green-d)]">
                      {body}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </main>

        <AppSidebar current="tools" activeCount={0} totalCount={0} usageLabel="$0" />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[2px] sm:items-center sm:p-6"
          onClick={() => setOpen(null)} role="presentation">
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
            className="w-full max-w-lg rounded-t-[20px] border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] p-5 shadow-xl sm:rounded-[20px]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[17px] font-bold text-[color:var(--oc-ink)]">{open.name}</h3>
                <span className={`oc-chip mt-1.5 inline-block border px-2 py-0.5 text-[10.5px] ${STATE_UI[open.state].chip}`}>
                  {STATE_UI[open.state].label}
                </span>
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[13px] leading-relaxed text-[color:var(--oc-text)]/85">{open.what}</p>

            {open.reason && (
              <div className="mt-3 rounded-[12px] border border-[color:var(--oc-amber)]/40 bg-[color:var(--oc-amber)]/[0.07] p-3.5">
                <div className="oc-mono mb-1 text-[10px] font-bold uppercase tracking-[.12em] text-[color:var(--oc-amber)]">Why it is not working</div>
                <p className="text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/85">{open.reason}</p>
              </div>
            )}

            {open.fix && (
              <div className="mt-2.5 rounded-[12px] border border-[color:var(--oc-border)] bg-white p-3.5">
                <div className="oc-mono mb-1 text-[10px] font-bold uppercase tracking-[.12em] text-[color:var(--oc-green-d)]">What clears it</div>
                <p className="text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/85">{open.fix}</p>
              </div>
            )}

            <Link href="/log" onClick={() => setOpen(null)}
              className="oc-chip mt-3 inline-flex items-center gap-1.5 border border-[color:var(--oc-border)] bg-white px-3 py-2 text-[color:var(--oc-text)] transition-colors hover:border-[color:var(--oc-green-d)]">
              <Wrench className="h-3.5 w-3.5" /> Run the system check <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
