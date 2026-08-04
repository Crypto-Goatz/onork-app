'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Terminal, Users, Workflow, ListChecks, TrendingUp, Gauge,
  Send, Mic, ShieldCheck, Loader2, X, AlertCircle, CheckCircle2,
  PanelRightClose, PanelRightOpen, Building2,
} from 'lucide-react'
import { METERS, formatPrice } from '@/lib/meters'

/**
 * The 0nCORE marketplace dashboard — the agency's command surface.
 *
 * THREE ZONES per the spec: header (identity, usage, live state), left rail
 * (clients, with "All" as cross-client mode), main (six tiles or a tile view),
 * right taskbar (0nTask). The tiles ARE the navigation — no separate menu,
 * which is what stops an iframe feeling like a second app bolted inside the
 * first.
 *
 * WHAT IS REAL: the command bar. It posts to /api/burst/plan and renders a
 * genuine costed plan off the capability registry — including refusing what the
 * platform's API cannot do and saying what it will do instead. Everything else
 * reads /api/bootstrap, which reports connected:false until SSO is wired.
 *
 * THE EMPTY STATE IS DELIBERATE. No sample clients, no invented counters. A
 * dashboard showing plausible fake locations is one somebody demos to a
 * customer; the honest empty state is also what tells us the wiring is not
 * finished.
 *
 * NO APPROVE BUTTON YET, on purpose. The live-write rule says a malformed parse
 * must never reach a client account without a human approving it — so
 * approve-and-run ships WITH the executor. A half-wired Approve pointed at real
 * client accounts is the one control that must not exist early.
 */

type TileId = 'command' | 'clients' | 'flows' | 'tasks' | 'grow' | 'usage'

interface Boot {
  connected: boolean
  agency: { name: string | null; whiteLabelLogo: string | null }
  locations: { id: string; name: string; openTasks?: number; color?: string }[]
  usage: { mtdLabel: string; byMeter: { key: string; label: string; count: number; costCents: number }[] }
  stats: { burstsToday: number; provisionedThisWeek: number; openTasks: number; flowsActive: number; growSignals: number }
  needs?: string
}

interface PlanLeg {
  capability: string
  intent: string
  location?: string
  priceCents: number
  blocked?: boolean
  insteadOffer?: string
}

const EXAMPLES = [
  'Tag all new leads across every client as September and add a note',
  'Book a discovery call for the Northside lead on Tuesday afternoon',
  'Build a landing page for the med-spa microneedling offer',
]

export default function AgencyDashboard() {
  const [boot, setBoot] = useState<Boot | null>(null)
  const [tile, setTile] = useState<TileId | null>(null)
  const [activeLocation, setActiveLocation] = useState<string>('all')
  const [taskbarOpen, setTaskbarOpen] = useState(true)

  const [command, setCommand] = useState('')
  const [planning, setPlanning] = useState(false)
  const [legs, setLegs] = useState<PlanLeg[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/bootstrap').then((r) => r.json()).then(setBoot).catch(() => setBoot(null))
  }, [])

  const TILES = useMemo(() => ([
    { id: 'command' as TileId, icon: Terminal, name: 'Command Chat', desc: 'One sentence, every client. It plans and prices before anything runs.', stat: `${boot?.stats.burstsToday ?? 0} bursts today`, ready: true },
    { id: 'clients' as TileId, icon: Users, name: 'New Clients', desc: 'Describe a client in a paragraph — account, snapshot, team, first email.', stat: `${boot?.stats.provisionedThisWeek ?? 0} this week`, ready: false },
    { id: 'flows' as TileId, icon: Workflow, name: 'Onboarding Flows', desc: 'A flowchart you edit in place. Click any step to change it.', stat: `${boot?.stats.flowsActive ?? 0} active`, ready: false },
    { id: 'tasks' as TileId, icon: ListChecks, name: 'Tasks', desc: 'One list for people, automations and AI agents — side by side.', stat: `${boot?.stats.openTasks ?? 0} open`, ready: false },
    { id: 'grow' as TileId, icon: TrendingUp, name: 'Grow', desc: 'Upsell, cross-sell and reactivation plays per client.', stat: `${boot?.stats.growSignals ?? 0} signals`, ready: false },
    { id: 'usage' as TileId, icon: Gauge, name: 'Plan & Usage', desc: 'Which clients are switched on, what ran, and what it cost.', stat: boot?.usage.mtdLabel ?? '$0', ready: false },
  ]), [boot])

  async function plan() {
    const q = command.trim()
    if (!q || planning) return
    setPlanning(true); setErr(null); setLegs(null)
    try {
      const r = await fetch('/api/burst/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: q, activeLocationId: activeLocation === 'all' ? null : activeLocation }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j?.error || `Planning failed (${r.status})`)
      setLegs(Array.isArray(j.legs) ? j.legs : [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally { setPlanning(false) }
  }

  const total = (legs ?? []).reduce((s, l) => s + (l.priceCents || 0), 0)
  const billable = (legs ?? []).filter((l) => l.priceCents > 0).length
  const blocked = (legs ?? []).filter((l) => l.blocked).length
  const locCount = new Set((legs ?? []).map((l) => l.location).filter(Boolean)).size

  return (
    <div className="oncore-app min-h-screen">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[color:var(--oc-border)] bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-gradient-to-br from-[#6EE05A] to-[#2E9A1F] text-[13px] font-black text-[#0d1117]">
          0n
        </span>
        <div className="min-w-0">
          <div className="text-[15px] font-bold leading-none text-[color:var(--oc-ink)]">0nCORE</div>
          <div className="truncate text-[11px] text-[color:var(--oc-text)]/70">
            {boot?.agency.name ?? 'Agency Command'}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="oc-chip hidden border border-[color:var(--oc-border)] bg-white px-2.5 py-1.5 text-[color:var(--oc-text)] sm:inline-block">
            {boot?.usage.mtdLabel ?? '$0'} MTD
          </span>
          <span className="oc-chip inline-flex items-center gap-1.5 border border-[color:var(--oc-border)] bg-white px-2.5 py-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${boot?.connected ? 'bg-[color:var(--oc-green-d)]' : 'bg-[color:var(--oc-amber)]'}`} />
            <span className="text-[color:var(--oc-text)]">{boot?.connected ? 'live' : 'not connected'}</span>
          </span>
          <button
            type="button"
            onClick={() => setTaskbarOpen((v) => !v)}
            aria-label={taskbarOpen ? 'Hide tasks' : 'Show tasks'}
            className="grid h-8 w-8 place-items-center rounded-[11px] border border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)] lg:hidden"
          >
            {taskbarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* ── LEFT RAIL ── */}
        <aside className="hidden w-56 shrink-0 border-r border-[color:var(--oc-border)] bg-white/60 p-3 md:block">
          <div className="oc-mono mb-2 px-2 text-[10px] font-bold uppercase tracking-[.12em] text-[color:var(--oc-text)]/55">
            Clients
          </div>
          <button
            type="button"
            onClick={() => setActiveLocation('all')}
            className={`mb-1 flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left text-[13.5px] font-semibold transition-colors ${
              activeLocation === 'all'
                ? 'bg-[color:var(--oc-green)]/12 text-[color:var(--oc-ink)]'
                : 'text-[color:var(--oc-text)] hover:bg-black/[0.03]'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-gradient-to-br from-[#6EE05A] to-[#2E9A1F]" />
            All clients
          </button>

          {boot?.locations.length ? (
            boot.locations.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setActiveLocation(l.id)}
                className={`flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left text-[13.5px] transition-colors ${
                  activeLocation === l.id ? 'bg-[color:var(--oc-green)]/12 text-[color:var(--oc-ink)]' : 'text-[color:var(--oc-text)] hover:bg-black/[0.03]'
                }`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color ?? '#3E8FC7' }} />
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                {!!l.openTasks && <span className="oc-mono text-[10px] text-[color:var(--oc-text)]/60">{l.openTasks}</span>}
              </button>
            ))
          ) : (
            <div className="rounded-[12px] border border-dashed border-[color:var(--oc-border)] px-3 py-4 text-[12px] leading-relaxed text-[color:var(--oc-text)]/70">
              <Building2 className="mb-1.5 h-4 w-4 text-[color:var(--oc-text)]/40" />
              No clients switched on yet. They appear here once 0nCORE is installed on your agency.
            </div>
          )}
        </aside>

        {/* ── MAIN ── */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <section className="oc-card oc-rise p-4 sm:p-5">
            <div className="oc-mono mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[color:var(--oc-green-d)]">
              <span>EQ&gt;</span>
              <span className="text-[color:var(--oc-text)]/55">
                {activeLocation === 'all' ? 'all clients' : boot?.locations.find((l) => l.id === activeLocation)?.name ?? 'client'}
              </span>
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); plan() } }}
                rows={2}
                placeholder="Say what you want done — name the clients and the outcome."
                aria-label="Command"
                className="oc-input min-h-[52px] flex-1 resize-y px-3.5 py-3 text-[15px] leading-relaxed placeholder:text-[color:var(--oc-text)]/45"
              />
              <button
                type="button"
                disabled
                title="Voice — ships with the executor"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[color:var(--oc-border)] bg-white text-[color:var(--oc-text)]/35"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={plan}
                disabled={planning || !command.trim()}
                className="oc-btn grid h-11 w-11 shrink-0 place-items-center"
                aria-label="Plan this"
              >
                {planning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>

            {!legs && !err && (
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map((x) => (
                  <button
                    key={x}
                    type="button"
                    onClick={() => setCommand(x)}
                    className="oc-chip border border-[color:var(--oc-border)] bg-white px-3 py-2 text-left font-normal text-[color:var(--oc-text)] transition-colors hover:border-[color:var(--oc-green-d)]"
                  >
                    {x}
                  </button>
                ))}
              </div>
            )}

            {err && (
              <p className="mt-3 flex items-start gap-2 text-sm text-[color:var(--oc-red)]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {err}
              </p>
            )}

            {legs && (
              <div className="oc-rise mt-4">
                <div className="oc-mono mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[color:var(--oc-text)]/70">
                  <span className="font-bold text-[color:var(--oc-ink)]">{legs.length} legs</span>
                  {locCount > 0 && <><span>·</span><span>{locCount} client{locCount === 1 ? '' : 's'}</span></>}
                  <span>·</span>
                  <span>{billable} billable</span>
                  <span>·</span>
                  <span className="font-bold text-[color:var(--oc-green-d)]">{formatPrice(total)}</span>
                  {blocked > 0 && <><span>·</span><span className="text-[color:var(--oc-amber)]">{blocked} needs another route</span></>}
                </div>

                <div className="space-y-2">
                  {legs.map((l, i) => (
                    <div
                      key={i}
                      className={`rounded-[14px] border p-3.5 ${
                        l.blocked
                          ? 'border-[color:var(--oc-amber)]/45 bg-[color:var(--oc-amber)]/[0.07]'
                          : 'border-[color:var(--oc-border)] bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {l.location && (
                            <span className="oc-chip mb-1 inline-block border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] px-2 py-0.5 text-[color:var(--oc-text)]">
                              {l.location}
                            </span>
                          )}
                          <div className="text-[14px] font-semibold text-[color:var(--oc-ink)]">{l.intent}</div>
                          {l.blocked && l.insteadOffer && (
                            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--oc-amber)]">{l.insteadOffer}</p>
                          )}
                        </div>
                        <span className="oc-mono shrink-0 text-[12px] text-[color:var(--oc-text)]/70">
                          {formatPrice(l.priceCents)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {legs.length === 0 && (
                    <p className="text-sm text-[color:var(--oc-text)]/70">
                      Nothing actionable in that — try naming a client and an outcome.
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-[14px] border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] p-3.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-green-d)]" />
                  <p className="text-[12px] leading-relaxed text-[color:var(--oc-text)]/80">
                    <b className="text-[color:var(--oc-ink)]">A plan, not an action.</b> Nothing has
                    touched a client account. Approve &amp; Run arrives with the executor — until
                    then this shows exactly what it would do and what it would cost.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ── TILE GRID ── */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {TILES.map((t, i) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTile(t.id)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="oc-tile oc-rise p-5 text-left"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-[color:var(--oc-green)]/14">
                      <Icon className="h-5 w-5 text-[color:var(--oc-green-d)]" />
                    </span>
                    <span className={`oc-chip px-2 py-1 ${
                      t.ready
                        ? 'border border-[color:var(--oc-green-d)]/30 bg-[color:var(--oc-green)]/12 text-[color:var(--oc-green-d)]'
                        : 'border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] text-[color:var(--oc-text)]/55'
                    }`}>
                      {t.ready ? 'LIVE' : 'BUILDING'}
                    </span>
                  </div>
                  <h2 className="mt-4 text-[17px] font-bold">{t.name}</h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--oc-text)]/80">{t.desc}</p>
                  <div className="oc-mono mt-3 text-[11px] text-[color:var(--oc-text)]/55">{t.stat}</div>
                </button>
              )
            })}
          </div>

          {/* ── what it costs ── */}
          <section className="oc-card mt-5 p-5">
            <h2 className="text-[15px] font-bold">What runs costs what</h2>
            <div className="mt-3.5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {METERS.map((m) => (
                <div key={m.key} className="rounded-[14px] border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] p-3.5">
                  <div className="text-[13px] font-semibold text-[color:var(--oc-ink)]">{m.label}</div>
                  <div className="oc-mono mt-1 text-[17px] font-bold text-[color:var(--oc-green-d)]">
                    {formatPrice(m.priceCents, m.pending)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[color:var(--oc-text)]/60">
                    {m.unit}{m.launchFree ? ' · free while we launch' : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* ── RIGHT TASKBAR ── */}
        {taskbarOpen && (
          <aside className="hidden w-72 shrink-0 border-l border-[color:var(--oc-border)] bg-white/60 p-4 lg:block">
            <div className="oc-mono mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[.12em] text-[color:var(--oc-text)]/55">
              <span>Tasks</span>
              <button onClick={() => setTaskbarOpen(false)} aria-label="Hide tasks" className="text-[color:var(--oc-text)]/45 hover:text-[color:var(--oc-ink)]">
                <PanelRightClose className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="rounded-[14px] border border-dashed border-[color:var(--oc-border)] p-4 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/70">
              <ListChecks className="mb-2 h-4 w-4 text-[color:var(--oc-text)]/40" />
              People and agents share this list. Anything a command or a flow does lands here with a
              receipt against the right client.
            </div>
          </aside>
        )}
      </div>

      {/* ── tile detail ── */}
      {tile && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setTile(null) }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#181D19]/35 p-4 backdrop-blur-sm"
        >
          <div className="oc-card oc-rise w-full max-w-lg p-6">
            {(() => {
              const t = TILES.find((x) => x.id === tile)!
              const Icon = t.icon
              return (
                <>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[color:var(--oc-green)]/14">
                        <Icon className="h-5 w-5 text-[color:var(--oc-green-d)]" />
                      </span>
                      <h3 className="text-[19px] font-bold">{t.name}</h3>
                    </div>
                    <button onClick={() => setTile(null)} aria-label="Close" className="rounded-[11px] border border-[color:var(--oc-border)] p-2 text-[color:var(--oc-text)]/60">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="leading-relaxed text-[color:var(--oc-text)]">{t.desc}</p>
                  <div className={`mt-5 flex items-start gap-2 rounded-[14px] border p-3.5 text-[13px] leading-relaxed ${
                    t.ready
                      ? 'border-[color:var(--oc-green-d)]/25 bg-[color:var(--oc-green)]/[0.08] text-[color:var(--oc-ink)]'
                      : 'border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] text-[color:var(--oc-text)]/80'
                  }`}>
                    {t.ready
                      ? <><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-green-d)]" /> Planning is live now. Execution lands with the executor.</>
                      : <><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Being built. Listed so you can see the shape — not because it works yet.</>}
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
