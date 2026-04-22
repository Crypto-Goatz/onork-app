'use client'

import { useState, useEffect } from 'react'
import {
  Inbox,
  Send,
  FileText,
  Star,
  Trash2,
  Plus,
  Search,
  Reply,
  Forward,
  Trash,
  Mail,
  X,
} from 'lucide-react'

interface Email {
  id: string
  from: string
  initials: string
  subject: string
  preview: string
  body: string
  time: string
  date: string
  read: boolean
  starred: boolean
  folder: 'inbox' | 'sent' | 'drafts' | 'starred' | 'trash'
  contactId?: string
}

const mockEmails: Email[] = []

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCrmConversations(conversations: any[]): Email[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return conversations.map((conv: any) => {
    const contactName = conv.contactName || conv.fullName || conv.contact?.name || 'Unknown'
    const lastMessage = conv.lastMessageBody || conv.snippet || ''
    const dateStr = conv.lastMessageDate || conv.dateUpdated || conv.dateAdded
    const date = dateStr ? new Date(dateStr) : new Date()
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString()

    return {
      id: conv.id,
      from: contactName,
      initials: getInitials(contactName),
      subject: conv.lastMessageBody?.substring(0, 60) || 'Conversation',
      preview: lastMessage.substring(0, 100),
      body: lastMessage,
      time: isToday
        ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : isYesterday
          ? 'Yesterday'
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      read: !conv.unreadCount || conv.unreadCount === 0,
      starred: false,
      folder: conv.lastMessageDirection === 'outbound' ? 'sent' as const : 'inbox' as const,
      contactId: conv.contactId,
    }
  })
}

type Folder = 'inbox' | 'sent' | 'drafts' | 'starred' | 'trash'

const folders: { key: Folder; label: string; icon: React.ReactNode }[] = [
  { key: 'inbox',   label: 'Inbox',   icon: <Inbox   size={16} /> },
  { key: 'sent',    label: 'Sent',    icon: <Send    size={16} /> },
  { key: 'drafts',  label: 'Drafts',  icon: <FileText size={16} /> },
  { key: 'starred', label: 'Starred', icon: <Star    size={16} /> },
  { key: 'trash',   label: 'Trash',   icon: <Trash2  size={16} /> },
]

export default function EmailPage() {
  const [emails, setEmails] = useState<Email[]>(mockEmails)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox')
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/crm/conversations')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch conversations')

      const mapped = mapCrmConversations(data.conversations || [])
      if (mapped.length > 0) {
        setEmails(mapped)
        setSelectedEmail(mapped[0].id)
      } else {
        setSelectedEmail(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
      setSelectedEmail(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (!composeTo.trim() || !composeBody.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/crm/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: composeTo,
          message: composeBody,
          subject: composeSubject,
          type: 'Email',
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }
      setShowCompose(false)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      fetchConversations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const unreadCount = emails.filter(e => !e.read && e.folder === 'inbox').length
  const starredCount = emails.filter(e => e.starred).length

  const filteredEmails = emails.filter((email) => {
    if (activeFolder === 'starred') return email.starred
    if (activeFolder === 'inbox') return email.folder === 'inbox'
    if (activeFolder === 'sent') return email.folder === 'sent'
    return email.folder === activeFolder
  }).filter((email) =>
    !searchQuery ||
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.from.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selected = emails.find((e) => e.id === selectedEmail)

  const folderCounts: Record<Folder, number | undefined> = {
    inbox: unreadCount || undefined,
    sent: undefined,
    drafts: undefined,
    starred: starredCount || undefined,
    trash: undefined,
  }

  return (
    <div>
      <div className="jp-page-header">
        <h1 className="jp-page-title">Email</h1>
        <p className="jp-page-subtitle">
          {loading
            ? 'Loading conversations...'
            : error
              ? 'No conversations yet'
              : 'CRM conversations and email management'}
        </p>
      </div>

      {error && (
        <div className="mb-4 px-3.5 py-2 rounded-lg bg-core-red/10 border border-core-red/20 text-[0.8125rem] text-core-red flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchConversations}
            className="bg-transparent border-none text-core-cyan text-[0.8125rem] font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <div className="jp-search w-full max-w-[480px]">
          <span className="jp-search-icon">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="jp-search-input w-full"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10">
          <div className="w-8 h-8 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4 min-h-[500px]" style={{ height: 'calc(100vh - 240px)' }}>
          {/* Folder List */}
          <div className="jp-card w-[200px] shrink-0 flex flex-col">
            <div className="px-4 py-3 border-b border-core-border">
              <button
                onClick={() => setShowCompose(true)}
                className="w-full px-4 py-2.5 bg-core-green text-black border-none rounded-[var(--jp-radius-sm)] text-[0.8125rem] font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
              >
                <Plus size={14} strokeWidth={2.5} />
                Compose
              </button>
            </div>
            <div className="p-2">
              {folders.map((folder) => {
                const isActive = activeFolder === folder.key
                return (
                  <div
                    key={folder.key}
                    onClick={() => { setActiveFolder(folder.key); setSelectedEmail(null) }}
                    className={[
                      'flex items-center gap-2.5 px-3 py-[9px] rounded-[var(--jp-radius-sm)] cursor-pointer text-[0.8125rem] font-medium transition-all',
                      isActive
                        ? 'text-core-green bg-core-green/10'
                        : 'text-core-text-dim hover:bg-core-card-hover',
                    ].join(' ')}
                  >
                    <span className="flex shrink-0">{folder.icon}</span>
                    <span className="flex-1">{folder.label}</span>
                    {folderCounts[folder.key] && (
                      <span className={[
                        'text-[0.6875rem] font-bold px-1.5 py-px rounded-full',
                        isActive
                          ? 'bg-core-green text-black'
                          : 'bg-core-border text-core-text-dim',
                      ].join(' ')}>
                        {folderCounts[folder.key]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Email List */}
          <div className="jp-card w-[340px] shrink-0 flex flex-col overflow-hidden">
            <div className="px-4 py-3.5 border-b border-core-border text-[0.8125rem] font-semibold text-core-text">
              {folders.find(f => f.key === activeFolder)?.label} ({filteredEmails.length})
            </div>
            <div className="flex-1 overflow-auto">
              {filteredEmails.length === 0 ? (
                <div className="p-6 text-center text-core-text-muted text-[0.8125rem]">
                  No emails in this folder
                </div>
              ) : (
                filteredEmails.map((email) => {
                  const isSelected = selectedEmail === email.id
                  return (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email.id)}
                      className={[
                        'px-4 py-3.5 border-b border-core-border cursor-pointer transition-colors border-l-[3px]',
                        isSelected
                          ? 'bg-core-green/10 border-l-core-green'
                          : 'bg-transparent border-l-transparent hover:bg-core-card-hover',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className={[
                          'w-8 h-8 rounded-full flex items-center justify-center text-[0.6875rem] font-bold shrink-0',
                          !email.read
                            ? 'bg-core-green text-black'
                            : 'bg-core-border text-core-text-dim',
                        ].join(' ')}>
                          {email.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={[
                            'text-[0.8125rem] truncate',
                            email.read
                              ? 'font-medium text-core-text-dim'
                              : 'font-bold text-core-text',
                          ].join(' ')}>
                            {email.from}
                          </div>
                        </div>
                        <span className="text-[0.6875rem] text-core-text-muted shrink-0">
                          {email.time}
                        </span>
                      </div>
                      <div className={[
                        'text-[0.8125rem] truncate mb-0.5 pl-[42px]',
                        email.read ? 'font-normal text-core-text' : 'font-semibold text-core-text',
                      ].join(' ')}>
                        {email.subject}
                      </div>
                      <div className="text-xs text-core-text-muted truncate pl-[42px]">
                        {email.preview}
                      </div>
                      <div className="flex gap-1.5 mt-1.5 pl-[42px]">
                        {!email.read && (
                          <span className="w-2 h-2 rounded-full bg-core-green inline-block mt-0.5" />
                        )}
                        {email.starred && (
                          <Star size={12} className="fill-core-amber text-core-amber" />
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Email Detail */}
          <div className="jp-card flex-1 flex flex-col overflow-hidden">
            {selected ? (
              <>
                <div className="px-5 py-4 border-b border-core-border flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-core-text m-0">{selected.subject}</h2>
                    <div className="text-xs text-core-text-muted mt-0.5">{selected.date}</div>
                  </div>
                  <div className="flex gap-1">
                    <button className="jp-header-btn" title="Reply">
                      <Reply size={16} />
                    </button>
                    <button className="jp-header-btn" title="Forward">
                      <Forward size={16} />
                    </button>
                    <button className="jp-header-btn" title="Delete">
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
                <div className="px-5 py-4 flex items-center gap-3 border-b border-core-border">
                  <div className="w-10 h-10 rounded-full bg-core-green text-black flex items-center justify-center text-[0.8125rem] font-bold shrink-0">
                    {selected.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-core-text">{selected.from}</div>
                    <div className="text-xs text-core-text-muted">to me</div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto px-6 py-5">
                  <pre className="whitespace-pre-wrap font-[inherit] text-sm leading-[1.7] text-core-text-dim m-0">
                    {selected.body}
                  </pre>
                </div>
                <div className="px-5 py-3 border-t border-core-border">
                  <div className="flex gap-2">
                    <button className="px-5 py-2 bg-core-green text-black border-none rounded-[var(--jp-radius-sm)] text-[0.8125rem] font-semibold cursor-pointer hover:opacity-90 transition-opacity">
                      Reply
                    </button>
                    <button className="px-5 py-2 bg-transparent text-core-text-dim border border-core-border rounded-[var(--jp-radius-sm)] text-[0.8125rem] font-medium cursor-pointer hover:bg-core-card-hover transition-colors">
                      Forward
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col gap-2 text-core-text-muted">
                <Mail size={48} strokeWidth={1} />
                <span className="text-sm">Select an email to read</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]"
          onClick={() => setShowCompose(false)}
        >
          <div
            className="jp-card w-[560px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="jp-card-header">
              <h3 className="text-sm font-semibold text-core-text m-0">New Email</h3>
              <button className="jp-header-btn" onClick={() => setShowCompose(false)}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <div className="jp-card-body flex flex-col gap-3">
              <input
                type="text"
                placeholder="To (Contact ID or email)"
                className="jp-search-input w-full pl-3.5"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
              <input
                type="text"
                placeholder="Subject"
                className="jp-search-input w-full pl-3.5"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
              <textarea
                placeholder="Write your message..."
                rows={8}
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                className="w-full p-3.5 bg-[var(--jp-bg-input)] border border-core-border rounded-[var(--jp-radius-sm)] text-core-text text-sm resize-y outline-none font-[inherit] focus:border-core-green transition-colors"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCompose(false)}
                  className="px-5 py-2 bg-transparent text-core-text-dim border border-core-border rounded-[var(--jp-radius-sm)] text-[0.8125rem] cursor-pointer hover:bg-core-card-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-6 py-2 bg-core-green text-black border-none rounded-[var(--jp-radius-sm)] text-[0.8125rem] font-bold cursor-pointer transition-opacity disabled:opacity-70 disabled:cursor-wait hover:opacity-90"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
