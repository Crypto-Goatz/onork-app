'use client'

/**
 * Surface B — the Client Console. Built from `design_handoff_0ncore 3`:
 * Client Console.dc.html plus screenshots/console-01-overview.png.
 *
 * THE CONSTRAINT THAT DRIVES EVERY DECISION HERE: this person has one account
 * and is not technical. No client switcher, no keys, no agency billing, no
 * capability glossary. If a control would ever make them ask "which account is
 * this?", it does not belong on this surface.
 *
 * RECENT ACTIVITY IS THE POINT, not a footnote. An agency acting inside
 * someone's business is invisible by default, and invisible work is work that
 * gets cancelled. Plain sentences — "0n tagged 12 contacts" — are the whole
 * argument for the retainer, which is why the comp gives them a card of their
 * own and the header "Everything done in your account, in plain words".
 *
 * The rail is BLACK, 236px, and on the RIGHT. That is not a mirrored Surface A;
 * it is the thing that tells someone at a glance which product they are in.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen, CalendarCheck, CalendarDays, CircleCheck, GitBranch, GraduationCap,
  Inbox, KanbanSquare, Layers, LayoutDashboard, ListChecks, Loader2, Mail,
  MessageSquare, Package, Sparkles, StickyNote, Store, Tag, UserPen, UserPlus, Users,
} from 'lucide-react'
import { useSso, authHeaders } from '@/app/crm/useSso'

type Section = 'overview' | 'conversations' | 'contacts' | 'calendar' | 'pipeline' | 'content' | 'ask'

/** Order and icons are the handoff's NAV array, verbatim. */
const NAV: { key: Section; label: string; icon: typeof Users; ready: boolean }[] = [
  { key: 'overview',      label: 'Overview',      icon: LayoutDashboard, ready: true },
  { key: 'conversations', label: 'Conversations', icon: Inbox,           ready: false },
  { key: 'contacts',      label: 'Contacts',      icon: Users,           ready: false },
  { key: 'calendar',      label: 'Calendar',      icon: CalendarDays,    ready: false },
  { key: 'pipeline',      label: 'Pipeline',      icon: KanbanSquare,    ready: false },
  { key: 'content',       label: 'Content',       icon: Layers,          ready: false },
  { key: 'ask',           label: 'Ask 0n',        icon: Sparkles,        ready: false },
]

const ACTIVITY_ICONS: Record<string, typeof Tag> = {
  tag: Tag, 'user-plus': UserPlus, 'user-pen': UserPen, 'sticky-note': StickyNote,
  'message-square': MessageSquare, mail: Mail, 'list-checks': ListChecks,
  package: Package, store: Store, 'book-open': BookOpen, 'graduation-cap': GraduationCap,
  sparkles: Sparkles, 'calendar-check': CalendarCheck, 'git-branch': GitBranch,
  'circle-check': CircleCheck,
}

interface Summary {
  account: { locationId: string; name: string }
  stats: {
    newContacts: { value: number | null; trendPct: number | null }
    needsReply: { value: number | null }
    appointments: { value: number | null; nextAt: string | null }
    deals: { value: number | null; amount: number | null; partial: boolean }
  }
  activity: { text: string; icon: string; at: string }[]
}

export default function CustomerPortal({ locationId }: { locationId: string }) {
  const sso = useSso()
  const [section, setSection] = useState<Section>('overview')
  const [data, setData] = useState<Summary | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (sso.state === 'pending' || !sso.token) return
    try {
      const r = await fetch(`/api/portal/${encodeURIComponent(locationId)}/summary`, {
        headers: authHeaders(sso.token), cache: 'no-store',
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Could not load your account.'); return }
      setData(j)
    } catch {
      setErr('Could not reach the server.')
    }
  }, [locationId, sso.state, sso.token])

  useEffect(() => { void load() }, [load])

  if (sso.state === 'pending') {
    return <Center><Loader2 className="h-5 w-5 animate-spin text-[color:var(--dash-faint)]" /></Center>
  }
  if (sso.state !== 'authed') {
    // No OAuth button: this renders framed inside the client's own CRM, and
    // OAuth is refused in an iframe.
    return (
      <Center>
        <p className="text-[15px] font-semibold text-[color:var(--dash-ink)]">Open this from your account</p>
        <p className="mt-1.5 max-w-xs text-[13.5px] text-[color:var(--dash-muted)]">
          This page signs you in automatically when you open it from the menu inside your CRM.
        </p>
      </Center>
    )
  }

  const s = data?.stats
  const nextAppt = s?.appointments.nextAt
    ? new Date(s.appointments.nextAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <div className="oncore-app flex h-screen overflow-hidden bg-[color:var(--dash-canvas)]">
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[960px] px-10 pb-24 pt-11">
          <div className="on-fade-up">
            <h1 className="m-0 text-[30px] font-semibold tracking-[-0.02em] text-[color:var(--dash-ink)]">
              {greeting()}
            </h1>
            <p className="mt-1.5 text-[14px] text-[color:var(--dash-muted)]">
              {data ? `Here's ${data.account.name} this week.` : 'Loading your account…'}
            </p>
          </div>

          {err && (
            <p className="mt-6 rounded-2xl bg-[color:var(--status-warning)]/10 px-4 py-3 text-[13px] text-[color:var(--status-warning)]">
              {err}
            </p>
          )}

          {section === 'overview' && (
            <>
              <div className="mt-[26px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                <Stat i={0} label="New contacts (7d)"
                  value={s ? fmt(s.newContacts.value) : null}
                  trend={s?.newContacts.trendPct != null ? `${s.newContacts.trendPct > 0 ? '+' : ''}${s.newContacts.trendPct}%` : null}
                  trendTone={(s?.newContacts.trendPct ?? 0) >= 0 ? 'good' : 'bad'}
                  sub="vs. previous week" />
                <Stat i={1} label="Needs a reply"
                  value={s ? fmt(s.needsReply.value) : null}
                  sub="in Conversations" />
                <Stat i={2} label="Appointments today"
                  value={s ? fmt(s.appointments.value) : null}
                  trend={nextAppt ? `next ${nextAppt}` : null} trendTone="good"
                  sub={s?.appointments.value === 0 ? 'nothing booked today' : 'across your calendars'} />
                <Stat i={3} label="Deals in play"
                  value={s ? money(s.deals.amount) : null}
                  sub={s?.deals.value != null
                    // Says "first 100" rather than implying the sum covers
                    // every open deal, because it does not.
                    ? `${s.deals.value} open deal${s.deals.value === 1 ? '' : 's'}${s.deals.partial ? ' — value of the first 100' : ''}`
                    : 'open deals'} />
              </div>

              <div className="on-card on-fade-up mt-4 p-[22px]" style={{ animationDelay: '.25s' }}>
                <div className="mb-3.5 flex items-center justify-between gap-4">
                  <span className="text-[15px] font-semibold text-[color:var(--dash-ink)]">Recent activity</span>
                  <span className="text-right text-[12px] text-[color:var(--dash-faint)]">
                    Everything done in your account, in plain words
                  </span>
                </div>
                <div className="flex flex-col">
                  {!data && <Row muted>Loading…</Row>}
                  {data && data.activity.length === 0 && (
                    <Row muted>Nothing yet. Work your agency does in this account will show up here.</Row>
                  )}
                  {data?.activity.map((a, i) => {
                    const Icon = ACTIVITY_ICONS[a.icon] ?? CircleCheck
                    return (
                      <div key={i}
                        className="on-slide-l flex items-center gap-3 rounded-xl px-2.5 py-[11px] transition-colors hover:bg-[color:var(--dash-canvas)]"
                        style={{ animationDelay: `${i * 0.04}s` }}>
                        <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[color:var(--0n-soft)] text-[color:var(--0n-deep)]">
                          <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
                        </span>
                        <span className="flex-1 text-[13.5px] leading-[1.5] text-[color:var(--dash-ink)]">{a.text}</span>
                        <span className="whitespace-nowrap text-[12px] text-[color:var(--dash-faint)]">{ago(a.at)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {section !== 'overview' && (
            <div className="on-card on-fade-up mt-6 p-10 text-center">
              <p className="text-[15px] font-semibold text-[color:var(--dash-ink)]">
                {NAV.find((n) => n.key === section)?.label} is not switched on yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[color:var(--dash-muted)]">
                Overview is live and reads your real account. This section is designed and not yet
                wired — it will keep saying so here until it genuinely works.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 236px, black, RIGHT — Surface B. No client switcher, by design: this
          person has exactly one account. */}
      <aside className="flex w-[236px] shrink-0 flex-col bg-black px-3.5 pb-4 pt-5">
        <div className="on-slide-l px-2 pb-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/0ncore-logo-light.png" alt="0nCORE" className="block h-6 w-auto" />
        </div>
        <div className="on-slide-l px-2 pb-[18px] text-[11.5px] text-white/45" style={{ animationDelay: '.05s' }}>
          {data?.account.name ?? ' '}
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ key, label, icon: Icon, ready }, i) => (
            <button key={key} onClick={() => setSection(key)}
              aria-current={section === key ? 'page' : undefined}
              className={`on-rail-item on-slide-l ${section === key ? 'active' : ''}`}
              style={{ animationDelay: `${i * 0.03}s` }}>
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {label}
              {/* Honest in the nav, not only after the click. */}
              {!ready && <span className="ml-auto text-[10px] font-normal text-white/25">soon</span>}
            </button>
          ))}
        </nav>

        <div className="on-fade-up mt-auto flex flex-col gap-2 border-t border-white/10 px-2 pt-3" style={{ animationDelay: '.3s' }}>
          <div className="flex items-center gap-2">
            <span className="on-live-dot h-2 w-2 rounded-full bg-[color:var(--0n-neon)]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-white/60">Live</span>
          </div>
          <div className="text-[11.5px] text-white/35">Managed by your agency</div>
        </div>
      </aside>
    </div>
  )
}

function Stat({ i, label, value, trend, trendTone = 'good', sub }: {
  i: number; label: string; value: string | null
  trend?: string | null; trendTone?: 'good' | 'bad'; sub: string
}) {
  return (
    <div className="on-card on-card-lift on-pop-in p-[18px]" style={{ animationDelay: `${i * 0.05}s` }}>
      <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[color:var(--dash-faint)]">{label}</div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-[30px] font-semibold tracking-[-0.02em] text-[color:var(--dash-ink)]">
          {/* A dash, never a 0 — "we could not read this" and "this is zero"
              are different facts and only one of them should worry anyone. */}
          {value ?? <span className="text-[color:var(--dash-faint)]">—</span>}
        </span>
        {trend && (
          <span className="text-[12px] font-semibold"
            style={{ color: trendTone === 'good' ? 'var(--status-success)' : 'var(--status-warning)' }}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-1 text-[12px] text-[color:var(--dash-muted)]">{sub}</div>
    </div>
  )
}

function Row({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <p className={`px-2.5 py-4 text-[13px] ${muted ? 'text-[color:var(--dash-muted)]' : ''}`}>{children}</p>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="oncore-app grid min-h-screen place-items-center bg-[color:var(--dash-canvas)] px-6 text-center">
      <div className="flex flex-col items-center">{children}</div>
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const fmt = (n: number | null) => (n == null ? null : n.toLocaleString())

function money(n: number | null): string | null {
  if (n == null) return null
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

/** "2h ago" / "Yesterday" — the comp's wording, not a timestamp. */
function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
