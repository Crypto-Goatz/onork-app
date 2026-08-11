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
import { Search, X, Check, Ban, Wrench, CreditCard, Loader2 } from 'lucide-react'
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

  /** A→Z buckets. Built from the filtered set so headings never sit empty. */
  const buckets = useMemo(() => {
    const m = new Map<string, Action[]>()
    for (const a of filtered) {
      const letter = (a.name[0] || '#').toUpperCase()
      if (!m.has(letter)) m.set(letter, [])
      m.get(letter)!.push(a)
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <AppSidebar current="tools" activeCount={0} totalCount={0} usageLabel="$0" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <header className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">Actions</h1>
            <p className="text-sm leading-relaxed text-[color:var(--oc-text)]/70">
              Everything you can ask for, in plain English, with an example of how to say it.
              {actions ? ` ${actions.filter((a) => a.status === 'works').length} of ${actions.length} work right now.` : ''}
            </p>
          </header>

          <div className="mt-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--oc-text)]/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search actions — try “tag”, “invoice”, “text”…"
                className="w-full rounded-xl border border-[color:var(--oc-line)] bg-white py-2.5 pl-9 pr-9 text-sm text-[color:var(--oc-ink)] outline-none transition focus:border-[color:var(--oc-green)]"
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[color:var(--oc-text)]/40 transition hover:bg-black/5"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {['all', ...groups].map((g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                    group === g
                      ? 'bg-[color:var(--oc-ink)] text-white'
                      : 'border border-[color:var(--oc-line)] bg-white text-[color:var(--oc-text)]/70 hover:border-[color:var(--oc-green)]'
                  }`}
                >
                  {g === 'all' ? 'All' : g}
                </button>
              ))}
            </div>
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

          <div className="mt-8 space-y-8">
            {buckets.map(([letter, items]) => (
              <section key={letter}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--oc-text)]/40">
                  {letter}
                </h2>
                <div className="space-y-2">
                  {items.map((a) => {
                    const meta = STATUS_META[a.status]
                    const Icon = meta.icon
                    const open = openId === a.id
                    return (
                      <div
                        key={a.id}
                        className="rounded-xl border border-[color:var(--oc-line)] bg-white transition hover:border-[color:var(--oc-green)]"
                      >
                        <button
                          onClick={() => setOpenId(open ? null : a.id)}
                          className="flex w-full items-start justify-between gap-4 p-4 text-left"
                        >
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-[color:var(--oc-ink)]">{a.name}</div>
                            <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/70">{a.what}</p>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.cls}`}
                          >
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </button>

                        {open && (
                          <div className="space-y-3 border-t border-[color:var(--oc-line)] px-4 pb-4 pt-3">
                            {a.example && (
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--oc-text)]/40">
                                  Say it like this
                                </div>
                                <p className="mt-1 font-mono text-[12px] leading-relaxed text-[color:var(--oc-ink)]">
                                  {a.example}
                                </p>
                              </div>
                            )}
                            {a.instead && (
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--oc-amber)]">
                                  Do this instead
                                </div>
                                <p className="mt-1 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/70">
                                  {a.instead}
                                </p>
                              </div>
                            )}
                            <div className="font-mono text-[11px] text-[color:var(--oc-text)]/35">{a.id}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
