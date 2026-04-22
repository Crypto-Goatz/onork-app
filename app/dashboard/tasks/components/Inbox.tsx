'use client'

import { useState } from 'react'
import { Mail, RefreshCw } from 'lucide-react'
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
    <div className="h-full flex flex-col bg-core-bg text-core-text">
      {/* Header */}
      <div className="px-6 py-5 border-b border-core-border flex justify-between items-center">
        <div>
          <h2 className="m-0 text-[22px] font-extrabold flex items-center gap-2.5">
            <Mail size={22} className="text-core-green" />
            Inbox
          </h2>
          <p className="mt-1 mb-0 text-[13px] text-core-green opacity-80">
            Monitor your workspace communications.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-core-surface border border-core-border rounded-lg text-core-text-muted cursor-pointer text-[13px] font-semibold hover:text-core-text hover:border-core-border-hi transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-auto px-4 py-3">
        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-core-text-muted gap-3">
            <Mail size={40} />
            <p className="font-semibold text-[14px] m-0">Inbox is empty.</p>
            <p className="text-[12px] m-0">Messages will appear here when connected.</p>
          </div>
        ) : (
          emails.map(email => (
            <div
              key={email.id}
              onClick={() => handleClick(email)}
              className={`bg-core-surface border border-core-border rounded-[10px] px-4 py-3.5 mb-2 cursor-pointer transition-colors hover:border-core-border-hi ${email.isRead ? '' : 'border-l-[3px] border-l-core-green'}`}
            >
              {/* Row: avatar, from, date */}
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-[30px] h-[30px] rounded-full bg-core-green/15 text-core-green flex items-center justify-center text-[12px] font-extrabold shrink-0">
                    {email.from.replace(/"/g, '').charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-[13px] ${email.isRead ? 'font-normal text-core-text-muted' : 'font-bold text-core-text'}`}>
                    {email.from.split('<')[0].replace(/"/g, '').trim()}
                  </span>
                </div>
                <span className="text-[10px] text-core-text-muted font-mono">{email.date}</span>
              </div>

              {/* Subject */}
              <div className={`text-[14px] mb-1 ${email.isRead ? 'font-normal text-core-text-dim' : 'font-bold text-core-text'}`}>
                {email.subject}
              </div>

              {/* Snippet */}
              <div
                className={`text-[12px] text-core-text-muted leading-relaxed ${expandedId === email.id ? '' : 'line-clamp-2'}`}
              >
                {email.snippet}
              </div>

              {/* Actions when expanded */}
              {expandedId === email.id && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); email.isRead ? onMarkUnread(email.id) : onMarkRead(email.id) }}
                    className="px-3 py-1 bg-core-green/10 text-core-green border-none rounded-md text-[11px] font-semibold cursor-pointer hover:bg-core-green/20 transition-colors"
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
