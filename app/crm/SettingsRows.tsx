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
}

const ROWS: Row[] = [
  { href: '/crm/settings/profile', label: 'Profile', sub: 'Name, email, password', icon: User },
  { href: '/crm/settings/team', label: 'Team & roles', sub: 'Who can approve plans, who can only draft', icon: Users },
  { href: '/crm/settings/notifications', label: 'Notifications', sub: 'Failed runs, revoked keys, monthly summary', icon: Bell },
  { href: '/crm/settings/services', label: 'Connected services', sub: '0nMCP and the accounts 0nCORE can reach', icon: Link2 },
  { href: '/crm/settings/danger', label: 'Danger zone', sub: 'Disconnect all clients, delete workspace', icon: TriangleAlert, danger: true },
]

export default function SettingsRows() {
  return (
    <div className="space-y-3">
      {ROWS.map((r) => {
        const Icon = r.icon
        return (
          <Link
            key={r.href}
            href={r.href}
            className={[
              'flex items-center gap-3.5 rounded-2xl border p-4 transition-all duration-150',
              r.danger
                ? 'border-[color:var(--status-danger-dark)]/30 bg-[color:var(--console-card)] hover:border-[color:var(--status-danger-dark)]/60'
                : 'border-[color:var(--console-border)] bg-[color:var(--console-card)] hover:border-[color:var(--console-border-hover)]',
            ].join(' ')}
          >
            <Icon
              className={`h-[18px] w-[18px] shrink-0 ${
                r.danger ? 'text-[color:var(--status-danger-dark)]' : 'text-[color:var(--console-text-3)]'
              }`}
              strokeWidth={2}
            />
            <span className="min-w-0 flex-1">
              <span
                className={`block text-[14.5px] font-semibold ${
                  r.danger ? 'text-[color:var(--status-danger-dark)]' : 'text-[color:var(--console-text-1)]'
                }`}
              >
                {r.label}
              </span>
              <span className="mt-0.5 block text-[12.5px] text-[color:var(--console-text-3)]">{r.sub}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--console-text-3)]" />
          </Link>
        )
      })}
    </div>
  )
}
