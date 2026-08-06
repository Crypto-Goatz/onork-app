'use client'

import Link from 'next/link'
import { Building2, ListChecks, PanelRightClose, Terminal, Users, Sparkles, Home, Wrench, ScrollText, type LucideIcon } from 'lucide-react'

/**
 * The app's right-hand sidebar. ONE component, used by every page.
 *
 * Shared rather than copied because a nav that exists twice drifts: the day a
 * section is added, one copy gets it. It also keeps the billing line in a single
 * place, which matters because that line is a claim about money.
 *
 * ON THE RIGHT on purpose. The reading order of this product is command first,
 * result second — the thing you type into deserves the left edge and the
 * natural start of the line, with navigation as the thing you reach for after.
 */

export const NAV: { href: string; view?: 'dashboard' | 'clients' | 'automations'; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/', view: 'dashboard', label: 'Command', icon: Terminal },
  { href: '/clients', view: 'clients', label: 'Clients', icon: Users },
  { href: '/automations', view: 'automations', label: 'Automations & AI', icon: Sparkles },
  { href: '/tools', label: 'Tools', icon: Wrench },
  { href: '/log', label: 'History', icon: ScrollText },
]

export interface AppSidebarProps {
  /** Which nav item reads as current. 'home' for the welcome page. */
  current: 'home' | 'dashboard' | 'clients' | 'automations' | 'tools' | 'log'
  activeCount: number
  totalCount: number
  usageLabel: string
  onHide?: () => void
}

export default function AppSidebar({ current, activeCount, totalCount, usageLabel, onHide }: AppSidebarProps) {
  return (
    <aside className="oc-sidebar hidden w-[268px] shrink-0 lg:block">
      {/*
        Dark gradient + grid. The rail is chrome, not content — giving it its own
        surface stops it competing with the cards it sits beside and makes the
        page read as "tool" rather than "another white panel".

        The grid is two repeating-linear-gradients rather than an image: no
        request, no asset to lose, and it scales at any DPI. Held at 4% white so
        it reads as texture and never as lines to focus on.
      */}
      <div
        className="sticky top-[57px] flex max-h-[calc(100vh-57px)] flex-col gap-4 overflow-y-auto p-4"
        style={{
          backgroundColor: '#181D19',
          backgroundImage: [
            'repeating-linear-gradient(0deg, rgba(255,255,255,.04) 0 1px, transparent 1px 32px)',
            'repeating-linear-gradient(90deg, rgba(255,255,255,.04) 0 1px, transparent 1px 32px)',
            'radial-gradient(120% 80% at 50% 0%, rgba(110,224,90,.10) 0%, transparent 55%)',
            'linear-gradient(180deg, #1F2621 0%, #181D19 45%, #12160F 100%)',
          ].join(', '),
          borderLeft: '1px solid rgba(255,255,255,.07)',
        }}
      >

        <nav aria-label="Sections" className="space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon
            const on = n.href === '/dashboard' ? current === 'home'
              : n.href === '/tools' ? current === 'tools'
              : n.href === '/log' ? current === 'log'
              : n.view === current
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? 'page' : undefined}
                className={`group flex items-center gap-3 rounded-[13px] px-3 py-2.5 text-[13.5px] transition-all ${
                  on
                    ? 'bg-white/[0.10] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,.6)] ring-1 ring-inset ring-white/15'
                    : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-[color:var(--oc-green)]' : 'text-white/40 group-hover:text-[color:var(--oc-green)]'}`} />
                {n.label}
              </Link>
            )
          })}
        </nav>

        {/*
          WHAT THE AGENCY PAYS FOR, not a list of everything they own. Billing is
          per switched-on client — one free, the rest monthly — so a rail of all
          86 sub-accounts advertised work nobody is charged for and buried the
          number that actually matters.
        */}
        <section className="rounded-[16px] border border-white/10 bg-white/[0.05] p-3.5 backdrop-blur-sm">
          <div className="oc-mono mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-white/45">
            Switched on
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold leading-none text-white">{activeCount}</span>
            <span className="text-[12px] text-white/55">
              of {totalCount} client{totalCount === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-white/60">
            {activeCount === 0
              ? 'Your first client is free. Switch one on to start.'
              : activeCount === 1
                ? 'Your first client is free. Adding another is billed monthly.'
                : `${activeCount - 1} billed monthly, first one free.`}
          </p>
          <Link
            href="/clients"
            className="oc-chip mt-3 inline-flex w-full items-center justify-center gap-1.5 border border-white/15 bg-white/[0.06] px-3 py-2 text-white/80 transition-colors hover:border-[color:var(--oc-green)] hover:text-white"
          >
            <Building2 className="h-3.5 w-3.5" /> Manage clients
          </Link>
        </section>

        <section className="rounded-[16px] border border-white/10 bg-white/[0.05] p-3.5 backdrop-blur-sm">
          <div className="oc-mono mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[.12em] text-white/45">
            <span>Tasks</span>
            {onHide && (
              <button onClick={onHide} aria-label="Hide sidebar" className="text-white/70/40 transition-colors hover:text-white">
                <PanelRightClose className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-start gap-2.5">
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-white/70/35" />
            <p className="text-[11.5px] leading-relaxed text-white/70/70">
              People and agents share one list. Anything a command or a flow does lands here with a
              receipt against the right client.
            </p>
          </div>
        </section>

        <div className="mt-auto pt-1">
          <div className="oc-mono text-[10px] text-white/70/40">{usageLabel} this month</div>
        </div>
      </div>
    </aside>
  )
}
