'use client'

import { useState, useEffect } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  success: '#6EE05A',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#60a5fa',
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        setNotifications(d.notifications || [])
        setUnread(d.unread || 0)
      })
      .catch(() => {})
  }, [])

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'all' }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          color: 'var(--text-secondary, #9ca3af)',
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.2s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#6EE05A',
            color: '#07080C',
            fontSize: 9,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 8px rgba(110,224,90,0.4)',
          }}>
            {unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            width: 360,
            maxHeight: 440,
            overflowY: 'auto',
            background: 'rgba(15,17,23,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            zIndex: 100,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-primary, #E8ECF4)',
              }}>
                Notifications
                {unread > 0 && (
                  <span style={{
                    marginLeft: 8,
                    fontSize: 10,
                    padding: '2px 7px',
                    borderRadius: 10,
                    background: 'rgba(110,224,90,0.12)',
                    color: '#6EE05A',
                    fontWeight: 600,
                  }}>
                    {unread} new
                  </span>
                )}
              </span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6EE05A',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications */}
            {notifications.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.25)',
                fontSize: 13,
              }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: n.read ? 'default' : 'pointer',
                    background: n.read ? 'transparent' : 'rgba(110,224,90,0.02)',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Status dot */}
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: n.read ? 'rgba(255,255,255,0.1)' : (TYPE_COLORS[n.type] || '#6EE05A'),
                      boxShadow: n.read ? 'none' : `0 0 6px ${TYPE_COLORS[n.type] || '#6EE05A'}`,
                      flexShrink: 0,
                      marginTop: 5,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12,
                        fontWeight: n.read ? 500 : 700,
                        color: n.read ? 'rgba(255,255,255,0.4)' : 'var(--text-primary, #E8ECF4)',
                        marginBottom: 3,
                      }}>
                        {n.title}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.3)',
                        lineHeight: 1.5,
                      }}>
                        {n.message.length > 150 ? n.message.slice(0, 150) + '...' : n.message}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.15)',
                        marginTop: 4,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
