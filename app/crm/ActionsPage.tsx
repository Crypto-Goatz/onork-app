'use client'

/**
 * The Actions glossary — every action, in plain English, searchable, A→Z.
 *
 * WHY A→Z AND NOT BY CATEGORY. Categories are the author's mental model; a
 * person arriving here has a word in their head ("tag", "invoice", "text") and
 * wants to find out whether it is possible. Alphabetical plus search answers
 * that in one step. The group filter is there for browsing, not as the spine.
 *
 * ACTIONS THAT DO NOT WORK ARE LISTED, NOT HIDDEN. Hiding them means people ask
 * for the same impossible thing repeatedly and never learn the way round. Each
 * one states what to do instead.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Ban, BarChart3, Check, CreditCard, FileText, Loader2, MessageSquare, Search,
  ChevronDown, Sparkles, UserPlus, Users, Wrench, X, Workflow, type LucideIcon,
} from 'lucide-react'

/** A leading icon per group — the design leads every row with one. */
const GROUP_ICON: Record<string, LucideIcon> = {
  'Contacts': UserPlus,
  'Messaging': MessageSquare,
  'Tasks & Calendar': Check,
  'Sales': BarChart3,
  'Automations': Workflow,
  'AI Agents': Sparkles,
  'Clients & Setup': Users,
  'Content & Store': FileText,
  'Reporting': BarChart3,
}
import Link from 'next/link'
import AppSidebar from './AppSidebar'

type Status = 'works' | 'not_possible' | 'not_wired' | 'needs_billing'

interface Action {
  id: string
  name: string
  what: string
  example: string | null
  group: string
  status: Status
  instead: string | null
  priceCents: number
  undocumented: boolean
}

const STATUS_META: Record<Status, { label: string; icon: typeof Check; cls: string }> = {
  works: { label: 'Works now', icon: Check, cls: 'text-[color:var(--oc-green-d)] bg-[color:var(--oc-green)]/10' },
  not_possible: { label: 'Not possible', icon: Ban, cls: 'text-[color:var(--oc-amber)] bg-[color:var(--oc-amber)]/10' },
  not_wired: { label: 'Coming soon', icon: Wrench, cls: 'text-[color:var(--oc-text)]/60 bg-black/5' },
  needs_billing: { label: 'Needs billing', icon: CreditCard, cls: 'text-[color:var(--oc-text)]/60 bg-black/5' },
}

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    fetch('/api/crm/actions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (live) setActions(Array.isArray(j.actions) ? j.actions : []) })
      .catch(() => { if (live) setErr('Could not load the actions list.') })
    return () => { live = false }
  }, [])

  const groups = useMemo(() => {
    if (!actions) return []
    return Array.from(new Set(actions.map((a) => a.group))).sort()
  }, [actions])

  const filtered = useMemo(() => {
    if (!actions) return []
    const term = q.trim().toLowerCase()
    return actions.filter((a) => {
      if (group !== 'all' && a.group !== group) return false
      if (!term) return true
      // Search the example too — people search for the thing they want to do
      // ("whitening", "Monday"), not for the name we happened to give it.
      return (
        a.name.toLowerCase().includes(term) ||
        a.what.toLowerCase().includes(term) ||
        a.id.toLowerCase().includes(term) ||
        (a.example ?? '').toLowerCase().includes(term)
      )
    })
  }, [actions, q, group])


  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <AppSidebar current="tools" activeCount={0} totalCount={0} usageLabel="$0" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="flex items-start justify-between gap-6">
            <header className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">
                Actions
              </h1>
              <p className="mt-1 max-w-md text-[13.5px] leading-relaxed text-[color:var(--oc-muted)]">
                {actions && (
                  <span className="font-medium text-[color:var(--oc-green-d)]">
                    {actions.filter((a) => a.status === 'works').length} of {actions.length}
                  </span>
                )}{' '}
                work right now. The rest are listed, never hidden.
              </p>
            </header>

            <div className="relative w-[280px] shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--oc-muted)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${actions?.length ?? 41} actions`}
                className="w-full rounded-[10px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] py-2.5 pl-9 pr-9 text-[13.5px] text-[color:var(--oc-ink)] outline-none transition placeholder:text-[color:var(--oc-muted)] focus:border-[color:var(--oc-green-d)]"
              />
              {q && (
                <button onClick={() => setQ('')} aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[color:var(--oc-muted)] transition hover:bg-[color:var(--oc-hover)]">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {['all', ...groups].map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-150 ${
                  group === g
                    ? 'border border-[color:var(--oc-green-d)]/40 bg-[color:var(--oc-green-d)]/12 text-[color:var(--oc-green-d)]'
                    : 'border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] text-[color:var(--oc-muted)] hover:border-[color:var(--oc-border)] hover:text-[color:var(--oc-ink)]'
                }`}
              >
                {g === 'all' ? 'All' : g}
              </button>
            ))}
          </div>

          {err && <p className="mt-6 text-sm text-[color:var(--oc-red)]">{err}</p>}

          {!actions && !err && (
            <div className="mt-8 flex items-center gap-2 text-sm text-[color:var(--oc-text)]/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading actions…
            </div>
          )}

          {actions && filtered.length === 0 && (
            <p className="mt-8 text-sm text-[color:var(--oc-text)]/60">
              Nothing matches “{q}”. Try a plainer word — the list is written the way you would say it.
            </p>
          )}

          {/* FLAT list, not A-Z buckets. Letter headings were my reading of the
              spec; the design overrides it — someone scanning for "tag" wants
              one continuous list, and the group chips do the sorting. */}
          <div className="mt-6 space-y-2">
            {filtered.map((a) => {
              const meta = STATUS_META[a.status]
              const Icon = meta.icon
              const Lead = GROUP_ICON[a.group] ?? Sparkles
              const open = openId === a.id
              return (
                <div
                  key={a.id}
                  className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] transition-colors duration-150 hover:border-[color:var(--oc-border)]"
                >
                  <button
                    onClick={() => setOpenId(open ? null : a.id)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    <Lead className="h-[18px] w-[18px] shrink-0 text-[color:var(--oc-muted)]" strokeWidth={2} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold text-[color:var(--oc-ink)]">
                        {a.name}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[color:var(--oc-muted)]">
                        {a.what}
                      </span>
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.cls}`}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[color:var(--oc-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {open && (
                    <div className="space-y-3 border-t border-[color:var(--oc-border)] px-4 pb-4 pt-3">
                      {a.example && (
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--oc-muted)]">
                            Say it like this
                          </div>
                          <p className="mt-1.5 rounded-lg bg-[color:var(--oc-bg)] px-3 py-2 font-mono text-[12px] leading-relaxed text-[color:var(--oc-ink)]">
                            {a.example}
                          </p>
                        </div>
                      )}
                      {a.instead && (
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--oc-amber)]">
                            Do this instead
                          </div>
                          <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]">
                            {a.instead}
                          </p>
                        </div>
                      )}
                      {a.status === 'works' && a.example && (
                        <Link
                          href={`/crm?command=${encodeURIComponent(a.example)}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--oc-green-d)] px-3 py-1.5 text-[12.5px] font-semibold text-[#0d1117] transition hover:opacity-90 active:scale-[0.98]"
                        >
                          Try it
                        </Link>
                      )}
                      <div className="font-mono text-[11px] text-[color:var(--oc-muted)]/70">{a.id}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
