'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

interface CompactSidebarProps {
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
        name: 'Workflows',
        href: '/dashboard/workflows',
        badge: 'RUNs',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        name: 'Training',
        href: '/dashboard/training',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ),
      },
      {
        name: 'Security',
        href: '/dashboard/security',
        badge: 'LIVE',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Apps',
    items: [
      {
        name: 'Chat (Jaxx)',
        href: '/dashboard/chat',
        badgeCyan: 'AI',
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
        name: 'Integrations',
        href: '/dashboard/integrations',
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
        name: 'Downloads',
        href: '/dashboard/downloads',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        ),
      },
      {
        name: 'Configuration',
        href: '/dashboard/config',
        icon: (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
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

export default function CompactSidebar({ isOpen, onClose, isAdmin }: CompactSidebarProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const isChildActive = (children?: SubNavItem[]) => {
    if (!children) return false
    return children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`jp-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />

      {/* Compact Sidebar */}
      <aside
        className={`jp-compact-sidebar ${isOpen ? 'open' : ''} ${expanded ? 'expanded' : ''}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => { setExpanded(false); setHoveredItem(null) }}
      >
        {/* Header */}
        <div className="jp-compact-sidebar-header" style={{ padding: '14px 0', display: 'flex', justifyContent: 'center' }}>
          <Link href="/dashboard" className="jp-compact-sidebar-brand" onClick={onClose}>
            <img src="/brand/0ncore-logo.png" alt="0nCore" style={{ width: 32, height: 32, objectFit: 'contain' }} />
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
                {group.label && expanded && (
                  <div className="jp-menu-group-label">{group.label}</div>
                )}
                {items.map((item) => {
                  const hasChildren = item.children && item.children.length > 0
                  const isActive = hasChildren
                    ? isChildActive(item.children)
                    : item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href)

                  return (
                    <div
                      key={item.href}
                      className="jp-compact-flyout-wrapper"
                      onMouseEnter={() => !expanded && hasChildren && setHoveredItem(item.name)}
                      onMouseLeave={() => !expanded && setHoveredItem(null)}
                    >
                      {hasChildren && !expanded ? (
                        <div
                          className={`jp-nav-item ${isActive ? 'active' : ''}`}
                          title={item.name}
                        >
                          <span className="jp-nav-icon">{item.icon}</span>
                        </div>
                      ) : hasChildren && expanded ? (
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
                      ) : (
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`jp-nav-item ${isActive ? 'active' : ''}`}
                          title={!expanded ? item.name : undefined}
                        >
                          <span className="jp-nav-icon">{item.icon}</span>
                          {expanded && (
                            <>
                              <span>{item.name}</span>
                              {item.badge && (
                                <span className="jp-nav-badge">{item.badge}</span>
                              )}
                              {item.badgeCyan && (
                                <span className="jp-nav-badge cyan">{item.badgeCyan}</span>
                              )}
                            </>
                          )}
                        </Link>
                      )}

                      {/* Flyout panel for compact mode */}
                      {hasChildren && !expanded && hoveredItem === item.name && (
                        <div className="jp-compact-flyout">
                          <div className="jp-compact-flyout-title">{item.name}</div>
                          {item.children!.map((child) => {
                            const isSubActive = pathname === child.href
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={onClose}
                                className={`jp-compact-flyout-item ${isSubActive ? 'active' : ''}`}
                              >
                                {child.name}
                              </Link>
                            )
                          })}
                        </div>
                      )}

                      {/* Inline sub-items when expanded */}
                      {hasChildren && expanded && (
                        <div className="jp-submenu open">
                          {item.children!.map((child) => {
                            const isSubActive = pathname === child.href
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
          {expanded ? (
            <>
              <div className="jp-sidebar-footer-label">Powered by</div>
              <div className="jp-sidebar-footer-value">
                <span className="jp-sidebar-footer-dot" />
                0nMCP v2.5.0
              </div>
            </>
          ) : (
            <div className="jp-sidebar-footer-value" style={{ justifyContent: 'center' }}>
              <span className="jp-sidebar-footer-dot" />
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
