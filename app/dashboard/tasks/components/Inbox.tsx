'use client'

import { useState } from 'react'
import type { Email } from '../types'

interface InboxProps {
  emails: Email[]
  onRefresh: () => void
  onMarkRead: (id: string) => void
  onMarkUnread: (id: string) => void
}

export default function Inbox({ emails, onRefresh, onMarkRead, onMarkUnread }: InboxProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleClick = (email: Email) => {
    if (expandedId === email.id) {
      setExpandedId(null)
    } else {
      setExpandedId(email.id)
      if (!email.isRead) onMarkRead(email.id)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#f0f4f8' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#7ed957' }}>{'\u2709'}</span> Inbox
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7ed957', opacity: 0.8 }}>Monitor your workspace communications.</p>
        </div>
        <button
          onClick={onRefresh}
          style={{ padding: '8px 14px', background: '#161b22', border: '1px solid #1e293b', borderRadius: 8, color: '#8b95a5', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          Refresh
        </button>
      </div>

      {/* Email list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {emails.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#3d4654' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{'\u2709'}</div>
            <p style={{ fontWeight: 600, fontSize: 14 }}>Inbox is empty.</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Messages will appear here when connected.</p>
          </div>
        ) : (
          emails.map(email => (
            <div
              key={email.id}
              onClick={() => handleClick(email)}
              style={{
                background: '#161b22', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px',
                marginBottom: 8, cursor: 'pointer', transition: 'border-color 0.2s',
                borderLeftWidth: 3, borderLeftColor: email.isRead ? '#1e293b' : '#7ed957',
              }}
              onMouseEnter={e => { if (email.isRead) e.currentTarget.style.borderColor = '#3d4654' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.borderLeftColor = email.isRead ? '#1e293b' : '#7ed957' }}
            >
              {/* Row: avatar, from, date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 15, background: 'rgba(126,217,87,0.15)', color: '#7ed957',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                  }}>
                    {email.from.replace(/"/g, '').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: email.isRead ? 400 : 700, color: email.isRead ? '#8b95a5' : '#f0f4f8' }}>
                    {email.from.split('<')[0].replace(/"/g, '').trim()}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: '#3d4654', fontFamily: 'monospace' }}>{email.date}</span>
              </div>

              {/* Subject */}
              <div style={{ fontSize: 14, fontWeight: email.isRead ? 400 : 700, marginBottom: 4, color: email.isRead ? '#a0aec0' : '#f0f4f8' }}>
                {email.subject}
              </div>

              {/* Snippet */}
              <div style={{ fontSize: 12, color: '#8b95a5', lineHeight: 1.5, display: expandedId === email.id ? 'block' : '-webkit-box', WebkitLineClamp: expandedId === email.id ? undefined : 2, WebkitBoxOrient: 'vertical', overflow: expandedId === email.id ? 'visible' : 'hidden' }}>
                {email.snippet}
              </div>

              {/* Actions when expanded */}
              {expandedId === email.id && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button
                    onClick={e => { e.stopPropagation(); email.isRead ? onMarkUnread(email.id) : onMarkRead(email.id) }}
                    style={{ padding: '4px 12px', background: 'rgba(126,217,87,0.1)', color: '#7ed957', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Mark as {email.isRead ? 'Unread' : 'Read'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
