'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'

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
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative bg-transparent border-none cursor-pointer p-1.5 text-[#9ca3af] flex items-center transition-colors duration-200"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#6EE05A] text-[#07080C] text-[9px] font-extrabold flex items-center justify-center shadow-[0_0_8px_rgba(110,224,90,0.4)]">
            {unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-[360px] max-h-[440px] overflow-y-auto bg-[#0f1117]/95 backdrop-blur-xl border border-white/[.06] rounded-[14px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] z-[100]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[.06]">
              <span className="text-[13px] font-bold text-[#f0f4f8]">
                Notifications
                {unread > 0 && (
                  <span className="ml-2 text-[10px] px-[7px] py-0.5 rounded-[10px] bg-[#6EE05A]/[.12] text-[#6EE05A] font-semibold">
                    {unread} new
                  </span>
                )}
              </span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="bg-transparent border-none text-[#6EE05A] text-[11px] cursor-pointer font-semibold"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications */}
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center text-white/25 text-[13px]">
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={[
                    'px-4 py-3 border-b border-white/[.03] transition-[background] duration-150',
                    n.read ? 'cursor-default bg-transparent' : 'cursor-pointer bg-[#6EE05A]/[.02]',
                  ].join(' ')}
                >
                  <div className="flex gap-2.5 items-start">
                    {/* Status dot */}
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-[5px]"
                      style={{
                        background: n.read ? 'rgba(255,255,255,0.1)' : (TYPE_COLORS[n.type] || '#6EE05A'),
                        boxShadow: n.read ? 'none' : `0 0 6px ${TYPE_COLORS[n.type] || '#6EE05A'}`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={[
                        'text-[12px] mb-[3px]',
                        n.read ? 'font-medium text-white/40' : 'font-bold text-[#f0f4f8]',
                      ].join(' ')}>
                        {n.title}
                      </div>
                      <div className="text-[11px] text-white/30 leading-relaxed">
                        {n.message.length > 150 ? n.message.slice(0, 150) + '...' : n.message}
                      </div>
                      <div className="text-[10px] text-white/15 mt-1 font-mono">
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
