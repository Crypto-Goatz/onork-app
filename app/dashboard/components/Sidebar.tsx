'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  isAdmin?: boolean
}

interface SubNavItem {
  name: string
  href: string
}

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  badge?: string
  badgeCyan?: string
  children?: SubNavItem[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zm10-3a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: '0nAI',
    items: [
      /* AI Assistant removed from nav — owner-only hidden route at /dashboard/ai */
      {
        name: 'Brand Builder',
        href: '/dashboard/brand',
        badge: '0n',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        ),
      },
      {
        name: 'Automations',
        href: '/dashboard/automations',
        badge: 'NEW',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        ),
      },
      {
        name: 'Courses',
        href: '/dashboard/courses',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
          </svg>
        ),
      },
      {
        name: 'Voice AI',
        href: '/dashboard/voice',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Manage',
    items: [
      {
        name: 'Contacts',
        href: '/dashboard/contacts',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        children: [
          { name: 'All Contacts', href: '/dashboard/contacts' },
          { name: 'Import Contacts', href: '/dashboard/contacts/import' },
          { name: 'Segments', href: '/dashboard/contacts/segments' },
        ],
      },
      {
        name: 'Pipeline',
        href: '/dashboard/pipeline',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        ),
        children: [
          { name: 'Board View', href: '/dashboard/pipeline' },
          { name: 'List View', href: '/dashboard/pipeline/list' },
        ],
      },
      {
        name: 'Domains',
        href: '/dashboard/domains',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Apps',
    items: [
      {
        name: 'Chat',
        href: '/dashboard/chat',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
      },
      {
        name: 'Email',
        href: '/dashboard/email',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        children: [
          { name: 'Inbox', href: '/dashboard/email' },
          { name: 'Compose', href: '/dashboard/email?compose=true' },
          { name: 'Templates', href: '/dashboard/email/templates' },
        ],
      },
      {
        name: 'Social',
        href: '/dashboard/social',
        badge: 'social0n',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        ),
      },
      {
        name: 'Workflows',
        href: '/dashboard/workflows',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        name: 'Notes',
        href: '/dashboard/notes',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
      },
      {
        name: 'File Manager',
        href: '/dashboard/files',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        ),
      },
      {
        name: 'Calendar',
        href: '/dashboard/calendar',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        name: 'Connections',
        href: '/dashboard/connections',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        name: 'Invoices',
        href: '/dashboard/invoices',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
        ),
      },
      {
        name: 'Billing',
        href: '/dashboard/billing',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      },
      {
        name: 'Affiliates',
        href: '/dashboard/affiliates',
        badge: '30%',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        name: 'Downloads',
        href: '/dashboard/downloads',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        ),
      },
      {
        name: 'Settings',
        href: '/dashboard/settings',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
]

const agencyItem: NavItem = {
  name: 'Agency',
  href: '/dashboard/agency',
  badge: 'HQ',
  icon: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
}

const adminItem: NavItem = {
  name: 'Admin',
  href: '/dashboard/admin',
  badge: 'ADMIN',
  icon: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
}

export default function Sidebar({ isOpen, onClose, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  // Auto-expand parent items if child is active
  const isChildActive = (children?: SubNavItem[]) => {
    if (!children) return false
    return children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`jp-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className={`jp-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="jp-sidebar-header">
          <Link href="/dashboard" className="jp-sidebar-brand" onClick={onClose}>
            <img src="/logo.png" alt="0nCore" style={{ height: 32, objectFit: 'contain' }} />
          </Link>
        </div>

        {/* Nav */}
        <div className="jp-sidebar-body">
          {navGroups.map((group, gi) => {
            const items = group.label === 'Account' && isAdmin
              ? [...group.items, agencyItem, adminItem]
              : group.items
            return (
              <div className="jp-menu-group" key={gi}>
                {group.label && (
                  <div className="jp-menu-group-label">{group.label}</div>
                )}
                {items.map((item) => {
                  const hasChildren = item.children && item.children.length > 0
                  const isExpanded = expandedItems.has(item.name) || isChildActive(item.children)
                  const isActive = hasChildren
                    ? false
                    : item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href)

                  return (
                    <div key={item.href}>
                      {hasChildren ? (
                        <button
                          onClick={() => toggleExpand(item.name)}
                          className={`jp-nav-item jp-nav-parent ${isChildActive(item.children) ? 'active' : ''}`}
                        >
                          <span className="jp-nav-icon">{item.icon}</span>
                          <span>{item.name}</span>
                          {item.badge && (
                            <span className="jp-nav-badge">{item.badge}</span>
                          )}
                          {item.badgeCyan && (
                            <span className="jp-nav-badge cyan">{item.badgeCyan}</span>
                          )}
                          <span className={`jp-submenu-indicator ${isExpanded ? 'expanded' : ''}`}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4.5 3L7.5 6L4.5 9" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </button>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`jp-nav-item ${isActive ? 'active' : ''}`}
                        >
                          <span className="jp-nav-icon">{item.icon}</span>
                          <span>{item.name}</span>
                          {item.badge && (
                            <span className="jp-nav-badge">{item.badge}</span>
                          )}
                          {item.badgeCyan && (
                            <span className="jp-nav-badge cyan">{item.badgeCyan}</span>
                          )}
                        </Link>
                      )}

                      {/* Sub-menu */}
                      {hasChildren && (
                        <div className={`jp-submenu ${isExpanded ? 'open' : ''}`}>
                          {item.children!.map((child) => {
                            const isSubActive = pathname === child.href ||
                              (child.href !== '/dashboard/contacts' && child.href !== '/dashboard/pipeline' && child.href !== '/dashboard/email' && pathname.startsWith(child.href))
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={onClose}
                                className={`jp-submenu-item ${isSubActive ? 'active' : ''}`}
                              >
                                {child.name}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="jp-sidebar-footer">
          <div className="jp-sidebar-footer-label">Powered by</div>
          <div className="jp-sidebar-footer-value">
            <span className="jp-sidebar-footer-dot" />
            0nMCP v2.5.0
          </div>
        </div>
      </aside>
    </>
  )
}
