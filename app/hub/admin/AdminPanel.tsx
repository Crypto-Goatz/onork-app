'use client'

/**
 * /hub/admin — the ecosystem in cards.
 *
 * One card per system. Every figure on a card was measured by the request
 * that drew it (the timestamp is printed on each), or the card says
 * "unmeasured" and why. Actions run through the route that already owns the
 * job and print the receipt under the card — the operator sees what the
 * system said, not what the button hoped.
 *
 * Three more cards read the admin APIs that already existed (credentials
 * shape, AI truth, deprecation exposure) rather than re-implementing them.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Activity, Boxes, Building2, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, Database, ExternalLink,
  KeyRound, Loader2, RefreshCw, ShieldCheck, Sparkles, Table2, Timer, TrendingUp, Zap,
} from 'lucide-react'

type Status = 'ok' | 'warn' | 'crit' | 'unmeasured'
type Metric = { label: string; value: number | string | null; note?: string; kind?: 'crit' | 'warn' | 'ok' | 'muted' }
type Action = { id: string; label: string; needs?: 'locationId' }
type Card = { id: string; title: string; subtitle: string; status: Status; headline: string | null; metrics: Metric[]; notes: string[]; actions: Action[]; href?: string }
type Payload = { measuredAt: string; tookMs: number; cards: Card[] }

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  surfaces: Activity, on3: Zap, identity: Building2, crm: Boxes, cro9: Table2, ontask: Sparkles, stripe: TrendingUp, data: Database, jobs: Timer, deploys: Boxes,
  env: KeyRound, truth: ShieldCheck, deprecation: CircleAlert,
}
const DOT: Record<Status, string> = { ok: 'bg-[#6EE05A]', warn: 'bg-[#fbbf24]', crit: 'bg-[#f87171]', unmeasured: 'bg-[#8b949e]' }
const WORD: Record<Status, string> = { ok: 'healthy', warn: 'needs a look', crit: 'broken', unmeasured: 'unmeasured' }
const VALUE_COLOR: Record<NonNullable<Metric['kind']>, string> = { ok: 'text-[#e6edf3]', warn: 'text-[#fbbf24]', crit: 'text-[#f87171]', muted: 'text-[#8b949e]' }

function fmt(v: Metric['value']): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return v.toLocaleString('en-US')
  if (typeof v === 'string') return v
  // A value that is not text is a bug upstream; print it rather than crash the page (React #31).
  try { return JSON.stringify(v) } catch { return String(v) }
}

export default function AdminPanel() {
  const [data, setData] = useState<Payload | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [receipts, setReceipts] = useState<Record<string, { ok: boolean; text: string; at: string }>>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [locationId, setLocationId] = useState('')
  const [extra, setExtra] = useState<Card[]>([])

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const r = await fetch('/api/hub/admin', { cache: 'no-store' })
      if (!r.ok) throw new Error(`${r.status}`)
      setData(await r.json())
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
    // AI truth is behind the Supabase-session admin gate, so the browser reads it directly.
    const results: Card[] = []
    try {
      const r = await fetch('/api/admin/truth', { cache: 'no-store' }); const j = await r.json()
      const s = (j.summary || {}) as Record<string, number | string>
      results.push(r.ok ? {
        id: 'truth', title: 'AI truth', subtitle: 'Do surfaces that claim AI actually route through the brain', status: Number(s.failing ?? s.dishonest ?? 0) > 0 ? 'warn' : 'ok', headline: null,
        metrics: Object.entries(s).map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: v as number | string })), notes: [], actions: [],
      } : { id: 'truth', title: 'AI truth', subtitle: '', status: 'unmeasured', headline: null, metrics: [], notes: [`truth answered ${r.status}`], actions: [] })
    } catch (e) { results.push({ id: 'truth', title: 'AI truth', subtitle: '', status: 'unmeasured', headline: null, metrics: [], notes: [String(e)], actions: [] }) }
    setExtra(results)
  }, [])
  useEffect(() => { load() }, [load])

  const run = async (card: Card, a: Action) => {
    if (a.id === 'refresh') { load(); return }
    if (a.needs === 'locationId' && !locationId.trim()) { setReceipts((r) => ({ ...r, [card.id]: { ok: false, text: 'Type a CRM location id first.', at: new Date().toISOString() } })); return }
    setBusy(`${card.id}:${a.id}`)
    try {
      const r = await fetch('/api/hub/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: a.id, locationId: a.needs === 'locationId' ? locationId.trim() : undefined }) })
      const j = await r.json()
      setReceipts((rc) => ({ ...rc, [card.id]: { ok: r.ok && j.ok !== false, text: JSON.stringify(j.receipt ?? j, null, 1).slice(0, 1600), at: new Date().toISOString() } }))
      if (r.ok) load()
    } catch (e) { setReceipts((rc) => ({ ...rc, [card.id]: { ok: false, text: e instanceof Error ? e.message : String(e), at: new Date().toISOString() } })) }
    finally { setBusy(null) }
  }

  const cards = [...(data?.cards || []), ...extra]
  const counts = cards.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc }, {} as Record<Status, number>)

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-[#8b949e]">Owner</div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#e6edf3]">Ecosystem admin</h1>
          <p className="mt-1 max-w-[70ch] text-sm text-[#8b949e]">Every number here was counted by this page load. A card that could not measure says so instead of guessing.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-xs text-[#8b949e] sm:flex">
            {(['ok', 'warn', 'crit', 'unmeasured'] as Status[]).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${DOT[s]}`} />{counts[s] || 0} {WORD[s]}</span>)}
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm font-medium text-[#e6edf3] transition-all duration-150 hover:border-[#484f58] hover:bg-[#1c2128] active:scale-[0.98] disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Measure again
          </button>
        </div>
      </div>

      {err && <div className="mb-4 rounded-xl border border-[#f87171]/30 bg-[#f87171]/10 px-4 py-3 text-sm text-[#f87171]">The panel could not load: {err}</div>}
      {data && <div className="mb-4 text-xs text-[#8b949e]">Measured {new Date(data.measuredAt).toLocaleTimeString()} in {(data.tookMs / 1000).toFixed(1)} s.</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading && !data && Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl border border-[#30363d] bg-[#161b22]" />)}
        {cards.map((c) => {
          const Icon = ICON[c.id] || Activity
          const expanded = open[c.id] ?? c.metrics.length <= 6
          const shown = expanded ? c.metrics : c.metrics.slice(0, 6)
          const receipt = receipts[c.id]
          return (
            <div key={c.id} className="relative flex flex-col rounded-xl border border-[#30363d] bg-[#161b22] p-5 transition-all duration-200 hover:border-[#484f58] hover:bg-[#1c2128] hover:translate-y-[-1px] hover:shadow-lg hover:shadow-black/20">
              <span className={`absolute right-3 top-3 h-2 w-2 rounded-full ${DOT[c.status]}`} title={WORD[c.status]} />
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[#0d1117] text-[#6EE05A]"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-base font-semibold text-[#e6edf3]">{c.title}{c.href && <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="text-[#8b949e] hover:text-[#6EE05A]"><ExternalLink className="h-3.5 w-3.5" /></a>}</div>
                  <div className="text-xs text-[#8b949e]">{c.subtitle}</div>
                </div>
              </div>
              <div className="mt-3 text-lg font-semibold tracking-tight text-[#e6edf3]">{c.headline ?? <span className="text-sm font-normal text-[#8b949e]">{WORD[c.status]}</span>}</div>

              <dl className="mt-3 flex flex-col divide-y divide-[#30363d]/60">
                {shown.map((m) => (
                  <div key={m.label} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                    <dt className="min-w-0 truncate text-[#8b949e]" title={m.note || m.label}>{m.label}</dt>
                    <dd className={`flex-none text-right font-medium tabular-nums ${VALUE_COLOR[m.kind || 'ok']}`} title={m.note}>{fmt(m.value)}</dd>
                  </div>
                ))}
              </dl>
              {c.metrics.length > 6 && (
                <button onClick={() => setOpen((o) => ({ ...o, [c.id]: !expanded }))} className="mt-1 inline-flex items-center gap-1 self-start text-xs text-[#8b949e] hover:text-[#e6edf3]">
                  {expanded ? <><ChevronUp className="h-3 w-3" />Fewer</> : <><ChevronDown className="h-3 w-3" />{c.metrics.length - 6} more</>}
                </button>
              )}
              {c.notes.length > 0 && <ul className="mt-2 flex flex-col gap-1 text-xs text-[#8b949e]">{c.notes.map((n) => <li key={n} className="flex gap-1.5"><CircleAlert className="mt-[2px] h-3 w-3 flex-none text-[#fbbf24]" /><span>{n}</span></li>)}</ul>}

              {c.actions.length > 0 && (
                <div className="mt-auto flex flex-col gap-2 pt-4">
                  {c.actions.some((a) => a.needs === 'locationId') && (
                    <input value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="CRM location id" className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-1.5 font-mono text-xs text-[#e6edf3] placeholder:text-[#8b949e] focus:border-[#6EE05A]/40 focus:outline-none" />
                  )}
                  <div className="flex flex-wrap gap-2">
                    {c.actions.map((a) => {
                      const isBusy = busy === `${c.id}:${a.id}`
                      return <button key={a.id} onClick={() => run(c, a)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#0d1117] px-2.5 py-1.5 text-xs font-medium text-[#e6edf3] transition-all duration-150 hover:border-[#6EE05A]/40 hover:text-[#6EE05A] active:scale-[0.98] disabled:opacity-50">{isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}{a.label}</button>
                    })}
                  </div>
                </div>
              )}
              {receipt && (
                <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${receipt.ok ? 'border-[#6EE05A]/30 bg-[#6EE05A]/5 text-[#e6edf3]' : 'border-[#f87171]/30 bg-[#f87171]/5 text-[#f87171]'}`}>
                  <div className="mb-1 flex items-center gap-1.5 font-medium">{receipt.ok ? <CheckCircle2 className="h-3 w-3 text-[#6EE05A]" /> : <CircleAlert className="h-3 w-3" />}Receipt · {new Date(receipt.at).toLocaleTimeString()}</div>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-[#8b949e]">{receipt.text}</pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
