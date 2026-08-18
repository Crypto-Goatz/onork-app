'use client'

/**
 * Settings — five row-links, per crm-10-settings.png.
 *
 * Rows rather than a settings form: each of these is a different surface with
 * its own risk, and flattening them into one page is how someone deletes a
 * workspace while changing their notification preferences.
 *
 * Danger zone is red and last, and says what it does before you reach it.
 */
import Link from 'next/link'
import {
  Bell, ChevronRight, Link2, TriangleAlert, User, Users, type LucideIcon,
} from 'lucide-react'

interface Row {
  href: string
  label: string
  sub: string
  icon: LucideIcon
  danger?: boolean
  /** No destination yet. Rendered as text, never as a link to a 404. */
  soon?: boolean
}

/**
 * EVERY ONE OF THESE USED TO 404.
 *
 * All five pointed at /crm/settings/* pages that were never built, so the
 * Settings screen was five links to nothing — and clicking Profile inside the
 * CRM iframe dropped someone on a 404 page with a "Go to Dashboard" button,
 * which reads as the whole product being broken rather than one screen being
 * unfinished.
 *
 * Profile now goes where the real one lives. The rest say they are not built
 * yet and are not clickable. A row that admits it is coming is a smaller
 * failure than a row that pretends and then 404s.
 */
const ROWS: Row[] = [
  { href: '/crm/account', label: 'Profile', sub: 'Your name, email and connected identity', icon: User },
  { href: '/crm/setup', label: 'Connected services', sub: '0nMCP and the accounts 0nCORE can reach', icon: Link2 },
  { href: '/crm/clients', label: 'Clients & keys', sub: 'Which accounts are switched on, and their keys', icon: Users },
  { href: '', label: 'Notifications', sub: 'Failed runs, revoked keys, monthly summary', icon: Bell, soon: true },
  { href: '', label: 'Danger zone', sub: 'Disconnect all clients, delete workspace', icon: TriangleAlert, danger: true, soon: true },
]

export default function SettingsRows() {
  return (
    <div className="space-y-3">
      {ROWS.map((r) => {
        const Icon = r.icon
        const shell = [
          'flex items-center gap-3.5 rounded-2xl border p-4 transition-all duration-150',
          r.danger
            ? 'border-[color:var(--oc-red)]/30 bg-[color:var(--oc-card)]'
            : 'border-[color:var(--oc-border)] bg-[color:var(--oc-card)]',
          // Only the ones that go somewhere get a hover state. A row that
          // lights up under the cursor is a row promising a destination.
          r.soon ? 'opacity-60' : r.danger ? 'hover:border-[color:var(--oc-red)]/60' : 'hover:border-[color:var(--oc-border-h)]',
        ].join(' ')

        const inner = (
          <>
            <Icon className={`h-4.5 w-4.5 shrink-0 ${r.danger ? 'text-[color:var(--oc-red)]' : 'text-[color:var(--oc-green-d)]'}`} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className={`text-[14px] font-semibold ${r.danger ? 'text-[color:var(--oc-red)]' : 'text-[color:var(--oc-ink)]'}`}>
                  {r.label}
                </span>
                {r.soon && (
                  <span className="rounded-full bg-[color:var(--oc-hover)] px-2 py-0.5 text-[10.5px] font-semibold text-[color:var(--oc-muted)]">
                    not built yet
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[color:var(--oc-muted)]">{r.sub}</span>
            </span>
            {!r.soon && <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--oc-faint)]" />}
          </>
        )

        return r.soon
          ? <div key={r.label} className={shell}>{inner}</div>
          : <Link key={r.label} href={r.href} className={shell}>{inner}</Link>
      })}
    </div>
  )
}
