'use client'

/**
 * History — every receipt, newest first.
 *
 * THE TRUST SURFACE. When an agency asks "what did you do inside my client's
 * account", this is the answer, so an expanded row shows the raw result and the
 * raw error, not a tidied summary. A receipt that has been prettied up is not
 * evidence.
 *
 * Failed rows are never hidden or filtered out by default — a history that
 * shows only successes is worse than none, because it is trusted.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import AppSidebar from './AppSidebar'

interface Receipt {
  id: string
  run_id: string | null
  location_id: string | null
  location_name: string | null
  capability: string
  intent: string | null
  status: string
  price_cents: number | null
  billed: boolean | null
  targets: number | null
  detail: string | null
  error: string | null
  created_at: string
  source: string | null
}

const STATUS_CLS: Record<string, string> = {
  ok: 'bg-[color:var(--oc-green-d)]/12 text-[color:var(--oc-green-d)]',
  failed: 'bg-[color:var(--oc-red)]/12 text-[color:var(--oc-red)]',
  partial: 'bg-[color:var(--oc-amber)]/12 text-[color:var(--oc-amber)]',
  pending: 'bg-black/20 text-[color:var(--oc-muted)]',
}
const STATUS_LABEL: Record<string, string> = {
  ok: 'Success', failed: 'Failed', partial: 'Partial', pending: 'Pending',
}

/** Today 14:02 / Yesterday 16:30 / 8 Aug 09:15 — a date nobody has to decode. */
function when(iso: string) {
  const d = new Date(iso)
  const t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const day = new Date(d); day.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000)
  if (diff === 0) return `Today ${t}`
  if (diff === 1) return `Yesterday ${t}`
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${t}`
}

export default function HistoryPage() {
  const [rows, setRows] = useState<Receipt[] | null>(null)
  const [filters, setFilters] = useState<{ clients: { id: string; name: string }[]; capabilities: string[]; statuses: string[] }>({ clients: [], capabilities: [], statuses: [] })
  const [client, setClient] = useState('all')
  const [capability, setCapability] = useState('all')
  const [status, setStatus] = useState('all')
  const [days, setDays] = useState('7')
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ client, capability, status, days })
    const j = await fetch(`/api/crm/history?${qs}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null)
    setRows(Array.isArray(j?.receipts) ? j.receipts : [])
    if (j?.filters) setFilters(j.filters)
  }, [client, capability, status, days])

  useEffect(() => { void load() }, [load])

  const csv = useMemo(() => {
    if (!rows?.length) return ''
    const head = ['when', 'client', 'capability', 'status', 'targets', 'cost', 'detail', 'error']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    return [head.join(','), ...rows.map((r) => [
      r.created_at, r.location_name ?? '', r.capability, r.status, r.targets ?? 0,
      r.price_cents ? (r.price_cents / 100).toFixed(2) : '0.00', r.detail ?? '', r.error ?? '',
    ].map(esc).join(','))].join('\n')
  }, [rows])

  function exportCsv() {
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `0ncore-history-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const Select = ({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-full border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-3.5 py-2 text-[12.5px] text-[color:var(--oc-text)] outline-none transition hover:border-[color:var(--oc-border)] focus:border-[color:var(--oc-green-d)]"
    >
      {children}
    </select>
  )

  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <AppSidebar current="history" activeCount={0} totalCount={0} usageLabel="$0" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1080px] px-10 py-12">
          <div className="flex items-start justify-between gap-6">
            <header className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">History</h1>
              <p className="mt-1 max-w-md text-[13.5px] leading-relaxed text-[color:var(--oc-muted)]">
                Every receipt, newest first. If something went wrong in a client&apos;s account, the
                answer lives here.
              </p>
            </header>
            <button
              onClick={exportCsv}
              disabled={!rows?.length}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-4 py-2.5 text-[12.5px] font-medium text-[color:var(--oc-text)] transition hover:border-[color:var(--oc-border)] hover:text-[color:var(--oc-ink)] disabled:opacity-40"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Select value={client} onChange={setClient}>
              <option value="all">All clients</option>
              {filters.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={capability} onChange={setCapability}>
              <option value="all">All capabilities</option>
              {filters.capabilities.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select value={status} onChange={setStatus}>
              <option value="all">All statuses</option>
              {filters.statuses.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
            </Select>
            <Select value={days} onChange={setDays}>
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
          </div>

          {!rows && (
            <div className="mt-8 flex items-center gap-2 text-sm text-[color:var(--oc-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading receipts…
            </div>
          )}

          {rows?.length === 0 && (
            <p className="mt-8 text-sm text-[color:var(--oc-muted)]">
              Nothing in this window. Every approved run writes a receipt here.
            </p>
          )}

          <div className="mt-6 space-y-2">
            {(rows ?? []).map((r) => {
              const isOpen = open === r.id
              const cost = r.price_cents ? `$${(r.price_cents / 100).toFixed(2)}` : 'Free'
              return (
                <div key={r.id} className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] transition-colors duration-150 hover:border-[color:var(--oc-border)]">
                  <button
                    onClick={() => setOpen(isOpen ? null : r.id)}
                    className="grid w-full grid-cols-[130px_1fr_1fr_auto_70px] items-center gap-3 p-4 text-left"
                  >
                    <span className="font-mono text-[12px] text-[color:var(--oc-muted)]">{when(r.created_at)}</span>
                    <span className="truncate text-[13.5px] font-semibold text-[color:var(--oc-ink)]">
                      {r.location_name ?? '—'}
                    </span>
                    <span className="truncate text-[12.5px] text-[color:var(--oc-muted)]">
                      {r.detail || r.intent || r.capability}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_CLS[r.status] ?? STATUS_CLS.pending}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    <span className={`text-right font-mono text-[12px] ${r.billed ? 'text-[color:var(--oc-amber)]' : 'text-[color:var(--oc-muted)]'}`}>
                      {cost}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t border-[color:var(--oc-border)] px-4 pb-4 pt-3 text-[12.5px]">
                      <Field label="Capability" mono>{r.capability}</Field>
                      {r.intent && <Field label="What it was for">{r.intent}</Field>}
                      <Field label="Targets touched">{r.targets ?? 0}</Field>
                      <Field label="Client" mono>{r.location_id ?? '—'}</Field>
                      {r.run_id && <Field label="Run" mono>{r.run_id}</Field>}
                      {/* Raw, on purpose. A receipt that has been tidied is not evidence. */}
                      {r.detail && (
                        <div>
                          <Label>Result</Label>
                          <p className="mt-1 rounded-lg bg-[color:var(--oc-bg)] px-3 py-2 font-mono text-[11.5px] leading-relaxed text-[color:var(--oc-green-d)]">
                            {r.detail}
                          </p>
                        </div>
                      )}
                      {r.error && (
                        <div>
                          <Label>Error</Label>
                          <p className="mt-1 rounded-lg bg-[color:var(--oc-bg)] px-3 py-2 font-mono text-[11.5px] leading-relaxed text-[color:var(--oc-red)]">
                            {r.error}
                          </p>
                        </div>
                      )}
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--oc-muted)]">
      {children}
    </div>
  )
}
function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="w-[130px] shrink-0 text-[color:var(--oc-muted)]">{label}</span>
      <span className={mono ? 'font-mono text-[11.5px] text-[color:var(--oc-text)]' : 'text-[color:var(--oc-text)]'}>
        {children}
      </span>
    </div>
  )
}
