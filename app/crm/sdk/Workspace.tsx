'use client'

/**
 * The shell every SDK page (Contacts · Tasks · Calendar · Forms) sits in.
 *
 * It answers the one question those pages share — WHICH CRM account — once:
 * the accounts this person connected (/api/crm/my-locations, owner-checked
 * again by the proxy on every call), remembered per browser. The page body
 * only renders once an account is chosen, so no page ever fires a CRM call
 * against "whatever the default happened to be".
 */
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { Loader2, Plug } from 'lucide-react'
import AppSidebar, { type NavKey } from '../AppSidebar'
import { setSdkLocation } from '@/lib/crm/sdk'

interface Loc { id: string; name: string; isDefault: boolean }
const KEY = 'oc.sdk.location'

export default function Workspace({
  nav, title, blurb, actions, children,
}: {
  nav: NavKey
  title: string
  blurb: string
  actions?: ReactNode | ((locationId: string) => ReactNode)
  children: (locationId: string) => ReactNode
}) {
  const [locs, setLocs] = useState<Loc[] | null>(null)
  const [err, setErr] = useState('')
  const [loc, setLoc] = useState('')

  useEffect(() => {
    fetch('/api/crm/my-locations', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (r.status === 401) { window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`; return }
        if (!r.ok) throw new Error(d.error || `Could not load your CRM accounts (${r.status})`)
        const list: Loc[] = d.locations || []
        let saved = ''
        try { saved = localStorage.getItem(KEY) || '' } catch { /* private mode */ }
        const pick = list.find((l) => l.id === saved)?.id || d.defaultId || list[0]?.id || ''
        setSdkLocation(pick)
        setLocs(list)
        setLoc(pick)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
  }, [])

  const choose = (id: string) => {
    setSdkLocation(id)
    setLoc(id)
    try { localStorage.setItem(KEY, id) } catch { /* private mode */ }
  }

  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <AppSidebar current={nav} activeCount={locs?.length ?? 0} totalCount={locs?.length ?? 0} usageLabel={title} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">{title}</h1>
              <p className="mt-1 text-[13.5px] text-[color:var(--oc-muted)]">{blurb}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {locs && locs.length > 1 && (
                <label className="flex items-center gap-2 text-[12.5px] text-[color:var(--oc-muted)]">
                  CRM account
                  <select
                    value={loc}
                    onChange={(e) => choose(e.target.value)}
                    className="max-w-[260px] rounded-lg border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-2.5 py-1.5 text-[13px] text-[color:var(--oc-ink)]"
                  >
                    {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </label>
              )}
              {loc && (typeof actions === 'function' ? actions(loc) : actions)}
            </div>
          </div>

          <div className="mt-7">
            {err ? (
              <Notice tone="red">{err}</Notice>
            ) : !locs ? (
              <div className="flex items-center gap-2 text-[13px] text-[color:var(--oc-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading your CRM accounts…</div>
            ) : !loc ? (
              <div className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-6 shadow-[var(--oc-shadow-sm)]">
                <div className="flex items-start gap-3">
                  <Plug className="mt-0.5 h-5 w-5 text-[color:var(--oc-green-d)]" />
                  <div>
                    <div className="text-[15px] font-semibold text-[color:var(--oc-ink)]">Connect a CRM account first</div>
                    <p className="mt-1 text-[13px] text-[color:var(--oc-muted)]">Your contacts, tasks, calendars and forms come from the CRM. Connect an account once and they all show up here.</p>
                    <Link href="/crm/clients" className="mt-4 inline-flex rounded-full bg-[color:var(--oc-ink)] px-5 py-2.5 text-[13px] font-semibold text-white hover:opacity-90">Connect an account</Link>
                  </div>
                </div>
              </div>
            ) : (
              <div key={loc}>{children(loc)}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── small shared pieces, so the four pages look like one product ── */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] shadow-[var(--oc-shadow-sm)] ${className}`}>{children}</div>
}

export function Notice({ tone = 'muted', children }: { tone?: 'red' | 'green' | 'muted'; children: ReactNode }) {
  const cls = tone === 'red'
    ? 'border-[color:var(--oc-red)]/30 bg-[color:var(--oc-red)]/5 text-[color:var(--oc-red)]'
    : tone === 'green'
      ? 'border-[color:var(--oc-green-d)]/30 bg-[color:var(--oc-green-d)]/5 text-[color:var(--oc-green-d)]'
      : 'border-[color:var(--oc-border)] bg-[color:var(--oc-elevated)] text-[color:var(--oc-muted)]'
  return <div className={`rounded-xl border px-4 py-3 text-[13px] ${cls}`}>{children}</div>
}

export function Btn({ children, onClick, kind = 'dark', disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; kind?: 'dark' | 'ghost'; disabled?: boolean; type?: 'button' | 'submit' }) {
  const cls = kind === 'dark'
    ? 'bg-[color:var(--oc-ink)] text-white hover:opacity-90'
    : 'border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] text-[color:var(--oc-ink)] hover:bg-[color:var(--oc-hover)]'
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[color:var(--oc-muted)]">{label}</span>
      {children}
    </label>
  )
}

export const inputCls = 'w-full rounded-lg border border-[color:var(--oc-border)] bg-white px-3 py-2 text-[13.5px] text-[color:var(--oc-ink)] outline-none focus:border-[color:var(--oc-green-d)]'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[var(--oc-shadow)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 text-[16px] font-semibold text-[color:var(--oc-ink)]">{title}</div>
        {children}
      </div>
    </div>
  )
}

export function errText(e: unknown) { return e instanceof Error ? e.message : String(e) }

/** Contact picker used by Tasks and Calendar — type a name or email, pick one. */
export function ContactPicker({ value, onChange }: { value: { id: string; label: string } | null; onChange: (c: { id: string; label: string } | null) => void }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<{ id: string; label: string }[]>([])
  useEffect(() => {
    if (value || q.trim().length < 2) { setHits([]); return }
    const t = setTimeout(async () => {
      try {
        const { sdk } = await import('@/lib/crm/sdk')
        const d = await sdk.searchContacts(q.trim(), 1, 8)
        setHits((d.contacts || []).map((c) => ({ id: c.id, label: contactName(c) })))
      } catch { setHits([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [q, value])
  if (value) return (
    <div className="flex items-center justify-between rounded-lg border border-[color:var(--oc-border)] px-3 py-2 text-[13.5px]">
      <span className="truncate text-[color:var(--oc-ink)]">{value.label}</span>
      <button type="button" className="text-[12px] text-[color:var(--oc-muted)] underline" onClick={() => { onChange(null); setQ('') }}>change</button>
    </div>
  )
  return (
    <div className="relative">
      <input className={inputCls} placeholder="Search a contact by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[color:var(--oc-border)] bg-white shadow-[var(--oc-shadow)]">
          {hits.map((h) => (
            <button type="button" key={h.id} onClick={() => onChange(h)} className="block w-full truncate px-3 py-2 text-left text-[13px] hover:bg-[color:var(--oc-hover)]">{h.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export function contactName(c: { firstName?: string | null; lastName?: string | null; name?: string; email?: string; phone?: string; contactName?: string }) {
  const n = [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.name || (c as { contactName?: string }).contactName || ''
  return n || c.email || c.phone || 'Unnamed contact'
}
