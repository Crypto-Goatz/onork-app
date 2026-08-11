'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search, Loader2, AlertCircle, Building2, ChevronRight, Users,
  Workflow, Receipt, Mail, Phone, MapPin, X, Crosshair,
} from 'lucide-react'
import { authHeaders } from './useSso'

/**
 * Clients — every sub-account on the agency, and one client in depth.
 *
 * A LIST THAT LOADS, then detail on demand. Enriching 86 clients up front would
 * be 86 CRM calls behind one page load; the list is two calls and opening a
 * client costs four. That is the difference between a page that appears
 * instantly and one that looks broken.
 *
 * IT SORTS UNBILLED CLIENTS TO THE TOP when billing is connected. An agency
 * owner opening this screen is looking for what is leaking, not for an
 * alphabetical roster — and a client doing work for free is the leak.
 */

interface ClientRow {
  id: string; name: string
  planName: string | null; priceCents: number | null; onPlan: boolean
  activity: { runs: number; failures: number }
}

interface Detail {
  client: { id: string; name: string; email?: string | null; phone?: string | null; city?: string | null; state?: string | null; website?: string | null }
  contacts: number | null
  workflows: { name?: string; status?: string }[] | null
  unreadable: string[]
  receipts: { capability: string; status: string; detail: string | null; created_at: string }[]
}

const money = (c: number) => {
  const d = c / 100
  return Number.isInteger(d) ? `$${d.toLocaleString()}` : `$${d.toFixed(2)}`
}

export default function ClientsPage({ token, onCommand, onFocus }: { token: string | null; onCommand: (c: string) => void; onFocus?: (id: string, name: string) => void }) {
  const [rows, setRows] = useState<ClientRow[] | null>(null)
  const [billing, setBilling] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clients', { headers: authHeaders(token) })
      .then((r) => r.json())
      .then((j) => (j?.error ? setErr(j.error) : (setRows(j.clients ?? []), setBilling(Boolean(j.billingConnected)))))
      .catch(() => setErr('Could not read your clients.'))
  }, [token])

  const shown = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    const list = needle ? rows.filter((r) => r.name.toLowerCase().includes(needle)) : rows
    return [...list].sort((a, b) => {
      // Unbilled first, but only once we can actually tell — without the billing
      // connection every client looks unbilled and the sort would be noise.
      if (billing && a.onPlan !== b.onPlan) return a.onPlan ? 1 : -1
      if (a.activity.runs !== b.activity.runs) return b.activity.runs - a.activity.runs
      return a.name.localeCompare(b.name)
    })
  }, [rows, q, billing])

  if (err) return <p className="flex items-center gap-2 py-4 text-sm text-[color:var(--oc-red)]"><AlertCircle className="h-4 w-4" /> {err}</p>
  if (!rows) return <div className="flex items-center gap-2 py-8 text-[13px] text-[color:var(--oc-text)]/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading your clients…</div>

  const unbilled = rows.filter((r) => !r.onPlan).length

  return (
    <div className="oc-card oc-rise p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-[color:var(--oc-ink)]">Clients</h2>
          <p className="mt-0.5 text-[12.5px] text-[color:var(--oc-text)]/70">
            {rows.length} sub-account{rows.length === 1 ? '' : 's'}
            {billing && unbilled > 0 && (
              <span className="text-[color:var(--oc-amber)]"> · {unbilled} not billed</span>
            )}
            {!billing && <span> · connect your agency to see plans</span>}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--oc-text)]/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a client…" className="oc-input w-full pl-9" />
        </div>
      </div>

      <div className="space-y-1.5">
        {shown.map((c) => (
          <div key={c.id}
            className="flex w-full items-center gap-3 rounded-[12px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-3.5 py-3 text-left transition-colors hover:border-[color:var(--oc-green-d)]">
            {/* Primary gesture: click the client to ZOOM the whole dashboard onto
                them. Falls back to opening detail when focus isn't wired. */}
            <button type="button" onClick={() => (onFocus ? onFocus(c.id, c.name) : setOpen(c.id))}
              className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <Building2 className="h-4 w-4 shrink-0 text-[color:var(--oc-text)]/35" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-[color:var(--oc-ink)]">{c.name}</span>
                {c.activity.runs > 0 && (
                  <span className="oc-mono block text-[11px] text-[color:var(--oc-text)]/55">
                    {c.activity.runs} action{c.activity.runs === 1 ? '' : 's'} run
                    {c.activity.failures > 0 && <span className="text-[color:var(--oc-amber)]"> · {c.activity.failures} failed</span>}
                  </span>
                )}
              </span>
            </button>
            {billing && (
              c.onPlan ? (
                <span className="oc-mono shrink-0 text-[11.5px] text-[color:var(--oc-text)]/65">
                  {c.planName}{c.priceCents ? ` · ${money(c.priceCents)}` : ''}
                </span>
              ) : (
                <span className="oc-chip shrink-0 border border-[color:var(--oc-amber)]/40 bg-[color:var(--oc-amber)]/[0.08] px-2 py-0.5 text-[11px] text-[color:var(--oc-amber)]">
                  not billed
                </span>
              )
            )}
            {/* Detail without leaving the global view. */}
            <button type="button" onClick={() => setOpen(c.id)} aria-label={`Details for ${c.name}`}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border border-[color:var(--oc-border)] text-[color:var(--oc-text)]/40 transition-colors hover:border-[color:var(--oc-green-d)] hover:text-[color:var(--oc-green-d)]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="py-6 text-center text-[13px] text-[color:var(--oc-text)]/60">
            {q ? `Nothing matching “${q}”.` : 'No clients yet.'}
          </p>
        )}
      </div>

      {open && <ClientDetail token={token} id={open} onClose={() => setOpen(null)} onCommand={onCommand} onFocus={onFocus} />}
    </div>
  )
}

function ClientDetail({ token, id, onClose, onCommand, onFocus }: { token: string | null; id: string; onClose: () => void; onCommand: (c: string) => void; onFocus?: (id: string, name: string) => void }) {
  const [d, setD] = useState<Detail | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setD(null); setErr(null)
    fetch(`/api/clients/${encodeURIComponent(id)}`, { headers: authHeaders(token) })
      .then((r) => r.json())
      .then((j) => (j?.error ? setErr(j.error) : setD(j)))
      .catch(() => setErr('Could not open that client.'))
  }, [id, token])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose} role="presentation">
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-[20px] border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] p-4 shadow-xl sm:rounded-[20px] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-[17px] font-bold text-[color:var(--oc-ink)]">{d?.client.name ?? 'Loading…'}</h3>
          <button type="button" onClick={onClose} aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] text-[color:var(--oc-text)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {err && <p className="flex items-center gap-2 text-sm text-[color:var(--oc-red)]"><AlertCircle className="h-4 w-4" /> {err}</p>}
        {!d && !err && <div className="flex items-center gap-2 py-8 text-[13px] text-[color:var(--oc-text)]/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}

        {d && (
          <div className="space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Tile icon={Users} label="Contacts" value={d.contacts === null ? 'could not read' : d.contacts.toLocaleString()} dim={d.contacts === null} />
              <Tile icon={Workflow} label="Automations" value={d.workflows === null ? 'could not read' : String(d.workflows.length)} dim={d.workflows === null} />
            </div>

            {(d.client.email || d.client.phone || d.client.city) && (
              <div className="space-y-1.5 rounded-[14px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-3.5">
                {d.client.email && <Line icon={Mail} text={d.client.email} />}
                {d.client.phone && <Line icon={Phone} text={d.client.phone} />}
                {(d.client.city || d.client.state) && <Line icon={MapPin} text={[d.client.city, d.client.state].filter(Boolean).join(', ')} />}
              </div>
            )}

            {d.workflows && d.workflows.length > 0 && (
              <div>
                <h4 className="mb-1.5 text-[13px] font-semibold text-[color:var(--oc-ink)]">Their automations</h4>
                <div className="space-y-1">
                  {d.workflows.slice(0, 8).map((w, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-[10px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-3 py-2">
                      <span className="truncate text-[12.5px] text-[color:var(--oc-ink)]">{w.name || 'Untitled'}</span>
                      <span className="oc-mono shrink-0 text-[10.5px] text-[color:var(--oc-text)]/55">{w.status || 'draft'}</span>
                    </div>
                  ))}
                </div>
                <p className="oc-mono mt-1 text-[10.5px] text-[color:var(--oc-text)]/50">Read-only — edit these in your CRM.</p>
              </div>
            )}

            <div>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--oc-ink)]">
                <Receipt className="h-3.5 w-3.5" /> What 0nCORE has done here
              </h4>
              {d.receipts.length === 0 ? (
                <p className="text-[12.5px] text-[color:var(--oc-text)]/60">Nothing yet.</p>
              ) : (
                <div className="space-y-1">
                  {d.receipts.map((r, i) => (
                    <div key={i} className="rounded-[10px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          r.status === 'ok' ? 'bg-[color:var(--oc-green-d)]'
                          : r.status === 'failed' ? 'bg-[color:var(--oc-red)]' : 'bg-[color:var(--oc-amber)]'}`} />
                        <span className="oc-mono text-[10.5px] text-[color:var(--oc-text)]/55">{r.capability}</span>
                      </div>
                      {r.detail && <p className="mt-0.5 text-[12px] leading-relaxed text-[color:var(--oc-text)]/80">{r.detail}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Zoom the whole dashboard onto this client. */}
              {onFocus && (
                <button type="button"
                  onClick={() => { onFocus(d.client.id, d.client.name); onClose() }}
                  className="oc-btn inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-[13px]">
                  <Crosshair className="h-4 w-4" /> Focus on {d.client.name}
                </button>
              )}
              {/* Straight back into the one safe path — a prefilled command, not an action. */}
              <button type="button"
                onClick={() => { onCommand(`In ${d.client.name}, `); onClose() }}
                className="inline-flex flex-1 items-center justify-center rounded-[12px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-4 py-2.5 text-[13px] font-medium text-[color:var(--oc-ink)] transition-colors hover:border-[color:var(--oc-green-d)]">
                Do something here
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Tile({ icon: Icon, label, value, dim }: { icon: typeof Users; label: string; value: string; dim?: boolean }) {
  return (
    <div className="rounded-[12px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-3.5 py-3">
      <div className="oc-mono flex items-center gap-1.5 text-[10px] uppercase tracking-[.12em] text-[color:var(--oc-text)]/55">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-0.5 text-[19px] font-bold ${dim ? 'text-[13px] font-normal text-[color:var(--oc-amber)]' : 'text-[color:var(--oc-ink)]'}`}>{value}</div>
    </div>
  )
}

function Line({ icon: Icon, text }: { icon: typeof Mail; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] text-[color:var(--oc-text)]/80">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[color:var(--oc-text)]/40" /> <span className="truncate">{text}</span>
    </div>
  )
}
