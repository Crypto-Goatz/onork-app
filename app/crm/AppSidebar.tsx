'use client'

/**
 * The agency rail — 236px, RIGHT, Console dark (#0d1117).
 *
 * Rebuilt to design_handoff_0ncore 3. This docstring used to claim the rail had
 * moved to the LEFT and gave a reason; it never did — AgencyDashboard renders it
 * after <main> and always has, and crm-01-command.png shows it on the right.
 * A comment that contradicts the file it sits in is worse than none.
 *
 * Right on both surfaces is the point: the content column stays where the eye
 * lands, and the two products differ by rail COLOUR (#0d1117 here, pure black on
 * the Client Console) rather than by layout.
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
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import {
  UserCircle,
  BookOpen, Blocks, CreditCard, Download, FileText, GitBranch, LayoutTemplate, LogOut, Plug,
  ScrollText, Settings, Sparkles, Terminal, Users, Wrench, type LucideIcon,
  CheckSquare, CalendarDays, ExternalLink, ClipboardList, Building2, ListTodo, Boxes,
} from 'lucide-react'

export type NavKey =
  | 'command' | 'clients' | 'actions' | 'account'
  | 'automations' | 'content' | 'pipeline' | 'build' | 'addons'
  | 'history' | 'usage' | 'setup' | 'downloads' | 'settings'
  | 'tools' | 'flows'
  | 'contacts' | 'tasks' | 'calendar' | 'forms' | 'ontask' | 'on3'
  // Legacy keys still passed by older pages — kept so nothing 404s mid-port.
  | 'home' | 'dashboard' | 'log'

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
  /** A sibling app — opens in a new tab. */
  external?: boolean
}

/**
 * THE SDK SHELL (Mike, 2026-11-24): "0ncore simply needs to be shaved down to be
 * an SDK for the CRM with simple task, calendar, contact and form management and
 * creation … anything else we can add in there or keep that works perfect, then
 * keep it."
 *
 * So the rail shows the four SDK surfaces, the pages that connect an account,
 * the account itself, and the two sibling apps. Everything else is in
 * HIDDEN_NAV — still routable, out of the rail. To bring one back, move its
 * entry into NAV_GROUPS. Nothing was deleted.
 */
export const NAV_GROUPS: NavItem[][] = [
  [
    { key: 'contacts', href: '/crm/contacts', label: 'Contacts', icon: Users },
    { key: 'tasks', href: '/crm/tasks', label: 'Tasks', icon: CheckSquare },
    { key: 'calendar', href: '/crm/calendar', label: 'Calendar', icon: CalendarDays },
    { key: 'forms', href: '/crm/forms', label: 'Forms', icon: ClipboardList },
  ],
  [
    { key: 'clients', href: '/crm/clients', label: 'CRM accounts', icon: Building2, view: 'clients' },
    { key: 'setup', href: '/crm/setup', label: 'Setup & Keys', icon: Plug },
  ],
  [
    { key: 'usage', href: '/crm/billing', label: 'Plan & Usage', icon: CreditCard },
    { key: 'account', href: '/crm/account', label: 'Your account', icon: UserCircle },
    { key: 'settings', href: '/crm/settings', label: 'Settings', icon: Settings },
  ],
  [
    // The family: same sign-in (one identity, joined on email).
    { key: 'ontask', href: 'https://app.0ntask.com', label: '0nTask', icon: ListTodo, external: true },
    { key: 'on3', href: 'https://0n3.app', label: '0n3', icon: Boxes, external: true },
  ],
]

/** Out of the rail on 2026-11-24, still live at their URLs. Move back into NAV_GROUPS to restore. */
export const HIDDEN_NAV: NavItem[] = [
  { key: 'command', href: '/crm/command', label: 'Command', icon: Terminal, view: 'dashboard' },
  { key: 'actions', href: '/crm/actions', label: 'Actions', icon: BookOpen },
  { key: 'automations', href: '/crm/automations', label: 'Automations & AI', icon: Sparkles, view: 'automations' },
  { key: 'flows', href: '/crm/flows', label: 'Flows', icon: GitBranch },
  { key: 'content', href: '/crm/courses', label: 'Content', icon: FileText },
  { key: 'build', href: '/crm/build', label: 'Build a site', icon: LayoutTemplate },
  { key: 'pipeline', href: '/crm/pipeline', label: 'Pipeline', icon: GitBranch },
  { key: 'tools', href: '/crm/tools', label: 'Tools', icon: Wrench },
  { key: 'addons', href: '/marketplace', label: 'Add-ons', icon: Blocks },
  { key: 'history', href: '/crm/log', label: 'History', icon: ScrollText },
  { key: 'downloads', href: '/crm/downloads', label: 'Downloads', icon: Download },
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
  home: 'command', dashboard: 'command', log: 'history',
}

export interface AppSidebarProps {
  current: NavKey
  activeCount: number
  totalCount: number
  usageLabel: string
  /** The free account's name — it is the default target, so it is named here. */
  freeAccountName?: string | null
  onHide?: () => void
  /** Sign out lives here now that the surface has no header bar. */
  onSignOut?: () => void
  /**
   * The live connection state, in four flavours rather than two.
   *
   * "Not connected" used to cover being mid-handshake, being signed in with
   * nothing installed, and having the sign-in refused — three problems with
   * three different fixes, all wearing the same amber dot. It rides here
   * because the status block is where someone looks to answer "why did that
   * fail", and a dot that is always green answers nothing.
   */
  connection?: { dot: string; label: string }
}

export default function AppSidebar({
  current, activeCount, totalCount, usageLabel, freeAccountName, onSignOut, connection,
}: AppSidebarProps) {
  const active = ALIAS[current] ?? current

  return (
    /* #0d1117, not the pure black of the Client Console. The two rails are
       deliberately different: the console-dark family (#0d1117 page, #21262d
       hover) is what the Agency CRM is built from, and an operator who has both
       surfaces open should never have to read a label to know which is which. */
    <aside className="oc-rail hidden w-[236px] shrink-0 bg-[color:var(--console-page)] lg:block">
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
              {gi > 0 && <div className="mb-3 h-px bg-white/10" />}
              {group.map((n) => {
                const Icon = n.icon
                const on = active === n.key
                if (n.external) return (
                  <a key={n.key} href={n.href} target="_blank" rel="noreferrer"
                    className="group flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] font-medium text-[#8b949e] transition-all duration-150 hover:translate-x-0.5 hover:bg-[#21262d] hover:text-[#e6edf3]">
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {n.label}
                    <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
                  </a>
                )
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
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {/* Only a genuinely live connection pulses. A pulsing dot is a
                  claim that something is running. */}
              {!connection || connection.label === 'live' ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--0n-neon)] opacity-60" />
              ) : null}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${connection?.dot ?? 'bg-[color:var(--0n-neon)]'}`} />
            </span>
            <span className="text-[12px] text-white/80">
              {activeCount} of {totalCount} clients switched on
            </span>
          </div>
          <div className="mt-1.5 text-[12px] text-white/50">
            {usageLabel} this month
            {connection && connection.label !== 'live' && (
              <> · <span className="text-white/70">{connection.label}</span></>
            )}
          </div>
          {freeAccountName && (
            <div className="mt-1.5 flex items-baseline gap-1.5 text-[11px]">
              <span className="shrink-0 text-white/50">Free account</span>
              <span className="truncate font-mono text-[color:var(--oc-green-d)]">{freeAccountName}</span>
            </div>
          )}
        </div>

        {/* The comp has no header bar, so the one control that used to live
            there and has nowhere else to go comes down here. */}
        {/* Sign out is ALWAYS rendered.
            It used to require the parent to pass onSignOut, and 13 of the 14
            pages that render this sidebar never did — so there was no way to
            log out of /crm/settings, /crm/setup or anywhere else except the
            agency dashboard. A control that every screen needs cannot depend
            on every screen remembering to wire it. The prop still wins when
            given, so the one page that customises it keeps its behaviour. */}
        {(
          <button
            type="button"
            onClick={onSignOut ?? (async () => {
              try { await createClient().auth.signOut() } catch { /* already gone */ }
              window.location.href = '/login?next=/crm'
            })}
            className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-[#8b949e] transition-colors hover:bg-[#21262d] hover:text-[#e6edf3]"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} /> Sign out
          </button>
        )}
      </div>
    </aside>
  )
}
