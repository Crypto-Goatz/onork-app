'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Terminal, Users, Workflow, ListChecks, TrendingUp, Gauge,
  Send, Mic, ArrowRight, ShieldCheck, Loader2, X, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { METERS, formatPrice } from '@/lib/meters'

/**
 * The agency command centre — six tiles, one screen.
 *
 * WHAT THIS IS TODAY: the shell, wired to the real plan endpoint. The command
 * bar posts to /api/burst/plan and renders whatever plan comes back, including
 * its price. What it will NOT do is execute — there is no execute path in this
 * component at all, deliberately, because the spec's live-write rule says a
 * malformed parse must never be able to reach the CRM without a human pressing
 * Approve. Approve arrives with the executor, not before it.
 *
 * The five other tiles open, state honestly what they will do, and say what is
 * still being built. A tile that pretends to work is worse than one that says
 * "not yet" — an agency finds out the difference on a client account.
 */

type TileId = 'command' | 'clients' | 'flows' | 'tasks' | 'grow' | 'usage'

const TILES: { id: TileId; icon: typeof Terminal; name: string; blurb: string; ready: boolean }[] = [
  { id: 'command', icon: Terminal, name: 'Command Chat', blurb: 'Say what you want across any client. It plans, prices, then waits for you.', ready: true },
  { id: 'clients', icon: Users, name: 'New Clients', blurb: 'Describe a client in a paragraph — account, snapshot, team and first email.', ready: false },
  { id: 'flows', icon: Workflow, name: 'Onboarding Flows', blurb: 'A flowchart you edit in place. Click any step to change it.', ready: false },
  { id: 'tasks', icon: ListChecks, name: 'Tasks', blurb: 'One list for people, automations and AI agents.', ready: false },
  { id: 'grow', icon: TrendingUp, name: 'Grow', blurb: 'Upsell and cross-sell plays per client, launched from the command bar.', ready: false },
  { id: 'usage', icon: Gauge, name: 'Plan & Usage', blurb: 'Which clients are switched on, what you have run, what it cost.', ready: false },
]

interface PlanLeg {
  capability: string
  intent: string
  location?: string
  priceCents: number
  blocked?: boolean
  insteadOffer?: string
}

export default function AgencyDashboard() {
  const [open, setOpen] = useState<TileId | null>(null)
  const [command, setCommand] = useState('')
  const [planning, setPlanning] = useState(false)
  const [legs, setLegs] = useState<PlanLeg[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function plan() {
    const q = command.trim()
    if (!q || planning) return
    setPlanning(true); setErr(null); setLegs(null)
    try {
      const r = await fetch('/api/burst/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: q }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j?.error || `Planning failed (${r.status})`)
      setLegs(Array.isArray(j.legs) ? j.legs : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setPlanning(false)
    }
  }

  const total = (legs ?? []).reduce((s, l) => s + (l.priceCents || 0), 0)
  const billable = (legs ?? []).filter((l) => l.priceCents > 0).length

  return (
    <div className="grid-bg grid-anim min-h-screen text-neutral-800">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <div className="mb-1 flex items-center gap-2.5">
          <span className="inline-grid h-9 w-9 place-items-center rounded-xl border border-[color:var(--brand)]/25 bg-[color:var(--brand)]/10">
            <Terminal className="h-4.5 w-4.5 text-[color:var(--brand)]" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Agency Command</h1>
        </div>
        <p className="mb-8 text-neutral-500">
          One screen for every client account. Nothing runs until you approve it.
        </p>

        {/* Command bar — the product in one input */}
        <div className="rounded-2xl border border-neutral-200/70 bg-white shadow-cascade-sm p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand)]">
            <span className="font-mono">EQ&gt;</span> Command
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200/70 bg-white p-2">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') plan() }}
              placeholder="Tag Client A's March leads reengage and add a note…"
              aria-label="Command"
              className="flex-1 bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-neutral-400"
            />
            <button
              type="button"
              title="Voice input — coming with the executor"
              disabled
              className="grid h-10 w-10 place-items-center rounded-lg border border-neutral-200/70 text-neutral-400"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={plan}
              disabled={planning || !command.trim()}
              className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-neutral-950 disabled:bg-neutral-200 disabled:text-neutral-400"
              aria-label="Plan this"
            >
              {planning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          {err && (
            <p className="mt-3 flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {err}
            </p>
          )}

          {legs && (
            <div className="mt-5">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                <span className="font-semibold text-neutral-900">{legs.length} step{legs.length === 1 ? '' : 's'}</span>
                <span>·</span>
                <span>{billable} billable</span>
                <span>·</span>
                <span className="font-mono font-semibold text-[color:var(--brand)]">{formatPrice(total)}</span>
              </div>

              <div className="space-y-2">
                {legs.map((l, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-3.5 ${l.blocked ? 'border-amber-300/60 bg-amber-50' : 'border-neutral-200/70 bg-neutral-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{l.intent}</div>
                        {l.location && <div className="text-xs text-neutral-500">{l.location}</div>}
                        {l.blocked && l.insteadOffer && (
                          <div className="mt-1.5 text-xs leading-relaxed text-amber-700">{l.insteadOffer}</div>
                        )}
                      </div>
                      <span className="shrink-0 font-mono text-xs text-neutral-500">{formatPrice(l.priceCents)}</span>
                    </div>
                  </div>
                ))}
                {legs.length === 0 && (
                  <p className="text-sm text-neutral-500">Nothing to do from that — try naming a client and an outcome.</p>
                )}
              </div>

              {/* No Approve button. See the header comment — execution ships
                  with the executor, and a button that half-works on a client
                  account is the one thing that must not exist. */}
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-neutral-200/70 bg-white p-3.5 text-xs leading-relaxed text-neutral-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand)]" aria-hidden="true" />
                This is a plan, not an action. Nothing has touched any client account. Approve-and-run
                arrives with the executor — until then this shows you exactly what it would do and
                what it would cost.
              </div>
            </div>
          )}
        </div>

        {/* Tiles */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setOpen(t.id)}
                className="card-hover rounded-2xl border border-neutral-200/70 bg-white shadow-cascade-sm p-6 text-left hover:border-[color:var(--brand)]/40"
              >
                <div className="flex items-start justify-between">
                  <span className="inline-grid h-11 w-11 place-items-center rounded-xl border border-[color:var(--brand)]/20 bg-[color:var(--brand)]/10">
                    <Icon className="h-5 w-5 text-[color:var(--brand)]" aria-hidden="true" />
                  </span>
                  {t.ready ? (
                    <span className="rounded-md border border-[color:var(--brand)]/30 bg-[color:var(--brand)]/10 px-2 py-0.5 text-[10px] font-bold text-[color:var(--brand)]">LIVE</span>
                  ) : (
                    <span className="rounded-md border border-neutral-200/70 px-2 py-0.5 text-[10px] font-bold text-neutral-400">BUILDING</span>
                  )}
                </div>
                <h2 className="mt-4 text-lg font-semibold">{t.name}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{t.blurb}</p>
              </button>
            )
          })}
        </div>

        {/* What it costs — straight from the shared constants */}
        <div className="mt-8 rounded-2xl border border-neutral-200/70 bg-white shadow-cascade-sm p-6">
          <h2 className="text-lg font-semibold">What runs costs what</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {METERS.map((m) => (
              <div key={m.key} className="rounded-xl border border-neutral-200/70 bg-white p-4">
                <div className="text-sm font-semibold">{m.label}</div>
                <div className="mt-1 font-mono text-lg font-bold text-[color:var(--brand)]">{formatPrice(m.priceCents, m.pending)}</div>
                <div className="mt-1 text-[11px] text-neutral-400">{m.unit}{m.launchFree ? ' · free while we launch' : ''}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-sm">
          <Link href="/crm/contacts" className="font-semibold text-[color:var(--brand)] hover:underline">
            Open the full CRM surface <ArrowRight className="inline h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Tile detail */}
      {open && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(null) }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200/70 bg-white shadow-cascade-sm p-6">
            {(() => {
              const t = TILES.find((x) => x.id === open)!
              const Icon = t.icon
              return (
                <>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-grid h-10 w-10 place-items-center rounded-xl border border-[color:var(--brand)]/20 bg-[color:var(--brand)]/10">
                        <Icon className="h-5 w-5 text-[color:var(--brand)]" aria-hidden="true" />
                      </span>
                      <h3 className="text-xl font-bold">{t.name}</h3>
                    </div>
                    <button onClick={() => setOpen(null)} aria-label="Close" className="rounded-lg border border-neutral-200/70 p-2 text-neutral-500">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="leading-relaxed text-neutral-500">{t.blurb}</p>
                  <div className={`mt-5 flex items-start gap-2 rounded-xl border p-3.5 text-sm ${t.ready ? 'border-[color:var(--brand)]/25 bg-[color:var(--brand)]/[0.07] text-neutral-900' : 'border-neutral-200/70 bg-neutral-50 text-neutral-500'}`}>
                    {t.ready
                      ? <><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand)]" aria-hidden="true" /> Live — planning works now. Execution lands with the executor.</>
                      : <><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Being built. It is listed here so you can see the shape, not because it works yet.</>}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
