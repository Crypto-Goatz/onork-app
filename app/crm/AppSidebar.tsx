'use client'

/**
 * The agency rail — 236px, left, Console dark.
 *
 * Rebuilt to design_handoff_0ncore. It moved from the right to the left because
 * the handoff's layout puts navigation first and the content column at
 * max-width 840px beside it; a right rail leaves the content column floating.
 *
 * TEN ITEMS IN THREE GROUPS, and the grouping carries meaning: what you DO
 * (Command, Clients, Actions), what you BUILD (Automations, Content, Pipeline),
 * and what you CHECK (History, Plan & Usage, Setup, Settings). A flat list of
 * ten reads as ten equal choices, which none of them are.
 *
 * ONE component, used by every page. A nav that exists twice drifts: the day a
 * section is added, only one copy gets it.
 */
import Link from 'next/link'
import Image from 'next/image'
import {
  BookOpen, CreditCard, FileText, GitBranch, Plug, ScrollText, Settings,
  Sparkles, Terminal, Users, type LucideIcon,
} from 'lucide-react'

export type NavKey =
  | 'command' | 'clients' | 'actions'
  | 'automations' | 'content' | 'pipeline'
  | 'history' | 'usage' | 'setup' | 'settings'
  // Legacy keys still passed by older pages — kept so nothing 404s mid-port.
  | 'home' | 'dashboard' | 'tools' | 'log'

interface NavItem {
  key: NavKey
  href: string
  label: string
  icon: LucideIcon
  /**
   * AgencyDashboard switches between these three IN PAGE rather than
   * navigating, so its nav highlights on `view`, not on the route.
   */
  view?: 'dashboard' | 'clients' | 'automations'
}

/** Groups are rendered with a divider between them. */
export const NAV_GROUPS: NavItem[][] = [
  [
    { key: 'command', href: '/crm', label: 'Command', icon: Terminal, view: 'dashboard' },
    { key: 'clients', href: '/crm/clients', label: 'Clients', icon: Users, view: 'clients' },
    { key: 'actions', href: '/crm/actions', label: 'Actions', icon: BookOpen },
  ],
  [
    { key: 'automations', href: '/crm/automations', label: 'Automations & AI', icon: Sparkles, view: 'automations' },
    { key: 'content', href: '/crm/courses', label: 'Content', icon: FileText },
    { key: 'pipeline', href: '/crm/pipeline', label: 'Pipeline', icon: GitBranch },
  ],
  [
    { key: 'history', href: '/crm/log', label: 'History', icon: ScrollText },
    { key: 'usage', href: '/crm/billing', label: 'Plan & Usage', icon: CreditCard },
    { key: 'setup', href: '/crm/setup', label: 'Setup & Keys', icon: Plug },
    { key: 'settings', href: '/crm/settings', label: 'Settings', icon: Settings },
  ],
]

/**
 * Flat list of every item, in order.
 *
 * Kept because AgencyDashboard renders the mobile nav from it — the grouping is
 * a desktop-rail concern, and a phone showing three divider-separated groups in
 * a horizontal strip reads as noise.
 */
export const NAV: NavItem[] = NAV_GROUPS.flat()

/** Old callers pass these; map them onto the new keys rather than break. */
const ALIAS: Partial<Record<NavKey, NavKey>> = {
  home: 'command', dashboard: 'command', tools: 'actions', log: 'history',
}

export interface AppSidebarProps {
  current: NavKey
  activeCount: number
  totalCount: number
  usageLabel: string
  /** The free account's name — it is the default target, so it is named here. */
  freeAccountName?: string | null
  onHide?: () => void
}

export default function AppSidebar({
  current, activeCount, totalCount, usageLabel, freeAccountName,
}: AppSidebarProps) {
  const active = ALIAS[current] ?? current

  return (
    <aside className="oc-rail hidden w-[236px] shrink-0 border-r border-[#21262d] bg-[color:var(--oc-bg)] lg:block">
      <div className="sticky top-0 flex max-h-screen min-h-screen flex-col gap-5 overflow-y-auto p-4">
        <Link href="/crm" className="block px-2 pt-2" aria-label="0nCORE home">
          {/* NOT the file the handoff README names. The assets are named for
              the SURFACE they sit on, not the ink they contain:
                0ncore-logo-dark.png  = WHITE wordmark → dark surfaces (this rail)
                0ncore-logo-light.png = INK wordmark   → light surfaces
              The README says the opposite; the files are the authority. Using
              -light here put a near-black "0n" on a #0d1117 rail. */}
          <Image
            src="/0ncore-logo-dark.png"
            alt="0nCORE"
            width={120}
            height={26}
            className="h-[26px] w-auto object-contain"
            priority
          />
        </Link>

        <nav aria-label="Sections" className="flex-1 space-y-4">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="space-y-1">
              {gi > 0 && <div className="mb-3 h-px bg-[#21262d]" />}
              {group.map((n) => {
                const Icon = n.icon
                const on = active === n.key
                return (
                  <Link
                    key={n.key}
                    href={n.href}
                    aria-current={on ? 'page' : undefined}
                    className={[
                      'group flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] font-medium transition-all duration-150',
                      on
                        ? 'bg-[#21262d] text-white shadow-[inset_2px_0_0_0_var(--oc-green-d)]'
                        : 'text-[#8b949e] hover:translate-x-0.5 hover:bg-[#21262d] hover:text-[#e6edf3]',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {n.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* The answer to "why did that fail", kept where you never hunt for it. */}
        <div className="rounded-xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--oc-green-d)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--oc-green-d)]" />
            </span>
            <span className="text-[12px] text-[#c9d1d9]">
              {activeCount} of {totalCount} clients switched on
            </span>
          </div>
          <div className="mt-1.5 text-[12px] text-[#8b949e]">{usageLabel} this month</div>
          {freeAccountName && (
            <div className="mt-1.5 flex items-baseline gap-1.5 text-[11px]">
              <span className="shrink-0 text-[#8b949e]">Free account</span>
              <span className="truncate font-mono text-[color:var(--oc-green-d)]">{freeAccountName}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
