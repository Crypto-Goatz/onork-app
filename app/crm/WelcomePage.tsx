'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, CheckCircle2, Circle, ExternalLink, Gauge, Loader2, Receipt, Settings2, Sparkles, Terminal, Users } from 'lucide-react'
import { useSso, authHeaders } from './useSso'
import AppSidebar from './AppSidebar'

/**
 * The welcome page — what an agency owner sees first.
 *
 * IT LEADS WITH WHAT NEEDS THEM, not with a greeting and a grid. A first screen
 * that opens with four identical tiles makes someone hunt for the thing that is
 * actually blocked; opening with "your agency is not connected, here is the
 * link" answers the only question that matters on day one and then gets out of
 * the way.
 *
 * THE SETUP LIST IS DERIVED, NEVER STORED. Each step is computed from the same
 * endpoints the rest of the app uses, so it cannot drift into telling someone
 * they have finished something they have not — the failure mode of every
 * checklist that keeps its own copy of "done".
 *
 * A LANDING-PAGE PREFERENCE IS COMING and this page says so rather than shipping
 * a dead setting. It is the reason this route exists separately from the command
 * surface: once the preference lands, any of these pages can be the first one.
 */

interface Boot {
  connected: boolean
  agency: { name: string | null }
  locations: { id: string }[]
  session?: { companyId: string; email: string | null } | null
  usage: { mtdLabel: string }
  needs?: string
}

interface ReceiptRow {
  id: string
  capability: string
  status: string
  detail: string | null
  location_name: string | null
  created_at: string
}

const DESTINATIONS = [
  { href: '/', icon: Terminal, name: 'Command centre', blurb: 'Say what you want done across every client. It plans and prices before anything runs.' },
  { href: '/clients', icon: Users, name: 'Clients', blurb: 'Every sub-account you manage, what they pay, and what has been done for them.' },
  { href: '/automations', icon: Sparkles, name: 'Automations & AI', blurb: 'Workflow steps, agent access, plans and cross-client insight.' },
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function WelcomePage() {
  const sso = useSso()
  const [boot, setBoot] = useState<Boot | null>(null)
  const [receipts, setReceipts] = useState<ReceiptRow[] | null>(null)
  const [saas, setSaas] = useState<{ enabled: boolean; installUrl?: string } | null>(null)
  const [actionsOn, setActionsOn] = useState<number | null>(null)

  useEffect(() => {
    if (sso.state === 'pending') return
    let live = true
    const h = { headers: authHeaders(sso.token) }

    // Independent on purpose: one slow or failing call must not blank the page.
    fetch('/api/bootstrap', h).then((r) => r.json()).then((j) => live && setBoot(j)).catch(() => live && setBoot(null))
    fetch('/api/burst/receipts', h).then((r) => r.json()).then((j) => live && setReceipts(j.receipts ?? [])).catch(() => live && setReceipts([]))
    fetch('/api/saas', h).then((r) => r.json()).then((j) => live && setSaas({ enabled: Boolean(j.enabled), installUrl: j.installUrl })).catch(() => live && setSaas(null))
    fetch('/api/actions', h).then((r) => r.json())
      .then((j) => live && setActionsOn((j.actions ?? []).filter((a: { enabled: boolean }) => a.enabled).length))
      .catch(() => live && setActionsOn(null))

    return () => { live = false }
  }, [sso.state, sso.token])

  const signedIn = sso.state === 'authed' || Boolean(boot?.session)
  const clients = boot?.locations.length ?? 0
  const runs = receipts?.length ?? 0

  const steps = [
    { done: signedIn, label: 'Open 0nCORE from inside your CRM', hint: 'Signs you in automatically.' },
    { done: clients > 0, label: 'See your client accounts', hint: `${clients} connected.` },
    { done: Boolean(saas?.enabled), label: 'Connect your agency for plans and snapshots', hint: 'Unlocks rebilling and your snapshot library.', href: saas?.installUrl },
    { done: (actionsOn ?? 0) > 0, label: 'Switch on a workflow step', hint: 'Lets your own automations call 0nCORE.', to: '/automations' },
    { done: runs > 0, label: 'Run your first command', hint: 'Nothing runs until you approve it.', to: '/' },
  ]
  const remaining = steps.filter((s) => !s.done).length

  return (
    <div className="oncore-app min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[color:var(--oc-border)] bg-[color:var(--oc-card)]/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <img src="/brand/0ncore-logo-light.png" alt="0nCORE" className="h-[26px] w-auto shrink-0 object-contain" />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-medium text-[color:var(--oc-text)]/75">
            {boot?.agency.name ?? sso.user?.name ?? 'Agency Command'}
          </div>
        </div>
        {/* Only below lg, where the sidebar is hidden — above it the nav
            already offers this and two entry points is one too many. */}
        <Link href="/" className="oc-chip ml-auto inline-flex items-center gap-1.5 border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] px-2.5 py-1.5 text-[color:var(--oc-text)] transition-colors hover:border-[color:var(--oc-green-d)] lg:hidden">
          <Terminal className="h-3.5 w-3.5" /> Command centre
        </Link>
      </header>

      <div className="flex">
      <main className="mx-auto min-w-0 max-w-4xl flex-1 p-4 sm:p-6">
        <h1 className="text-[26px] font-bold leading-tight text-[color:var(--oc-ink)] sm:text-[30px]">
          {greeting()}{sso.user?.name ? `, ${sso.user.name.split(' ')[0]}` : ''}.
        </h1>
        <p className="mt-1.5 text-[14px] text-[color:var(--oc-text)]/75">
          {sso.state === 'pending'
            ? 'Signing you in…'
            : clients > 0
              ? `You manage ${clients} client account${clients === 1 ? '' : 's'}. Here is where things stand.`
              : 'Here is where things stand.'}
        </p>

        {/* What is blocked, first — before any grid of tiles. */}
        {saas && !saas.enabled && saas.installUrl && (
          <section className="oc-card mt-5 border-l-4 border-l-[color:var(--oc-amber)] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-amber)]" />
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-bold text-[color:var(--oc-ink)]">Connect your agency</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--oc-text)]/80">
                  One click gives 0nCORE read access to your plans, your rebilling and your snapshot
                  library. Until then those parts of the dashboard stay empty — not because you have
                  nothing there, but because we cannot look.
                </p>
                <a href={saas.installUrl} className="oc-btn mt-3 inline-flex items-center gap-2 px-4 py-2.5 text-[13px]">
                  Connect agency <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </section>
        )}

        {/*
          NEW CAPABILITIES, stated in terms of what an agency can now SELL.
          A changelog entry ("blog.publish shipped") means nothing to someone
          whose job is winning clients; "you can now hand a client a stocked
          store" is the same fact in the only framing that changes behaviour.
          The limitation sits in the same card rather than a footnote, because
          the fastest way to lose trust is to let someone promise a funnel page
          and find out afterwards.
        */}
        <section className="oc-card mt-5 border-l-4 border-l-[color:var(--oc-green-d)] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-green-d)]" />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-[color:var(--oc-ink)]">New: build and publish client sites</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--oc-text)]/80">
                Describe a business and 0nCORE writes the page, then puts it somewhere real.
              </p>
              <ul className="mt-2.5 space-y-1.5 text-[12.5px] text-[color:var(--oc-text)]/80">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--oc-green-d)]" />
                  <span><b>Publish as a blog post</b> on the client&rsquo;s own site — native, indexable, and it keeps your styling exactly.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--oc-green-d)]" />
                  <span><b>Stock a store</b> — products, prices and collections created for you, ready to sell.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--oc-green-d)]" />
                  <span><b>Host the page</b> and point their domain at it.</span>
                </li>
                <li className="flex gap-2 text-[color:var(--oc-text)]/60">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--oc-amber)]" />
                  <span>
                    Native <b>funnel pages</b> cannot be created by anyone — your CRM has no API for it.
                    Use one of the three above instead.
                  </span>
                </li>
              </ul>
              <p className="mt-2.5 text-[12px] text-[color:var(--oc-text)]/60">
                Nothing is written to a client account until you approve the plan.
              </p>
              <Link href="/tools" className="oc-btn mt-3 inline-flex items-center gap-2 px-4 py-2.5 text-[13px]">
                See what your CRM allows <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
          <Stat label="Client accounts" value={boot ? String(clients) : '—'} />
          <Stat label="Actions run" value={receipts ? String(runs) : '—'} />
          <Stat label="This month" value={boot?.usage.mtdLabel ?? '—'} accent />
        </div>

        {/* Setup, but only while there is something left to do. A permanently
            visible checklist of ticks is clutter. */}
        {remaining > 0 && (
          <section className="oc-card mt-5 p-4 sm:p-5">
            <h2 className="text-[15px] font-bold text-[color:var(--oc-ink)]">
              Getting set up
              <span className="ml-2 text-[12px] font-medium text-[color:var(--oc-text)]/60">
                {steps.length - remaining} of {steps.length} done
              </span>
            </h2>
            <ul className="mt-3 space-y-2">
              {steps.map((s) => {
                const Body = (
                  <>
                    {s.done
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-green-d)]" />
                      : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--oc-text)]/25" />}
                    <span className="min-w-0">
                      <span className={`block text-[13.5px] ${s.done ? 'text-[color:var(--oc-text)]/55 line-through' : 'font-medium text-[color:var(--oc-ink)]'}`}>
                        {s.label}
                      </span>
                      {!s.done && <span className="block text-[12px] text-[color:var(--oc-text)]/65">{s.hint}</span>}
                    </span>
                  </>
                )
                if (!s.done && s.href) {
                  return <li key={s.label}><a href={s.href} className="flex gap-2.5 rounded-[10px] p-1 transition-colors hover:bg-black/[0.03]">{Body}</a></li>
                }
                if (!s.done && s.to) {
                  return <li key={s.label}><Link href={s.to} className="flex gap-2.5 rounded-[10px] p-1 transition-colors hover:bg-black/[0.03]">{Body}</Link></li>
                }
                return <li key={s.label} className="flex gap-2.5 p-1">{Body}</li>
              })}
            </ul>
          </section>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {DESTINATIONS.map((d) => {
            const Icon = d.icon
            return (
              <Link key={d.href} href={d.href} className="oc-tile oc-rise group p-4 sm:p-5">
                <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-[color:var(--oc-green)]/14">
                  <Icon className="h-5 w-5 text-[color:var(--oc-green-d)]" />
                </span>
                <h2 className="mt-4 flex items-center gap-1.5 text-[16px] font-bold text-[color:var(--oc-ink)]">
                  {d.name}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--oc-text)]/80">{d.blurb}</p>
              </Link>
            )
          })}
        </div>

        <section className="oc-card mt-5 p-4 sm:p-5">
          <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-[color:var(--oc-ink)]">
            <Receipt className="h-4 w-4" /> Recently
          </h2>
          {!receipts ? (
            <div className="flex items-center gap-2 py-4 text-[13px] text-[color:var(--oc-text)]/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : receipts.length === 0 ? (
            <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--oc-text)]/70">
              Nothing yet. Everything 0nCORE does for a client is recorded here — what ran, against
              which account, and whether it worked.
            </p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {receipts.slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-start gap-2.5 rounded-[10px] border border-[color:var(--oc-border)] px-3 py-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    r.status === 'ok' ? 'bg-[color:var(--oc-green-d)]'
                    : r.status === 'failed' ? 'bg-[color:var(--oc-red)]' : 'bg-[color:var(--oc-amber)]'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-[color:var(--oc-ink)]">{r.detail || r.capability}</span>
                    {r.location_name && <span className="oc-mono block text-[10.5px] text-[color:var(--oc-text)]/55">{r.location_name}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Named as coming rather than shipped as a dead control. */}
        <p className="mt-5 flex items-center justify-center gap-2 text-[12px] text-[color:var(--oc-text)]/55">
          <Settings2 className="h-3.5 w-3.5" />
          Soon you will be able to pick which of these opens first, from your 0n profile.
        </p>
      </main>

      <AppSidebar
        current="home"
        activeCount={clients}
        totalCount={clients}
        usageLabel={boot?.usage.mtdLabel ?? '$0'}
      />
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="oc-card px-4 py-3.5">
      <div className="oc-mono text-[10px] uppercase tracking-[.12em] text-[color:var(--oc-text)]/55">{label}</div>
      <div className={`mt-0.5 text-[22px] font-bold ${accent ? 'text-[color:var(--oc-green-d)]' : 'text-[color:var(--oc-ink)]'}`}>{value}</div>
    </div>
  )
}
