'use client'

/**
 * Surface B — the Client Console. The agency's customer, not the agency.
 *
 * THE CONSTRAINT THAT DRIVES EVERY DECISION HERE: this person has one account
 * and is not technical. No client switcher, no keys, no agency billing, no
 * capability glossary. If a control would ever make them ask "which account is
 * this?", it does not belong on this surface. That is why there is no scope
 * selector even though the same engine underneath is built around one.
 *
 * RECENT ACTIVITY IS THE POINT, not a footnote. An agency acting inside
 * someone's business is invisible by default, and invisible work is work that
 * gets cancelled. Plain sentences — "0n tagged 12 contacts" — are the whole
 * argument for the retainer.
 *
 * Surface B styling: white canvas, black rail on the RIGHT, logo lime for
 * accents, deep green for anything clickable.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Activity, CalendarDays, GitBranch, Inbox, LayoutGrid, Loader2,
  MessageSquare, Sparkles, Users,
} from 'lucide-react'
import { useSso, authHeaders } from '@/app/crm/useSso'

type Section = 'overview' | 'conversations' | 'contacts' | 'calendar' | 'pipeline' | 'content' | 'ask'

const NAV: { key: Section; label: string; icon: typeof Users; ready: boolean }[] = [
  { key: 'overview',      label: 'Overview',      icon: LayoutGrid,    ready: true },
  { key: 'conversations', label: 'Conversations', icon: MessageSquare, ready: false },
  { key: 'contacts',      label: 'Contacts',      icon: Users,         ready: false },
  { key: 'calendar',      label: 'Calendar',      icon: CalendarDays,  ready: false },
  { key: 'pipeline',      label: 'Pipeline',      icon: GitBranch,     ready: false },
  { key: 'content',       label: 'Content',       icon: Inbox,         ready: false },
  { key: 'ask',           label: 'Ask 0n',        icon: Sparkles,      ready: false },
]

interface Summary {
  account: { locationId: string; name: string }
  stats: { contacts: number | null; deals: number | null; workThisWeek: number }
  activity: { text: string; at: string }[]
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
    return <Center><Loader2 className="h-5 w-5 animate-spin text-[color:var(--oc-muted)]" /></Center>
  }
  if (sso.state !== 'authed') {
    // No OAuth button: this renders framed inside the client's CRM, and OAuth
    // is refused in an iframe.
    return (
      <Center>
        <p className="text-[15px] font-semibold text-[color:var(--oc-ink)]">Open this from your account</p>
        <p className="mt-1.5 max-w-xs text-[13.5px] text-[color:var(--oc-muted)]">
          This page signs you in automatically when opened from the menu inside your CRM.
        </p>
      </Center>
    )
  }

  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[900px] px-8 py-10">
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--oc-green-d)]">
              Your business
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">
              {data?.account.name ?? 'Loading…'}
            </h1>
          </header>

          {err && (
            <p className="mt-5 rounded-xl bg-[color:var(--oc-amber)]/10 px-4 py-3 text-[13px] text-[color:var(--oc-amber)]">{err}</p>
          )}

          {section === 'overview' && data && (
            <>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <Stat label="Contacts" value={data.stats.contacts} />
                <Stat label="Deals in play" value={data.stats.deals} />
                <Stat label="Things done this week" value={data.stats.workThisWeek} />
              </div>

              <section className="mt-8">
                <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--oc-muted)]">
                  <Activity className="h-3.5 w-3.5" /> Recent activity
                </h2>
                <div className="mt-3 rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-2">
                  {data.activity.length === 0 && (
                    <p className="px-3 py-4 text-[13px] text-[color:var(--oc-muted)]">
                      Nothing yet. Work your agency does in this account will appear here.
                    </p>
                  )}
                  {data.activity.map((a, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
                      <span className="text-[13.5px] text-[color:var(--oc-ink)]">{a.text}</span>
                      <span className="shrink-0 text-[11.5px] text-[color:var(--oc-faint)]">
                        {new Date(a.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11.5px] text-[color:var(--oc-faint)]">
                  Every line is something done in your account, in plain words.
                </p>
              </section>
            </>
          )}

          {section !== 'overview' && (
            <section className="mt-8 rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-8 text-center">
              <p className="text-[15px] font-semibold text-[color:var(--oc-ink)]">
                {NAV.find((n) => n.key === section)?.label} is not switched on yet
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[color:var(--oc-muted)]">
                Overview is live and reads from your real account. This section is designed and
                not yet wired — it will say so here until it genuinely works.
              </p>
            </section>
          )}
        </div>
      </main>

      {/* The rail is BLACK and on the RIGHT — Surface B. No client switcher,
          by design: this person has exactly one account. */}
      <nav className="sticky top-0 flex h-screen w-[236px] shrink-0 flex-col bg-[color:var(--oc-rail)] px-3 py-5">
        <div className="px-3 pb-4 text-[13px] font-bold tracking-tight text-white">0nCORE</div>
        {NAV.map(({ key, label, icon: Icon, ready }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            aria-current={section === key ? 'page' : undefined}
            className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] transition ${
              section === key ? 'bg-white/10 font-semibold text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {label}
            {/* Honest in the nav, not only after the click. */}
            {!ready && <span className="ml-auto text-[10px] text-white/30">soon</span>}
          </button>
        ))}
        <div className="mt-auto px-3 text-[11px] text-white/30">Managed by your agency</div>
      </nav>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-5">
      <p className="text-[11px] uppercase tracking-wide text-[color:var(--oc-muted)]">{label}</p>
      <p className="mt-1 text-[26px] font-semibold text-[color:var(--oc-ink)]">
        {value ?? <span className="text-[color:var(--oc-faint)]">—</span>}
      </p>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="oncore-app grid min-h-screen place-items-center bg-[color:var(--oc-bg)] px-6 text-center">
      <div className="flex flex-col items-center">{children}</div>
    </div>
  )
}
