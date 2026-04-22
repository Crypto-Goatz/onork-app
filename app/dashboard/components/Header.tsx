'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { NotificationBell } from '@/components/NotificationBell'
import { TokenButton } from '@/components/token-modal'

export type LayoutMode = 'classic' | 'compact' | 'horizontal'

interface Location {
  id: string
  name: string
}

interface HeaderProps {
  userEmail?: string
  userName?: string
  onMenuToggle: () => void
  onLogout: () => void
  layoutMode?: LayoutMode
  onLayoutChange?: (mode: LayoutMode) => void
}

/* ─── Smart Search Navigation Items ─── */
const NAV_ITEMS = [
  // Core
  { label: 'Dashboard', href: '/dashboard', keywords: 'home overview main', icon: '📊' },
  { label: 'Chat with Jaxx', href: '/dashboard/chat', keywords: 'ai assistant conversation talk', icon: '💬' },
  { label: 'Analytics', href: '/dashboard/analytics', keywords: 'stats data traffic visitors ga4 google', icon: '📈' },
  // CRM
  { label: 'Contacts', href: '/dashboard/contacts', keywords: 'people clients leads crm customers', icon: '👥' },
  { label: 'Pipeline', href: '/dashboard/pipeline', keywords: 'deals opportunities sales stages funnel', icon: '🎯' },
  { label: 'Calendar', href: '/dashboard/calendar', keywords: 'events booking appointments schedule', icon: '📅' },
  { label: 'Invoices', href: '/dashboard/invoices', keywords: 'billing payments money charges', icon: '💳' },
  { label: 'Products', href: '/dashboard/products', keywords: 'catalog items pricing store', icon: '🏷' },
  // Marketing
  { label: 'Email Campaigns', href: '/dashboard/email/campaigns', keywords: 'email marketing newsletter blast', icon: '✉️' },
  { label: 'Social Planner', href: '/dashboard/social', keywords: 'social media posts facebook instagram linkedin', icon: '📱' },
  { label: 'Blog Engine', href: '/dashboard/blog', keywords: 'blog posts articles content writing seo', icon: '📝' },
  { label: 'Funnels', href: '/dashboard/funnels', keywords: 'funnel landing pages conversion', icon: '🔗' },
  { label: 'Forms', href: '/dashboard/forms', keywords: 'form survey intake submission', icon: '📋' },
  { label: 'Campaigns', href: '/dashboard/campaigns', keywords: 'campaign sms email drip sequence', icon: '📣' },
  // AI & Automation
  { label: 'Voice AI', href: '/dashboard/voice', keywords: 'voice agent phone call ai assistant', icon: '🎙' },
  { label: 'Agent Studio', href: '/dashboard/ai', keywords: 'agent builder ai tools mcp', icon: '🤖' },
  { label: 'Knowledge Base', href: '/dashboard/training', keywords: 'kb training knowledge brain docs', icon: '🧠' },
  { label: 'Workflows', href: '/dashboard/workflows', keywords: 'workflow automation triggers switches', icon: '⚡' },
  { label: 'Automations', href: '/dashboard/automations', keywords: 'automation sequence trigger workflow', icon: '🔄' },
  // Communication
  { label: 'Phone System', href: '/dashboard/phone', keywords: 'phone call sms numbers dialer', icon: '📞' },
  // Content
  { label: 'Media Manager', href: '/dashboard/files', keywords: 'files upload images media assets', icon: '📁' },
  { label: 'Documents', href: '/dashboard/documents', keywords: 'documents contracts proposals esign', icon: '📄' },
  { label: 'WordPress', href: '/dashboard/wordpress', keywords: 'wordpress site blog wp', icon: '🌐' },
  { label: 'Courses', href: '/dashboard/courses', keywords: 'course builder education training lessons', icon: '🎓' },
  // Admin
  { label: 'Brand Board', href: '/dashboard/brand', keywords: 'brand colors fonts design identity', icon: '🎨' },
  { label: 'Users', href: '/dashboard/users', keywords: 'users team members roles permissions', icon: '👤' },
  { label: 'Tasks', href: '/dashboard/tasks', keywords: 'tasks todo project management board', icon: '✓' },
  { label: 'Settings', href: '/dashboard/settings', keywords: 'settings configuration preferences account', icon: '⚙️' },
  { label: 'Security', href: '/dashboard/security', keywords: 'security audit trust score hipaa', icon: '🛡' },
  { label: 'Integrations', href: '/dashboard/integrations', keywords: 'integrations connect api services stripe', icon: '🔌' },
  { label: 'Agency', href: '/dashboard/agency', keywords: 'agency locations sub-accounts management', icon: '🏢' },
  { label: 'Marketplace', href: '/marketplace', keywords: 'marketplace addons plugins store buy', icon: '🛒' },
  { label: 'Downloads', href: '/dashboard/downloads', keywords: 'downloads install cli mcp server', icon: '⬇️' },
  // Quick actions
  { label: 'New Contact', href: '/dashboard/contacts?action=new', keywords: 'create new contact add person', icon: '➕' },
  { label: 'Send Email', href: '/dashboard/email/builder', keywords: 'compose new email send write', icon: '✏️' },
  { label: 'HIPAA Scanner', href: '/dashboard/hipaa', keywords: 'hipaa scan compliance healthcare security', icon: '🏥' },
]

const layoutOptions: { mode: LayoutMode; label: string }[] = [
  { mode: 'classic', label: 'Classic' },
  { mode: 'compact', label: 'Compact' },
  { mode: 'horizontal', label: 'Horizontal' },
]

export default function Header({ userEmail, userName, onMenuToggle, onLogout, layoutMode = 'classic', onLayoutChange }: HeaderProps) {
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const [showLocations, setShowLocations] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [activeLocation, setActiveLocation] = useState<string>('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/console/locations').then(r => r.json()).then(d => {
      const locs = d.locations || []
      setLocations(locs)
      if (d.activeLocationId) setActiveLocation(d.activeLocationId)
      else if (locs.length > 0) setActiveLocation(locs[0]?.id || '')
    }).catch(() => {})
  }, [])

  // Keyboard shortcut: / or Cmd+K to open search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === '/' || (e.metaKey && e.key === 'k')) && !searchOpen) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [searchOpen])

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 50)
      setSelectedIdx(0)
    }
  }, [searchOpen])

  const filtered = searchQuery.trim()
    ? NAV_ITEMS.filter(item => {
        const q = searchQuery.toLowerCase()
        return item.label.toLowerCase().includes(q) || item.keywords.includes(q)
      })
    : NAV_ITEMS.slice(0, 8)

  function handleSearchNav(href: string) {
    setSearchOpen(false)
    setSearchQuery('')
    router.push(href)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && filtered[selectedIdx]) { handleSearchNav(filtered[selectedIdx].href) }
  }

  async function switchLocation(id: string) {
    setActiveLocation(id)
    setShowLocations(false)
    await fetch('/api/console/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: id }),
    }).catch(() => {})
    window.location.reload()
  }

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.slice(0, 2).toUpperCase() || '0N'

  const activeName = locations.find(l => l.id === activeLocation)?.name || 'Select location'

  return (
    <>
      <header className="jp-header">
        <div className="jp-header-start">
          {layoutMode !== 'horizontal' && (
            <button className="jp-header-mobile-toggle" onClick={onMenuToggle}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {layoutMode === 'horizontal' && (
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', marginRight: 16, textDecoration: 'none' }}>
              <img src="/brand/0ncore-logo.png" alt="0nCore" style={{ height: 28, objectFit: 'contain' }} />
            </a>
          )}

          {/* ═══ Location Switcher — Clean ═══ */}
          <div style={{ position: 'relative', marginRight: 8 }}>
            <button
              onClick={() => { setShowLocations(!showLocations); setShowUserMenu(false); setShowLayoutMenu(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', height: 34,
                background: 'transparent',
                border: '1px solid var(--border, #30363d)',
                borderRadius: 8, color: 'var(--foreground, #f0f4f8)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', maxWidth: 180, transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary, #6EE05A)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border, #30363d)'}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary, #6EE05A)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeName}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, opacity: 0.4 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showLocations && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowLocations(false)} />
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4,
                  width: 280, background: 'var(--card, #161b22)', border: '1px solid var(--border, #30363d)',
                  borderRadius: 10, overflow: 'hidden', zIndex: 100,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)', maxHeight: 320, overflowY: 'auto',
                }}>
                  <div style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--border, #30363d)' }}>
                    Locations
                  </div>
                  {locations.map(loc => (
                    <button key={loc.id} onClick={() => switchLocation(loc.id)} style={{
                      width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                      background: 'transparent', border: 'none', borderBottom: '1px solid var(--border, #30363d)',
                      color: 'var(--foreground, #f0f4f8)', fontSize: 13, cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit', transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: loc.id === activeLocation ? 'var(--primary, #6EE05A)' : 'var(--border, #30363d)',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: loc.id === activeLocation ? 600 : 400, color: loc.id === activeLocation ? 'var(--primary, #6EE05A)' : 'inherit' }}>
                          {loc.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted-foreground, #6b7280)', fontFamily: 'monospace', marginTop: 1 }}>
                          {loc.id.substring(0, 20)}
                        </div>
                      </div>
                      {loc.id === activeLocation && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary, #6EE05A)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </button>
                  ))}
                  {locations.length === 0 && (
                    <div style={{ padding: '20px 14px', fontSize: 12, color: 'var(--muted-foreground)', textAlign: 'center' }}>No locations linked</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ═══ Search Trigger ═══ */}
          <button
            onClick={() => setSearchOpen(true)}
            className="jp-search"
            style={{ cursor: 'pointer' }}
          >
            <span className="jp-search-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <span className="jp-search-input" style={{ pointerEvents: 'none', opacity: 0.4 }}>Search or navigate...</span>
            <span className="jp-search-shortcut">/</span>
          </button>
        </div>

        <div className="jp-header-end">
          <TokenButton />
          <NotificationBell />

          {/* Layout */}
          <div style={{ position: 'relative' }}>
            <button className="jp-header-btn" onClick={() => { setShowLayoutMenu(!showLayoutMenu); setShowUserMenu(false) }} title="Layout">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zm10-3a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
              </svg>
            </button>
            {showLayoutMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowLayoutMenu(false)} />
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 160, background: 'var(--card, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 8, padding: 4, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                  {layoutOptions.map(opt => (
                    <button key={opt.mode} onClick={() => { onLayoutChange?.(opt.mode); setShowLayoutMenu(false) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', fontSize: 13, fontWeight: 500, color: layoutMode === opt.mode ? 'var(--primary, #6EE05A)' : 'var(--foreground, #f0f4f8)', background: layoutMode === opt.mode ? 'rgba(110,224,90,0.06)' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (layoutMode !== opt.mode) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if (layoutMode !== opt.mode) e.currentTarget.style.background = 'transparent' }}
                    >
                      {opt.label}
                      {layoutMode === opt.mode && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* User */}
          <div className="jp-header-user" onClick={() => { setShowUserMenu(!showUserMenu); setShowLayoutMenu(false) }} style={{ position: 'relative' }}>
            <div className="jp-header-user-info">
              <div className="jp-header-user-name">{userName || userEmail?.split('@')[0] || 'User'}</div>
              <div className="jp-header-user-role">Administrator</div>
            </div>
            <div className="jp-avatar">{initials}</div>
            {showUserMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowUserMenu(false)} />
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 200, background: 'var(--card, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 8, padding: 4, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                  <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--muted-foreground, #6b7280)', borderBottom: '1px solid var(--border, #30363d)', marginBottom: 4, fontFamily: 'monospace' }}>{userEmail}</div>
                  <a href="/dashboard/settings" style={{ display: 'block', padding: '8px 10px', fontSize: 13, color: 'var(--foreground, #f0f4f8)', textDecoration: 'none', borderRadius: 6, transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Settings</a>
                  <button onClick={onLogout} style={{ width: '100%', padding: '8px 10px', fontSize: 13, color: '#ef4444', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Sign Out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ═══ Smart Search Command Palette ═══ */}
      {searchOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9000, backdropFilter: 'blur(4px)' }} onClick={() => { setSearchOpen(false); setSearchQuery('') }} />
          <div style={{
            position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 520, zIndex: 9001,
            background: 'var(--card, #161b22)', border: '1px solid var(--border, #30363d)',
            borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            animation: 'searchIn 0.15s ease-out',
          }}>
            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border, #30363d)' }}>
              <svg width="18" height="18" fill="none" stroke="var(--muted-foreground, #6b7280)" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedIdx(0) }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search pages, tools, or actions..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--foreground, #f0f4f8)', fontSize: 15, fontFamily: 'inherit',
                }}
              />
              <kbd style={{ padding: '2px 6px', fontSize: 10, borderRadius: 4, border: '1px solid var(--border, #30363d)', color: 'var(--muted-foreground, #6b7280)', fontFamily: 'monospace' }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 360, overflowY: 'auto', padding: '4px 0' }}>
              {!searchQuery && (
                <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quick Navigation</div>
              )}
              {filtered.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted-foreground, #6b7280)', fontSize: 13 }}>No results for &ldquo;{searchQuery}&rdquo;</div>
              )}
              {filtered.map((item, i) => (
                <button
                  key={item.href}
                  onClick={() => handleSearchNav(item.href)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', border: 'none', cursor: 'pointer',
                    background: i === selectedIdx ? 'rgba(110,224,90,0.06)' : 'transparent',
                    color: i === selectedIdx ? 'var(--foreground, #f0f4f8)' : 'var(--muted-foreground, #9ca3af)',
                    fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
                    transition: 'background 0.1s',
                    borderLeft: i === selectedIdx ? '2px solid var(--primary, #6EE05A)' : '2px solid transparent',
                  }}
                >
                  <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{item.icon}</span>
                  <span style={{ fontWeight: i === selectedIdx ? 600 : 400 }}>{item.label}</span>
                  {i === selectedIdx && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>Enter ↵</span>
                  )}
                </button>
              ))}
            </div>

            {/* Footer hint */}
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border, #30363d)', display: 'flex', gap: 12, justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--muted-foreground, #6b7280)' }}>↑↓ navigate</span>
              <span style={{ fontSize: 10, color: 'var(--muted-foreground, #6b7280)' }}>↵ open</span>
              <span style={{ fontSize: 10, color: 'var(--muted-foreground, #6b7280)' }}>esc close</span>
            </div>
          </div>

          <style>{`
            @keyframes searchIn {
              from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.98); }
              to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
            }
          `}</style>
        </>
      )}
    </>
  )
}
