'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Terminal,
  Send, Mic, ShieldCheck, Loader2, X, AlertCircle, CheckCircle2,
  PanelRightClose, PanelRightOpen, Building2, Sparkles, Home,
  Crosshair, ArrowLeft, LogOut, CreditCard,
} from 'lucide-react'
import { METERS, formatPrice } from '@/lib/meters'
import { useSso, authHeaders, STORAGE_KEY } from './useSso'
import { LockGate } from '@/components/auth/LockGate'
import { createClient } from '@/lib/supabase/client'
import ControlCenter from './ControlCenter'
import ClientsPage from './ClientsPage'
import CommandLauncher from './CommandLauncher'
import AppSidebar, { NAV } from './AppSidebar'

/**
 * The 0nCORE marketplace dashboard — the agency's command surface.
 *
 * THREE ZONES per the spec: header (identity, usage, live state), left rail
 * (clients, with "All" as cross-client mode), main (six tiles or a tile view),
 * right taskbar (0nTask). The tiles ARE the navigation — no separate menu,
 * which is what stops an iframe feeling like a second app bolted inside the
 * first.
 *
 * WHAT IS REAL: the command bar, end to end. It plans against the agency's
 * actual clients, prices off the capability registry, and Approve & Run
 * executes — signed plan, receipts, live writes. Automations & AI covers the
 * rest: workflow actions, agent connect, the read-only automation viewer and
 * cross-client insights.
 *
 * THE EMPTY STATE IS DELIBERATE. No sample clients, no invented counters. A
 * dashboard showing plausible fake locations is one somebody demos to a
 * customer; the honest empty state is also what tells us the wiring is not
 * finished.
 *
 * APPROVE IS THE ONLY ROUTE TO A LIVE WRITE. There is no auto-execute path in
 * this component or behind it, and every step that CANNOT run says so before
 * approval rather than in the receipt afterwards.
 */

type TileId = 'command' | 'clients' | 'flows' | 'tasks' | 'grow' | 'usage'

interface Boot {
  connected: boolean
  agency: { name: string | null; whiteLabelLogo: string | null }
  locations: { id: string; name: string; openTasks?: number; color?: string }[]
  usage: { mtdLabel: string; byMeter: { key: string; label: string; count: number; costCents: number }[] }
  stats: { burstsToday: number; provisionedThisWeek: number; openTasks: number; flowsActive: number; growSignals: number }
  needs?: string
  /** Present once SSO succeeded, even when no install is connected yet. */
  session?: { companyId: string; email: string | null; role: string | null }
  /** A read that failed — distinct from "you have none". */
  warning?: string
}

interface PlanLeg {
  capability: string
  intent: string
  location?: string
  locationId?: string
  ambiguous?: { id: string; name: string }[]
  /** Exactly what the planner called this client — the key a pin is stored under. */
  spoken?: string
  priceCents: number
  blocked?: boolean
  insteadOffer?: string
  needs?: string[]
  needsLabel?: string
  /** Will actually execute if approved. Everything else is explained up front. */
  runnable?: boolean
  notYetWired?: boolean
  needsBilling?: boolean
}

interface LegOutcome {
  capability: string
  status: 'ok' | 'failed' | 'refused' | 'unsupported'
  detail: string
  location?: string | null
  targets: number
}

const EXAMPLES = [
  'Tag all new leads across every client as September and add a note',
  'Book a discovery call for the Northside lead on Tuesday afternoon',
  'Build a landing page for the med-spa microneedling offer',
]

export default function AgencyDashboard({ initialView = 'dashboard' }: { initialView?: 'dashboard' | 'clients' | 'automations' } = {}) {
  const [boot, setBoot] = useState<Boot | null>(null)
  const [tile, setTile] = useState<TileId | null>(null)
  /**
   * FOCUS. The agency's whole reason to be here: see every client at once, then
   * zoom into ONE. 'all' is the global view; a locationId focuses the dashboard
   * on that client — the command bar targets them (the planner already honours
   * activeLocationId), and a focus bar makes it obvious and reversible. Naming a
   * client in the sentence still works too; focus is the persistent version of it.
   */
  const [activeLocation, setActiveLocation] = useState<string>('all')
  const [focusName, setFocusName] = useState<string>('')
  const focusOn = (id: string, name: string) => { setActiveLocation(id); setFocusName(name); setView('dashboard') }
  const clearFocus = () => { setActiveLocation('all'); setFocusName('') }

  // Sign out. The app JWT lives in sessionStorage and is what useSso reads first
  // — clearing the Supabase session alone would leave that cached token valid for
  // hours, so the user would still be "in". Drop both, then land on login.
  const signOut = async () => {
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* private mode */ }
    try { await createClient().auth.signOut() } catch { /* already gone */ }
    window.location.href = '/login?next=/crm'
  }

  // Agency billing state — drives the Activate banner ($5/client + $0.10/call).
  const [billing, setBilling] = useState<{ authed: boolean; subscribed: boolean; isFounding: boolean; baseFeeCents: number; clients: number; freeClients: number; billableClients: number; monthlyClientCents: number; perCallCents: number } | null>(null)
  const [subscribing, setSubscribing] = useState(false)
  const subscribe = async () => {
    if (subscribing) return
    setSubscribing(true)
    try {
      const r = await fetch('/api/agency/subscribe', { method: 'POST', headers: authHeaders(sso.token) })
      const j = await r.json()
      if (j?.url) { window.location.href = j.url; return }
      alert(j?.error || 'Could not start checkout.')
    } catch { alert('Could not start checkout.') }
    finally { setSubscribing(false) }
  }
  const [taskbarOpen, setTaskbarOpen] = useState(true)
  /**
   * Top-level view. The tiles remain the dashboard's own navigation; this is the
   * layer above them, so Clients and Automations are places you go rather than
   * panels that appear over the command bar.
   */
  const [view, setView] = useState<'dashboard' | 'clients' | 'automations'>(initialView)

  const [command, setCommand] = useState('')
  const [planning, setPlanning] = useState(false)
  /**
   * Which sub-account the user picked for an ambiguous name, keyed by the phrase
   * the planner used. Kept across re-plans so answering "which RocketOpp LLC?"
   * once does not have to be answered again for the next command.
   */
  const [pins, setPins] = useState<Record<string, string>>({})
  const [legs, setLegs] = useState<PlanLeg[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [planToken, setPlanToken] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [outcomes, setOutcomes] = useState<LegOutcome[] | null>(null)
  const [runErr, setRunErr] = useState<string | null>(null)

  const sso = useSso()

  // Bootstrap waits for the handshake to SETTLE, not to succeed. Fetching at
  // mount would fire an anonymous call and paint "not connected" a beat before
  // the token arrives — the shell would visibly change its mind in front of the
  // user. Every settled state (authed, standalone, rejected) fetches exactly
  // once, and the token is simply absent for the ones without a session.
  useEffect(() => {
    if (sso.state === 'pending') return
    let live = true
    fetch('/api/bootstrap', { headers: authHeaders(sso.token) })
      .then((r) => r.json())
      .then((j) => { if (live) setBoot(j) })
      .catch(() => { if (live) setBoot(null) })
    return () => { live = false }
  }, [sso.state, sso.token])

  // Billing status — drives the Activate banner. Cookie session (no bearer).
  useEffect(() => {
    if (sso.state === 'pending') return
    let live = true
    fetch('/api/agency/billing-status', { headers: authHeaders(sso.token) })
      .then((r) => r.json()).then((j) => { if (live) setBilling(j) }).catch(() => {})
    return () => { live = false }
  }, [sso.state])

  // Launch handoff — a "Launch" click on the Tools page arrives as ?do=<intent>.
  // Load it into the command bar and show the command view, so Launch actually
  // launches the tool instead of dropping the user at an empty bar. Reads
  // window.location directly (not useSearchParams) to avoid the SSR bailout.
  useEffect(() => {
    try {
      const doParam = new URLSearchParams(window.location.search).get('do')
      if (doParam) {
        setCommand(decodeURIComponent(doParam) + ' ')
        setView('dashboard')
        const url = new URL(window.location.href)
        url.searchParams.delete('do')
        window.history.replaceState({}, '', url.toString())
      }
    } catch { /* no-op */ }
  }, [])

  /**
   * Only what actually works.
   *
   * Five of the original six were `ready: false` and opened a panel that did
   * nothing — a landing page advertising features it does not have teaches
   * people not to click anything. The sections that DO work are in the rail;
   * they do not need a second, decorative entrance.
   */
  const TILES = useMemo(() => ([
    { id: 'command' as TileId, icon: Terminal, name: 'Command Chat', desc: 'One sentence, every client. It plans and prices before anything runs.', stat: `${boot?.stats.burstsToday ?? 0} bursts today`, ready: true },
  ]), [boot])

  /**
   * Answer "which client did you mean?" with one click, then re-plan.
   *
   * Re-plans immediately with the pin applied rather than patching the existing
   * leg: the plan is signed server-side, so a leg edited in the browser would no
   * longer match the token that authorises it.
   */
  function pickClient(spoken: string, locationId: string) {
    const key = spoken.trim().toLowerCase()
    if (!key) return
    const next = { ...pins, [key]: locationId }
    setPins(next)
    void plan(next)
  }

  async function plan(pinOverrides?: Record<string, string>) {
    const q = command.trim()
    if (!q || planning) return
    // A new plan invalidates the last one completely — token, legs and the
    // outcomes of whatever ran before. Leaving a stale token approvable next to
    // fresh legs is how someone approves what they are not looking at.
    setPlanning(true); setErr(null); setLegs(null)
    setPlanToken(null); setOutcomes(null); setRunErr(null)
    try {
      const r = await fetch('/api/burst/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(sso.token) },
        body: JSON.stringify({
          command: q,
          activeLocationId: activeLocation === 'all' ? null : activeLocation,
          pins: pinOverrides ?? pins,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j?.error || `Planning failed (${r.status})`)
      setLegs(Array.isArray(j.legs) ? j.legs : [])
      setPlanToken(typeof j.planToken === 'string' ? j.planToken : null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
    } finally { setPlanning(false) }
  }

  async function approveAndRun() {
    if (!planToken || running) return
    setRunning(true); setRunErr(null)
    try {
      const r = await fetch('/api/burst/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(sso.token) },
        body: JSON.stringify({ planToken }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j?.error || `Run failed (${r.status})`)
      setOutcomes(Array.isArray(j.results) ? j.results : [])
      // The token is spent. The server enforces this too — the unique plan id
      // means a replay is refused — but clearing it here stops the button from
      // inviting a second click that can only fail.
      setPlanToken(null)
    } catch (e) {
      setRunErr(e instanceof Error ? e.message : 'The run did not start.')
    } finally { setRunning(false) }
  }

  const total = (legs ?? []).reduce((s, l) => s + (l.priceCents || 0), 0)
  const billable = (legs ?? []).filter((l) => l.priceCents > 0).length
  const blocked = (legs ?? []).filter((l) => l.blocked).length
  const locCount = new Set((legs ?? []).map((l) => l.location).filter(Boolean)).size
  const runnable = (legs ?? []).filter((l) => l.runnable).length
  /**
   * How many clients are switched on — the billed number. Until activation
   * ships this reads the connected list, so it is honest rather than invented;
   * it becomes the activated_locations count when Tile 6 lands.
   */
  const activeCount = boot?.locations.length ?? 0

  /**
   * Four states, not two. "Not connected" used to cover being mid-handshake,
   * being signed in with nothing installed, and having the sign-in refused —
   * three problems with three different fixes, all wearing the same amber dot.
   */
  const conn: { dot: string; label: string } =
    sso.state === 'pending' ? { dot: 'bg-[color:var(--oc-text)]/30', label: 'connecting' }
    : boot?.connected ? { dot: 'bg-[color:var(--oc-green-d)]', label: 'live' }
    : sso.state === 'rejected' ? { dot: 'bg-[color:var(--oc-red)]', label: 'sign-in failed' }
    : boot?.session ? { dot: 'bg-[color:var(--oc-amber)]', label: 'not installed' }
    : { dot: 'bg-[color:var(--oc-amber)]', label: 'not connected' }

  // Logged out (opened outside the CRM with no 0nCORE session, or sign-in failed):
  // show the one branded lock gate instead of a dashboard that would only 401.
  // 'pending' still shows the dashboard chrome while the handshake/mint runs.
  if (sso.state === 'standalone' || sso.state === 'rejected') {
    return <LockGate next="/crm" title="Your agency command centre" subtitle="Sign in to your 0nCORE account to open every client at once." />
  }

  return (
    <div className="oncore-app min-h-screen">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[color:var(--oc-border)] bg-[color:var(--oc-card)]/90 px-4 py-3 backdrop-blur-md sm:px-6">
        {/* The full wordmark, which already carries the name — so the "0nCORE"
            text label that used to sit here is gone rather than saying it twice.
            This is the light-background artwork (dark lettering); the neon icon
            variant is for dark surfaces and would disappear on #F6F6F7. */}
        <img
          src="/brand/0ncore-logo-light.png"
          alt="0nCORE"
          className="h-[26px] w-auto shrink-0 object-contain"
        />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-medium text-[color:var(--oc-text)]/75">
            {boot?.agency.name ?? sso.user?.name ?? 'Agency Command'}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="oc-chip hidden border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-2.5 py-1.5 text-[color:var(--oc-text)] sm:inline-block">
            {boot?.usage.mtdLabel ?? '$0'} MTD
          </span>
          <span className="oc-chip inline-flex items-center gap-1.5 border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-2.5 py-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${conn.dot}`} />
            <span className="text-[color:var(--oc-text)]">{conn.label}</span>
          </span>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => {
              const Icon = n.icon
              const on = n.view !== undefined && view === n.view
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? 'page' : undefined}
                  className={`oc-chip inline-flex items-center gap-1.5 border px-2.5 py-1.5 transition-colors ${
                    on
                      ? 'border-[color:var(--oc-green-d)] bg-[color:var(--oc-green)]/12 text-[color:var(--oc-green-d)]'
                      : 'border-transparent bg-transparent text-[color:var(--oc-text)] hover:border-[color:var(--oc-border)] hover:bg-[color:var(--oc-card)]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {n.label}
                </Link>
              )
            })}
          </nav>
          <button
            type="button"
            onClick={() => setTaskbarOpen((v) => !v)}
            aria-label={taskbarOpen ? 'Hide tasks' : 'Show tasks'}
            className="grid h-8 w-8 place-items-center rounded-[11px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] text-[color:var(--oc-text)] lg:hidden"
          >
            {taskbarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="grid h-8 w-8 place-items-center rounded-[11px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] text-[color:var(--oc-text)] transition-colors hover:border-[color:var(--oc-red)] hover:text-[color:var(--oc-red)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── FOCUS BAR ── the "zoomed into one client" state, persistent and
          reversible. Hidden in the global (all-clients) view. */}
      {activeLocation !== 'all' && (
        <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b border-[color:var(--oc-green-d)]/25 bg-[color:var(--oc-green)]/[0.10] px-4 py-2.5 backdrop-blur-md sm:px-6">
          <Crosshair className="h-4 w-4 shrink-0 text-[color:var(--oc-green-d)]" />
          <div className="min-w-0 flex-1">
            <span className="text-[13px] font-semibold text-[color:var(--oc-ink)]">
              Focused on {focusName || 'this client'}
            </span>
            <span className="ml-2 text-[12px] text-[color:var(--oc-text)]/65">commands run here</span>
          </div>
          <button
            type="button"
            onClick={clearFocus}
            className="oc-chip inline-flex shrink-0 items-center gap-1.5 border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-2.5 py-1.5 text-[12px] font-medium text-[color:var(--oc-text)] transition-colors hover:border-[color:var(--oc-green-d)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All clients
          </button>
        </div>
      )}

      {/* ── BILLING ACTIVATION ── the revenue gate. Shown until the agency has a
          subscription; states the exact cost from their live client count. */}
      {billing?.authed && !billing.subscribed && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[color:var(--oc-amber)]/30 bg-[color:var(--oc-amber)]/[0.08] px-4 py-3 sm:px-6">
          <CreditCard className="h-4 w-4 shrink-0 text-[color:var(--oc-amber)]" />
          <div className="min-w-0 flex-1">
            <span className="text-[13px] font-semibold text-[color:var(--oc-ink)]">
              {billing.isFounding ? 'Activate your agency — founding: no monthly fee, ever' : 'Activate your agency'}
            </span>
            <span className="ml-2 text-[12.5px] text-[color:var(--oc-text)]/70">
              {billing.isFounding ? '$0 base · ' : '$19/mo base · '}
              $5/client/mo (1 free) + $0.01/API call ·{' '}
              {billing.billableClients > 0
                ? `${billing.clients} clients → ${billing.billableClients} × $5 = $${(billing.monthlyClientCents / 100).toFixed(0)}/mo + usage`
                : `${billing.clients} client${billing.clients === 1 ? '' : 's'} (free) + usage only`}
            </span>
          </div>
          <button
            type="button"
            onClick={subscribe}
            disabled={subscribing}
            className="oc-btn shrink-0 px-4 py-2 text-[13px] disabled:opacity-60"
          >
            {subscribing ? 'Starting…' : 'Activate billing'}
          </button>
        </div>
      )}

      <div className="flex">
        {/* ── MAIN ── */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          {/* Mobile nav — the header row has no space for it below md. */}
          <div className="mb-4 flex gap-1.5 md:hidden">
            {NAV.map((n) => {
              const Icon = n.icon
              const on = n.view !== undefined && view === n.view
              return (
                <Link key={n.href} href={n.href}
                  aria-current={on ? 'page' : undefined}
                  className={`oc-chip inline-flex flex-1 items-center justify-center gap-1.5 border px-2 py-2 text-[11.5px] transition-colors ${
                    on ? 'border-[color:var(--oc-green-d)] bg-[color:var(--oc-green)]/12 text-[color:var(--oc-green-d)]'
                       : 'border-[color:var(--oc-border)] bg-[color:var(--oc-card)] text-[color:var(--oc-text)]'}`}>
                  <Icon className="h-3.5 w-3.5" /> {n.label === 'Automations & AI' ? 'Automations' : n.label}
                </Link>
              )
            })}
          </div>

          {view === 'clients' && (
            <ClientsPage
              token={sso.token}
              onCommand={(c) => { setCommand(c); setView('dashboard') }}
              onFocus={focusOn}
            />
          )}

          {view === 'automations' && (
            <ControlCenter
              token={sso.token}
              locations={boot?.locations ?? []}
              onCommand={(c) => { setCommand(c); setView('dashboard') }}
              onClose={() => setView('dashboard')}
            />
          )}

          {view === 'dashboard' && (
          <>
          {/* The launcher sits ABOVE the command box on purpose: it is the
              answer to "what can this thing do", and a person who does not yet
              know what to type needs the menu before the input. Tiles either
              navigate or pre-fill the box below. */}
          <section className="oc-card oc-rise p-4 sm:p-5">
            <CommandLauncher onPrompt={(text) => setCommand((c) => (c ? `${c} ${text}` : text))} />
          </section>

          <section className="oc-card oc-rise mt-4 p-4 sm:p-5">
            <div className="oc-mono mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[color:var(--oc-green-d)]">
              <span>EQ&gt;</span>
              <span className="text-[color:var(--oc-text)]/55">
                {activeLocation === 'all' ? 'all clients' : (focusName || boot?.locations.find((l) => l.id === activeLocation)?.name || 'client')}
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
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] text-[color:var(--oc-text)]/35"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => plan()}
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
                    className="oc-chip border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-3 py-2 text-left font-normal text-[color:var(--oc-text)] transition-colors hover:border-[color:var(--oc-green-d)]"
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
                          : 'border-[color:var(--oc-border)] bg-[color:var(--oc-card)]'
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
                          {/* Asked BEFORE approval. A step that cannot run because
                              one detail is missing should say which detail, not
                              refuse after the person has committed to the plan. */}
                          {l.needsLabel && (
                            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--oc-amber)]">
                              {l.needsLabel}
                            </p>
                          )}
                          {/* Said BEFORE approval, never in the receipt. Finding
                              out a step was never wired up after approving it is
                              how a plan becomes a lie. */}
                          {l.ambiguous?.length ? (
                            <div className="mt-1.5">
                              <p className="text-[12.5px] leading-relaxed text-[color:var(--oc-amber)]">
                                &ldquo;{l.spoken || l.location}&rdquo; matches {l.ambiguous.length} clients — which one?
                              </p>
                              {/* Buttons, not prose. These sub-accounts can share
                                  a name, so the id is the only thing that tells
                                  them apart and typing it back is not an answer
                                  a person should have to give. */}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {l.ambiguous.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => pickClient(l.spoken || l.location || '', c.id)}
                                    disabled={planning}
                                    className="rounded-lg border border-[color:var(--oc-line)] bg-[color:var(--oc-card)] px-3 py-1.5 text-left text-[12px] transition hover:border-[color:var(--oc-green)] hover:bg-[color:var(--oc-green)]/5 disabled:opacity-50"
                                  >
                                    <span className="font-medium text-[color:var(--oc-ink)]">{c.name}</span>
                                    <span className="ml-2 font-mono text-[11px] text-[color:var(--oc-text)]/50">{c.id}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {l.notYetWired && (
                            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/60">
                              Planned, not wired up yet — this one will be skipped.
                            </p>
                          )}
                          {l.needsBilling && (
                            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/60">
                              Costs money, and billing is not switched on yet — this one will be skipped.
                            </p>
                          )}
                          {!l.blocked && !l.locationId && !l.ambiguous?.length && (
                            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--oc-text)]/60">
                              No client matched — pick one on the left, or name it in the instruction.
                            </p>
                          )}
                          {(() => {
                            const o = outcomes?.find((x) => x.capability === l.capability)
                            if (!o) return null
                            const tone =
                              o.status === 'ok' ? 'text-[color:var(--oc-green-d)]'
                              : o.status === 'failed' ? 'text-[color:var(--oc-red)]'
                              : 'text-[color:var(--oc-amber)]'
                            return <p className={`mt-2 text-[12.5px] font-medium leading-relaxed ${tone}`}>{o.detail}</p>
                          })()}
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

                {runErr && (
                  <p className="mt-3 flex items-start gap-2 text-sm text-[color:var(--oc-red)]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {runErr}
                  </p>
                )}

                {outcomes ? (
                  <div className="mt-3 flex items-start gap-2 rounded-[14px] border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] p-3.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-green-d)]" />
                    <p className="text-[12px] leading-relaxed text-[color:var(--oc-text)]/80">
                      <b className="text-[color:var(--oc-ink)]">
                        {outcomes.filter((o) => o.status === 'ok').length} of {outcomes.length} steps ran.
                      </b>{' '}
                      Every one left a receipt against its client. Ask for something else to start a new plan.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col gap-3 rounded-[14px] border border-[color:var(--oc-border)] bg-[color:var(--oc-bg)] p-3.5 sm:flex-row sm:items-center">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[color:var(--oc-green-d)]" />
                    <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-[color:var(--oc-text)]/80">
                      {runnable > 0 ? (
                        <>
                          <b className="text-[color:var(--oc-ink)]">Nothing has run yet.</b>{' '}
                          Approving runs {runnable} step{runnable === 1 ? '' : 's'} against{' '}
                          {runnable === 1 ? 'that client' : 'those clients'}. The rest are skipped, and
                          a step that fails is never billed.
                        </>
                      ) : (
                        <>
                          <b className="text-[color:var(--oc-ink)]">A plan, not an action.</b>{' '}
                          {sso.state === 'authed'
                            ? 'Nothing here can run yet — see the notes on each step.'
                            : 'Open 0nCORE from inside your CRM to run a plan.'}
                        </>
                      )}
                    </p>
                    {runnable > 0 && planToken && (
                      <button
                        type="button"
                        onClick={approveAndRun}
                        disabled={running}
                        className="oc-btn shrink-0 px-4 py-2.5 text-[13px]"
                      >
                        {running
                          ? <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running</span>
                          : `Approve & run ${runnable} step${runnable === 1 ? '' : 's'}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* TILE GRID REMOVED. It advertised five panels that did nothing.
              Command is the landing surface; everything else lives in the rail. */}

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
          </>
          )}
        </main>

        {taskbarOpen && (
          <AppSidebar
            current={view}
            activeCount={activeCount}
            totalCount={boot?.locations.length ?? 0}
            usageLabel={boot?.usage.mtdLabel ?? '$0'}
            onHide={() => setTaskbarOpen(false)}
          />
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
