'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Users, MessageSquare, Kanban, Calendar, FileText, CreditCard,
  Share2, Settings, BarChart3, FileSpreadsheet, Globe, Package, Tag,
} from 'lucide-react'

const CRM_NAV = [
  { href: '/dashboard/crm', label: 'Overview', icon: BarChart3, exact: true },
  { href: '/dashboard/crm/contacts', label: 'Contacts', icon: Users },
  { href: '/dashboard/crm/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/dashboard/crm/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/dashboard/crm/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/crm/invoices', label: 'Invoices', icon: FileText },
  { href: '/dashboard/crm/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/crm/social', label: 'Social Planner', icon: Share2 },
  { href: '/dashboard/crm/workflows', label: 'Workflows', icon: Globe },
  { href: '/dashboard/crm/products', label: 'Products', icon: Package },
  { href: '/dashboard/crm/forms', label: 'Forms', icon: FileSpreadsheet },
  { href: '/dashboard/crm/tags', label: 'Tags', icon: Tag },
  { href: '/dashboard/crm/settings', label: 'Settings', icon: Settings },
]

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full">
      {/* CRM Sidebar */}
      <div className="w-52 shrink-0 border-r border-white/[0.06] bg-white/[0.01] py-4 px-2 overflow-y-auto">
        <div className="px-3 mb-4">
          <h2 className="text-[11px] font-bold text-white/25 uppercase tracking-wider">CRM</h2>
        </div>
        <nav className="space-y-0.5">
          {CRM_NAV.map(item => {
            const Icon = item.icon
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                  isActive
                    ? 'bg-[#7ed957]/10 text-[#7ed957] font-semibold'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  )
}
