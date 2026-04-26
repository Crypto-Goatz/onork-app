'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Users, MessageSquare, Kanban, Calendar, FileText, CreditCard,
  Share2, Settings, BarChart3, FileSpreadsheet, Globe, Package, Tag,
  ArrowLeft,
} from 'lucide-react'

const CRM_NAV = [
  { href: '/crm', label: 'Overview', icon: BarChart3, exact: true },
  { href: '/crm/contacts', label: 'Contacts', icon: Users },
  { href: '/crm/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/crm/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/crm/calendar', label: 'Calendar', icon: Calendar },
  { href: '/crm/invoices', label: 'Invoices', icon: FileText },
  { href: '/crm/payments', label: 'Payments', icon: CreditCard },
  { href: '/crm/social', label: 'Social Planner', icon: Share2 },
  { href: '/crm/workflows', label: 'Workflows', icon: Globe },
  { href: '/crm/products', label: 'Products', icon: Package },
  { href: '/crm/forms', label: 'Forms', icon: FileSpreadsheet },
  { href: '/crm/tags', label: 'Tags', icon: Tag },
  { href: '/crm/settings', label: 'Settings', icon: Settings },
]

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-[#0a0e17]">
      {/* CRM Sidebar */}
      <div className="w-56 shrink-0 border-r border-white/[0.06] bg-[#0d1117] py-4 px-2 overflow-y-auto flex flex-col">
        {/* Back + Title */}
        <div className="px-3 mb-5">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-3 no-underline">
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7ed957]/10 flex items-center justify-center">
              <span className="text-[11px] font-black text-[#7ed957]">CRM</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">0nCore CRM</h2>
              <p className="text-[10px] text-white/25">SDK-powered</p>
            </div>
          </div>
        </div>

        <nav className="space-y-0.5 flex-1">
          {CRM_NAV.map(item => {
            const Icon = item.icon
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href) && item.href !== '/crm'
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors no-underline ${
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

        <div className="px-3 pt-4 border-t border-white/[0.06]">
          <p className="text-[10px] text-white/15">0nCore CRM v1.0</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  )
}
