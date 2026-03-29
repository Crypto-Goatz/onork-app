'use client'

import { useState, useEffect } from 'react'

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

const layoutOptions: { mode: LayoutMode; label: string; icon: React.ReactNode }[] = [
  {
    mode: 'classic',
    label: 'Classic',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} style={{ width: 16, height: 16 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v16H4zM14 4h6v16h-6z" />
      </svg>
    ),
  },
  {
    mode: 'compact',
    label: 'Compact',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} style={{ width: 16, height: 16 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h3v16H4zM11 4h9v16h-9z" />
      </svg>
    ),
  },
  {
    mode: 'horizontal',
    label: 'Horizontal',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} style={{ width: 16, height: 16 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v4H4zM4 12h16v8H4z" />
      </svg>
    ),
  },
]

export default function Header({ userEmail, userName, onMenuToggle, onLogout, layoutMode = 'classic', onLayoutChange }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const [showLocations, setShowLocations] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [activeLocation, setActiveLocation] = useState<string>('')

  useEffect(() => {
    fetch('/api/crm/locations').then(r => r.json()).then(d => {
      if (d.locations) setLocations(d.locations)
    }).catch(() => {})
    // Get active from localStorage
    const saved = localStorage.getItem('0ncore-active-location')
    if (saved) setActiveLocation(saved)
  }, [])

  async function switchLocation(id: string) {
    setActiveLocation(id)
    localStorage.setItem('0ncore-active-location', id)
    setShowLocations(false)
    await fetch('/api/crm/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: id }),
    }).catch(() => {})
    window.location.reload()
  }

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.slice(0, 2).toUpperCase() || '0N'

  return (
    <header className="jp-header">
      <div className="jp-header-start">
        {/* Mobile toggle */}
        {layoutMode !== 'horizontal' && (
          <button className="jp-header-mobile-toggle" onClick={onMenuToggle}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Logo for horizontal layout */}
        {layoutMode === 'horizontal' && (
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', marginRight: 16, textDecoration: 'none' }}>
            <img src="/logo.png" alt="0nCore" style={{ height: 28, objectFit: 'contain' }} />
          </a>
        )}

        {/* Location Switcher */}
        {locations.length > 1 && (
          <div style={{ position: 'relative', marginRight: 12 }}>
            <button onClick={() => setShowLocations(!showLocations)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', background: 'var(--jp-bg-card)', border: '1px solid var(--jp-border)',
              borderRadius: 8, color: 'var(--jp-text-secondary)', fontSize: 12, cursor: 'pointer',
              maxWidth: 180, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>
              <span style={{ fontSize: 10 }}>📍</span>
              {locations.find(l => l.id === activeLocation)?.name || 'Select location'}
              <span style={{ fontSize: 9, marginLeft: 'auto' }}>▼</span>
            </button>
            {showLocations && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                width: 240, background: '#FFFFFF', border: '1px solid #E9EDF7',
                borderRadius: 10, overflow: 'hidden', zIndex: 100,
                boxShadow: '0 12px 40px rgba(0,0,0,0.1)', maxHeight: 300, overflowY: 'auto',
              }}>
                {locations.map(loc => (
                  <button key={loc.id} onClick={() => switchLocation(loc.id)} style={{
                    width: '100%', padding: '10px 14px', background: loc.id === activeLocation ? '#F0F2F8' : 'transparent',
                    border: 'none', borderBottom: '1px solid #E9EDF7',
                    color: loc.id === activeLocation ? '#6EE05A' : '#2B3674',
                    fontSize: 13, cursor: 'pointer', textAlign: 'left',
                    fontWeight: loc.id === activeLocation ? 600 : 400,
                  }}>{loc.name}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="jp-search">
          <span className="jp-search-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            className="jp-search-input"
            placeholder="Search anything..."
            readOnly
          />
          <span className="jp-search-shortcut">/</span>
        </div>
      </div>

      <div className="jp-header-end">
        {/* Layout Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            className="jp-header-btn"
            onClick={() => { setShowLayoutMenu(!showLayoutMenu); setShowUserMenu(false) }}
            title="Switch layout"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zm10-3a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
            </svg>
          </button>

          {showLayoutMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                width: 180,
                background: 'var(--jp-bg-card)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius-sm)',
                padding: 6,
                zIndex: 1050,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  padding: '6px 10px',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'var(--jp-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 2,
                }}
              >
                Layout
              </div>
              {layoutOptions.map(opt => (
                <button
                  key={opt.mode}
                  onClick={() => {
                    onLayoutChange?.(opt.mode)
                    setShowLayoutMenu(false)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: layoutMode === opt.mode ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                    background: layoutMode === opt.mode ? 'var(--jp-green-glow)' : 'none',
                    border: 'none',
                    borderRadius: 'var(--jp-radius-xs)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (layoutMode !== opt.mode) e.currentTarget.style.background = '#F5F6FA'
                  }}
                  onMouseLeave={(e) => {
                    if (layoutMode !== opt.mode) e.currentTarget.style.background = 'none'
                  }}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                  {layoutMode === opt.mode && (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} style={{ width: 14, height: 14, marginLeft: 'auto' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="jp-header-btn">
          <span className="jp-header-indicator" />
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* User */}
        <div
          className="jp-header-user"
          onClick={() => { setShowUserMenu(!showUserMenu); setShowLayoutMenu(false) }}
          style={{ position: 'relative' }}
        >
          <div className="jp-header-user-info">
            <div className="jp-header-user-name">{userName || userEmail?.split('@')[0] || 'User'}</div>
            <div className="jp-header-user-role">Administrator</div>
          </div>
          <div className="jp-avatar">{initials}</div>

          {/* Dropdown */}
          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                width: 200,
                background: 'var(--jp-bg-card)',
                border: '1px solid var(--jp-border)',
                borderRadius: 'var(--jp-radius-sm)',
                padding: 8,
                zIndex: 1050,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  color: 'var(--jp-text-muted)',
                  borderBottom: '1px solid var(--jp-border)',
                  marginBottom: 4,
                }}
              >
                {userEmail}
              </div>
              <button
                onClick={onLogout}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '0.8125rem',
                  color: 'var(--jp-red)',
                  background: 'none',
                  border: 'none',
                  borderRadius: 'var(--jp-radius-xs)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(238,93,80,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
