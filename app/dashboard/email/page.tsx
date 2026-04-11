'use client'

import { useState, useEffect } from 'react'

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

const folders: { key: Folder; label: string; icon: React.ReactNode; count?: number }[] = [
  {
    key: 'inbox',
    label: 'Inbox',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
  },
  {
    key: 'sent',
    label: 'Sent',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    key: 'drafts',
    label: 'Drafts',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    key: 'starred',
    label: 'Starred',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    key: 'trash',
    label: 'Trash',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
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
        // No conversations available
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
          contactId: composeTo, // In practice this would be a contact ID lookup
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

  // Dynamic folder counts
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
          {loading ? 'Loading conversations...' : error ? 'No conversations yet' : 'CRM conversations and email management'}
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '8px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', fontSize: '0.8125rem', color: 'var(--jp-red)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={fetchConversations} style={{ background: 'none', border: 'none', color: 'var(--jp-cyan)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: 16 }}>
        <div className="jp-search" style={{ width: '100%', maxWidth: 480 }}>
          <span className="jp-search-icon">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            className="jp-search-input"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--jp-green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 240px)', minHeight: 500 }}>
          {/* Folder List */}
          <div className="jp-card" style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--jp-border)' }}>
              <button
                onClick={() => setShowCompose(true)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'var(--jp-green)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 'var(--jp-radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Compose
              </button>
            </div>
            <div style={{ padding: '8px' }}>
              {folders.map((folder) => (
                <div
                  key={folder.key}
                  onClick={() => { setActiveFolder(folder.key); setSelectedEmail(null) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 'var(--jp-radius-sm)',
                    cursor: 'pointer',
                    color: activeFolder === folder.key ? 'var(--jp-green)' : 'var(--jp-text-secondary)',
                    background: activeFolder === folder.key ? 'var(--jp-green-glow)' : 'transparent',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    transition: 'all var(--jp-transition)',
                  }}
                >
                  <span style={{ display: 'flex', flexShrink: 0 }}>{folder.icon}</span>
                  <span style={{ flex: 1 }}>{folder.label}</span>
                  {folderCounts[folder.key] && (
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      background: activeFolder === folder.key ? 'var(--jp-green)' : 'var(--jp-border-hi)',
                      color: activeFolder === folder.key ? '#000' : 'var(--jp-text-secondary)',
                      padding: '1px 7px',
                      borderRadius: 10,
                    }}>
                      {folderCounts[folder.key]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Email List */}
          <div className="jp-card" style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--jp-border)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--jp-text)' }}>
              {folders.find(f => f.key === activeFolder)?.label} ({filteredEmails.length})
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {filteredEmails.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--jp-text-muted)', fontSize: '0.8125rem' }}>
                  No emails in this folder
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email.id)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--jp-border)',
                      cursor: 'pointer',
                      background: selectedEmail === email.id ? 'var(--jp-green-glow)' : 'transparent',
                      transition: 'background var(--jp-transition)',
                      borderLeft: selectedEmail === email.id ? '3px solid var(--jp-green)' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: !email.read ? 'var(--jp-green)' : 'var(--jp-border-hi)',
                        color: !email.read ? '#000' : 'var(--jp-text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {email.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.8125rem',
                          fontWeight: email.read ? 500 : 700,
                          color: email.read ? 'var(--jp-text-secondary)' : 'var(--jp-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {email.from}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--jp-text-muted)', flexShrink: 0 }}>
                        {email.time}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.8125rem',
                      fontWeight: email.read ? 400 : 600,
                      color: 'var(--jp-text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: 2,
                      paddingLeft: 42,
                    }}>
                      {email.subject}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--jp-text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      paddingLeft: 42,
                    }}>
                      {email.preview}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingLeft: 42 }}>
                      {!email.read && (
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--jp-green)',
                          display: 'inline-block',
                          marginTop: 2,
                        }} />
                      )}
                      {email.starred && (
                        <svg width="12" height="12" fill="var(--jp-amber)" stroke="var(--jp-amber)" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Email Detail */}
          <div className="jp-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selected ? (
              <>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--jp-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--jp-text)', margin: 0 }}>{selected.subject}</h2>
                    <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)', marginTop: 2 }}>{selected.date}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="jp-header-btn" title="Reply">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                    <button className="jp-header-btn" title="Forward">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                      </svg>
                    </button>
                    <button className="jp-header-btn" title="Delete">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--jp-border)' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--jp-green)',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {selected.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)' }}>{selected.from}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--jp-text-muted)' }}>to me</div>
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    fontSize: '0.875rem',
                    lineHeight: 1.7,
                    color: 'var(--jp-text-secondary)',
                    margin: 0,
                  }}>
                    {selected.body}
                  </pre>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--jp-border)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{
                      padding: '8px 20px',
                      background: 'var(--jp-green)',
                      color: '#000',
                      border: 'none',
                      borderRadius: 'var(--jp-radius-sm)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}>
                      Reply
                    </button>
                    <button style={{
                      padding: '8px 20px',
                      background: 'transparent',
                      color: 'var(--jp-text-secondary)',
                      border: '1px solid var(--jp-border)',
                      borderRadius: 'var(--jp-radius-sm)',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}>
                      Forward
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 8,
                color: 'var(--jp-text-muted)',
              }}>
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span style={{ fontSize: '0.875rem' }}>Select an email to read</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}
          onClick={() => setShowCompose(false)}
        >
          <div
            className="jp-card"
            style={{ width: 560, maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="jp-card-header">
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)', margin: 0 }}>New Email</h3>
              <button className="jp-header-btn" onClick={() => setShowCompose(false)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="jp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                placeholder="To (Contact ID or email)"
                className="jp-search-input"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                style={{ width: '100%', paddingLeft: 14 }}
              />
              <input
                type="text"
                placeholder="Subject"
                className="jp-search-input"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                style={{ width: '100%', paddingLeft: 14 }}
              />
              <textarea
                placeholder="Write your message..."
                rows={8}
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                style={{
                  width: '100%',
                  padding: 14,
                  background: 'var(--jp-bg-input)',
                  border: '1px solid var(--jp-border)',
                  borderRadius: 'var(--jp-radius-sm)',
                  color: 'var(--jp-text)',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => setShowCompose(false)}
                  style={{
                    padding: '8px 20px',
                    background: 'transparent',
                    color: 'var(--jp-text-secondary)',
                    border: '1px solid var(--jp-border)',
                    borderRadius: 'var(--jp-radius-sm)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  style={{
                    padding: '8px 24px',
                    background: 'var(--jp-green)',
                    color: '#000',
                    border: 'none',
                    borderRadius: 'var(--jp-radius-sm)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: sending ? 'wait' : 'pointer',
                    opacity: sending ? 0.7 : 1,
                  }}
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
