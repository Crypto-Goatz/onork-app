'use client'

import { useState } from 'react'

interface HeaderProps {
  userEmail?: string
  userName?: string
  onMenuToggle: () => void
  onLogout: () => void
}

export default function Header({ userEmail, userName, onMenuToggle, onLogout }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.slice(0, 2).toUpperCase() || '0N'

  return (
    <header className="jp-header">
      <div className="jp-header-start">
        {/* Mobile toggle */}
        <button className="jp-header-mobile-toggle" onClick={onMenuToggle}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

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
          onClick={() => setShowUserMenu(!showUserMenu)}
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
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
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
