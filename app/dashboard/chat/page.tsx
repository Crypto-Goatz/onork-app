'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ── Types ──

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
}

interface Contact {
  id: string
  name: string
  avatar: string
  lastMessage: string
  time: string
  unread?: number
  online?: boolean
  group?: boolean
}

// ── Mock Data ──

const GROUPS: Contact[] = [
  { id: 'g1', name: '0nAI Assistant', avatar: '0n', lastMessage: 'Your AI business operator', time: 'Now', online: true, group: true },
  { id: 'g2', name: 'Sales Team', avatar: 'ST', lastMessage: 'Pipeline review at 3pm', time: '2:30 PM', unread: 3, group: true },
  { id: 'g3', name: 'Support', avatar: 'SU', lastMessage: 'Ticket #1024 resolved', time: '1:15 PM', group: true },
]

const CHATS: Contact[] = [
  { id: 'c1', name: 'Sarah Johnson', avatar: 'SJ', lastMessage: 'Can you send the proposal?', time: '11:42 AM', unread: 2 },
  { id: 'c2', name: 'Mike Chen', avatar: 'MC', lastMessage: 'Automation is live!', time: '10:30 AM' },
  { id: 'c3', name: 'Alex Rivera', avatar: 'AR', lastMessage: 'Thanks for the update', time: 'Yesterday' },
  { id: 'c4', name: 'Jordan Lee', avatar: 'JL', lastMessage: 'Meeting confirmed for Friday', time: 'Yesterday' },
  { id: 'c5', name: 'Taylor Swift', avatar: 'TS', lastMessage: 'Invoice sent', time: 'Mon' },
]

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hey! I'm 0nAI, your business operating system. I have 1,171 tools across 54 services ready to execute. What do you need done?",
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
}

// ── Main Component ──

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [activeContact, setActiveContact] = useState('g1')
  const [searchQuery, setSearchQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Close drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setDrawerOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const activeContactData = [...GROUPS, ...CHATS].find(c => c.id === activeContact)

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      const data = await res.json()

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || data.error || 'No response received.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Connection error. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    }

    setSending(false)
    inputRef.current?.focus()
  }

  function selectContact(id: string) {
    setActiveContact(id)
    setDrawerOpen(false)
    // Only g1 has actual chat, others are placeholders
    if (id === 'g1') {
      setMessages([WELCOME_MSG])
    } else {
      const contact = [...GROUPS, ...CHATS].find(c => c.id === id)
      setMessages([{
        id: 'placeholder',
        role: 'assistant',
        content: `Chat with ${contact?.name || 'contact'} coming soon. Use the 0nAI Assistant for now.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    }
  }

  const filteredGroups = GROUPS.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredChats = CHATS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Render ──

  return (
    <div style={{ padding: 0, margin: '-20px -24px', height: 'calc(100vh - var(--jp-header-height))' }}>
      <style>{portuStyles}</style>

      <div className="portu-chat-layout">
        {/* Mobile hamburger */}
        <button
          className="portu-drawer-toggle"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open contacts"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="#2B3674" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Drawer overlay */}
        {drawerOpen && (
          <div className="portu-drawer-overlay" onClick={() => setDrawerOpen(false)} />
        )}

        {/* Left Panel — Contact List */}
        <aside className={`portu-left-panel ${drawerOpen ? 'portu-left-panel--open' : ''}`}>
          <div className="portu-left-header">
            <h2 className="portu-left-title">Messages</h2>
            <button className="portu-compose-btn" aria-label="New message">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M13.5 2.5l2 2-8 8H5.5v-2l8-8z" stroke="#2B3674" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.5 4.5l2 2" stroke="#2B3674" strokeWidth="1.3"/>
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="portu-search-wrap">
            <svg className="portu-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="#A3AED0" strokeWidth="1.3"/>
              <path d="M11 11l3 3" stroke="#A3AED0" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search contacts..."
              className="portu-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="portu-contact-list">
            {/* Groups */}
            {filteredGroups.length > 0 && (
              <>
                <div className="portu-section-label">Groups</div>
                {filteredGroups.map(g => (
                  <ContactRow
                    key={g.id}
                    contact={g}
                    active={activeContact === g.id}
                    onClick={() => selectContact(g.id)}
                  />
                ))}
              </>
            )}

            {/* Chats */}
            {filteredChats.length > 0 && (
              <>
                <div className="portu-section-label">Chats</div>
                {filteredChats.map(c => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    active={activeContact === c.id}
                    onClick={() => selectContact(c.id)}
                  />
                ))}
              </>
            )}
          </div>

          <button className="portu-view-more">View More</button>
        </aside>

        {/* Center Panel — Chat */}
        <main className="portu-center-panel">
          {/* Chat Header */}
          <div className="portu-chat-header">
            <div className="portu-chat-header-left">
              <div className="portu-avatar portu-avatar--header" data-initials={activeContactData?.avatar || '0n'}>
                {activeContact === 'g1' && <span className="portu-avatar-text-green">0n</span>}
                {activeContact !== 'g1' && <span className="portu-avatar-text">{activeContactData?.avatar}</span>}
              </div>
              <div>
                <div className="portu-chat-name">{activeContactData?.name || '0nAI Assistant'}</div>
                <div className="portu-chat-status">
                  <span className="portu-status-dot" />
                  Online
                </div>
              </div>
            </div>
            <div className="portu-chat-header-actions">
              <button className="portu-icon-btn" aria-label="Video call">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="1.5" y="4" width="10" height="10" rx="2" stroke="#A3AED0" strokeWidth="1.3"/>
                  <path d="M11.5 7.5l5-2v7l-5-2" stroke="#A3AED0" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="portu-icon-btn" aria-label="Voice call">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M6.6 8.4c.6 1.2 1.8 2.4 3 3l1-.8c.2-.2.5-.2.7-.1l2.2.9c.3.1.5.4.5.7v2c0 .4-.3.7-.6.7C7.2 15.2 2.8 10.8 3.2 4.6c0-.3.3-.6.7-.6h2c.3 0 .6.2.7.5l.9 2.2c.1.2 0 .5-.1.7l-.8 1z" stroke="#A3AED0" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                className="portu-icon-btn portu-detail-toggle"
                aria-label="Contact details"
                onClick={() => setDetailOpen(prev => !prev)}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="4" r="1.2" fill="#A3AED0"/>
                  <circle cx="9" cy="9" r="1.2" fill="#A3AED0"/>
                  <circle cx="9" cy="14" r="1.2" fill="#A3AED0"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="portu-messages">
            {messages.map((msg, i) => {
              const showTimestamp = i === 0 || (
                messages[i - 1] &&
                messages[i - 1].time !== msg.time
              )

              return (
                <div key={msg.id}>
                  {showTimestamp && i > 0 && (
                    <div className="portu-timestamp">{msg.time}</div>
                  )}
                  <div className={`portu-bubble-row ${msg.role === 'user' ? 'portu-bubble-row--right' : 'portu-bubble-row--left'}`}>
                    {msg.role === 'assistant' && (
                      <div className="portu-bubble-avatar">
                        <span className="portu-avatar-text-green-sm">0n</span>
                      </div>
                    )}
                    <div className={`portu-bubble ${msg.role === 'user' ? 'portu-bubble--sent' : 'portu-bubble--received'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })}

            {sending && (
              <div className="portu-bubble-row portu-bubble-row--left">
                <div className="portu-bubble-avatar">
                  <span className="portu-avatar-text-green-sm">0n</span>
                </div>
                <div className="portu-bubble portu-bubble--received portu-typing">
                  <span className="portu-dot" />
                  <span className="portu-dot" />
                  <span className="portu-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="portu-input-bar">
            <button className="portu-attach-btn" aria-label="Attach file">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M15.5 8.5l-7 7a4 4 0 01-5.7-5.7l7-7a2.7 2.7 0 013.8 3.8l-7 7a1.3 1.3 0 01-1.9-1.9l6.3-6.3" stroke="#A3AED0" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <input
              ref={inputRef}
              type="text"
              className="portu-message-input"
              placeholder="Write your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              disabled={sending}
            />
            <button
              className="portu-send-btn"
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M15 3L8 10M15 3l-4 12-3-5-5-3 12-4z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </main>

        {/* Right Panel — Contact Details */}
        <aside className={`portu-right-panel ${detailOpen ? 'portu-right-panel--open' : ''}`}>
          <div className="portu-detail-header">
            <h3 className="portu-detail-title">Contact Info</h3>
            <button className="portu-icon-btn" onClick={() => setDetailOpen(false)} aria-label="Close details">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="#A3AED0" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="portu-detail-body">
            <div className="portu-detail-avatar-wrap">
              <div className="portu-detail-avatar">
                {activeContact === 'g1'
                  ? <span style={{ fontWeight: 900, fontSize: 24, color: '#fff' }}>0n</span>
                  : <span style={{ fontWeight: 700, fontSize: 20, color: '#fff' }}>{activeContactData?.avatar}</span>
                }
              </div>
              <div className="portu-detail-name">{activeContactData?.name || '0nAI Assistant'}</div>
              <div className="portu-detail-role">
                {activeContact === 'g1' ? 'AI Business Operator' : 'Contact'}
              </div>
            </div>

            <div className="portu-detail-section">
              <div className="portu-detail-label">Status</div>
              <div className="portu-detail-value">
                <span className="portu-status-dot" style={{ marginRight: 6 }} />
                Online
              </div>
            </div>

            {activeContact === 'g1' && (
              <>
                <div className="portu-detail-section">
                  <div className="portu-detail-label">Engine</div>
                  <div className="portu-detail-value">0nMCP v2.5.0</div>
                </div>
                <div className="portu-detail-section">
                  <div className="portu-detail-label">Tools</div>
                  <div className="portu-detail-value">1,171 across 54 services</div>
                </div>
                <div className="portu-detail-section">
                  <div className="portu-detail-label">Model</div>
                  <div className="portu-detail-value">Llama 3.3 70B (Groq)</div>
                </div>
                <div className="portu-detail-section">
                  <div className="portu-detail-label">Capabilities</div>
                  <div className="portu-detail-tags">
                    {['Email', 'SMS', 'Pipeline', 'Calendar', 'Voice AI', 'Automations', 'Courses'].map(tag => (
                      <span key={tag} className="portu-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ── Contact Row Component ──

function ContactRow({ contact, active, onClick }: { contact: Contact; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`portu-contact-row ${active ? 'portu-contact-row--active' : ''}`}
      onClick={onClick}
    >
      <div className={`portu-avatar portu-avatar--list ${contact.id === 'g1' ? 'portu-avatar--green' : ''}`}>
        {contact.id === 'g1'
          ? <span className="portu-avatar-text-green-sm">0n</span>
          : <span className="portu-avatar-text-sm">{contact.avatar}</span>
        }
      </div>
      <div className="portu-contact-info">
        <div className="portu-contact-top">
          <span className="portu-contact-name">{contact.name}</span>
          <span className="portu-contact-time">{contact.time}</span>
        </div>
        <div className="portu-contact-bottom">
          <span className="portu-contact-msg">{contact.lastMessage}</span>
          {contact.unread && contact.unread > 0 && (
            <span className="portu-unread-badge">{contact.unread}</span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Portu Light Theme Styles ──

const portuStyles = `
/* Layout */
.portu-chat-layout {
  display: flex;
  height: 100%;
  background: #F5F6FA;
  position: relative;
  overflow: hidden;
}

/* Mobile drawer toggle */
.portu-drawer-toggle {
  display: none;
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 20;
  background: #fff;
  border: 1px solid #E9EDF7;
  border-radius: 10px;
  padding: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

@media (max-width: 767px) {
  .portu-drawer-toggle { display: flex; }
}

/* Drawer overlay */
.portu-drawer-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 98;
}

@media (max-width: 767px) {
  .portu-drawer-overlay { display: block; }
}

/* Left Panel */
.portu-left-panel {
  width: 280px;
  min-width: 280px;
  background: #fff;
  border-radius: 16px;
  margin: 12px 0 12px 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  overflow: hidden;
  z-index: 99;
}

@media (max-width: 767px) {
  .portu-left-panel {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    margin: 0;
    border-radius: 0 16px 16px 0;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 4px 0 24px rgba(0,0,0,0.12);
  }
  .portu-left-panel--open {
    transform: translateX(0);
  }
}

.portu-left-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 12px;
}

.portu-left-title {
  font-size: 18px;
  font-weight: 700;
  color: #2B3674;
  letter-spacing: -0.02em;
}

.portu-compose-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  transition: background 0.15s;
}
.portu-compose-btn:hover { background: #F5F6FA; }

/* Search */
.portu-search-wrap {
  position: relative;
  margin: 0 16px 12px;
}

.portu-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.portu-search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  background: #F5F6FA;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  color: #2B3674;
  outline: none;
  font-family: inherit;
}
.portu-search-input::placeholder { color: #A3AED0; }
.portu-search-input:focus { box-shadow: 0 0 0 2px rgba(110, 224, 90, 0.3); }

/* Contact list */
.portu-contact-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.portu-section-label {
  font-size: 11px;
  font-weight: 600;
  color: #A3AED0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 12px 12px 6px;
}

.portu-contact-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
  font-family: inherit;
}
.portu-contact-row:hover { background: #F5F6FA; }
.portu-contact-row--active { background: #F0FBF0; }

.portu-contact-info {
  flex: 1;
  min-width: 0;
}

.portu-contact-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.portu-contact-name {
  font-size: 13px;
  font-weight: 600;
  color: #2B3674;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.portu-contact-time {
  font-size: 11px;
  color: #A3AED0;
  white-space: nowrap;
  flex-shrink: 0;
}

.portu-contact-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2px;
}

.portu-contact-msg {
  font-size: 12px;
  color: #A3AED0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.portu-unread-badge {
  background: #6EE05A;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  flex-shrink: 0;
  margin-left: 6px;
}

.portu-view-more {
  margin: 8px 16px 16px;
  padding: 10px;
  background: #F5F6FA;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #6EE05A;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.portu-view-more:hover { background: #EEF8EE; }

/* Avatars */
.portu-avatar {
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.portu-avatar--list {
  width: 40px;
  height: 40px;
  background: #F0F2F8;
}

.portu-avatar--green {
  background: linear-gradient(135deg, #6EE05A, #4CAF50) !important;
}

.portu-avatar--header {
  width: 42px;
  height: 42px;
  background: #F0F2F8;
}

.portu-avatar-text {
  font-size: 13px;
  font-weight: 700;
  color: #2B3674;
}

.portu-avatar-text-sm {
  font-size: 12px;
  font-weight: 700;
  color: #2B3674;
}

.portu-avatar-text-green {
  font-size: 15px;
  font-weight: 900;
  color: #fff;
}

.portu-avatar-text-green-sm {
  font-size: 12px;
  font-weight: 900;
  color: #fff;
}

/* Center Panel */
.portu-center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  margin: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  overflow: hidden;
  min-width: 0;
}

@media (max-width: 767px) {
  .portu-center-panel {
    margin: 12px;
    border-radius: 16px;
  }
}

/* Chat Header */
.portu-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #F0F2F8;
}

@media (max-width: 767px) {
  .portu-chat-header {
    padding-left: 52px;
  }
}

.portu-chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.portu-chat-name {
  font-size: 15px;
  font-weight: 700;
  color: #2B3674;
}

.portu-chat-status {
  font-size: 12px;
  color: #6EE05A;
  display: flex;
  align-items: center;
  gap: 5px;
}

.portu-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6EE05A;
  display: inline-block;
}

.portu-chat-header-actions {
  display: flex;
  gap: 4px;
}

.portu-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.portu-icon-btn:hover { background: #F5F6FA; }

/* Messages Area */
.portu-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.portu-timestamp {
  text-align: center;
  font-size: 11px;
  color: #A3AED0;
  padding: 12px 0 8px;
}

.portu-bubble-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 75%;
}
.portu-bubble-row--left {
  align-self: flex-start;
}
.portu-bubble-row--right {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.portu-bubble-avatar {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: linear-gradient(135deg, #6EE05A, #4CAF50);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.portu-bubble {
  padding: 12px 16px;
  font-size: 13.5px;
  line-height: 1.55;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.portu-bubble--received {
  background: #F4F7FE;
  color: #2B3674;
  border-radius: 14px 14px 14px 4px;
}

.portu-bubble--sent {
  background: #6EE05A;
  color: #fff;
  border-radius: 14px 14px 4px 14px;
}

/* Typing indicator */
.portu-typing {
  display: flex;
  gap: 4px;
  padding: 14px 18px;
}

.portu-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #A3AED0;
  animation: portu-bounce 1.4s infinite;
}
.portu-dot:nth-child(2) { animation-delay: 0.2s; }
.portu-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes portu-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

/* Input Bar */
.portu-input-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #F0F2F8;
  background: #fff;
}

.portu-attach-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.portu-attach-btn:hover { background: #F5F6FA; }

.portu-message-input {
  flex: 1;
  padding: 12px 16px;
  background: #F5F6FA;
  border: none;
  border-radius: 12px;
  font-size: 13.5px;
  color: #2B3674;
  outline: none;
  font-family: inherit;
}
.portu-message-input::placeholder { color: #A3AED0; }
.portu-message-input:focus { box-shadow: 0 0 0 2px rgba(110, 224, 90, 0.25); }

.portu-send-btn {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #6EE05A;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.portu-send-btn:hover:not(:disabled) {
  background: #5CC94A;
  transform: scale(1.04);
}
.portu-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Right Panel */
.portu-right-panel {
  width: 260px;
  min-width: 260px;
  background: #fff;
  border-radius: 16px;
  margin: 12px 12px 12px 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-width: 1024px) {
  .portu-right-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    border-radius: 16px 0 0 16px;
    transform: translateX(100%);
    z-index: 100;
    box-shadow: -4px 0 24px rgba(0,0,0,0.12);
  }
  .portu-right-panel--open {
    transform: translateX(0);
  }
}

@media (min-width: 1025px) {
  .portu-detail-toggle { display: none !important; }
}

.portu-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 12px;
}

.portu-detail-title {
  font-size: 15px;
  font-weight: 700;
  color: #2B3674;
}

.portu-detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.portu-detail-avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0 20px;
}

.portu-detail-avatar {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #6EE05A, #4CAF50);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.portu-detail-name {
  font-size: 15px;
  font-weight: 700;
  color: #2B3674;
}

.portu-detail-role {
  font-size: 12px;
  color: #A3AED0;
  margin-top: 2px;
}

.portu-detail-section {
  padding: 10px 0;
  border-top: 1px solid #F0F2F8;
}

.portu-detail-label {
  font-size: 11px;
  font-weight: 600;
  color: #A3AED0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.portu-detail-value {
  font-size: 13px;
  color: #2B3674;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.portu-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 4px;
}

.portu-tag {
  padding: 3px 9px;
  background: #F0FBF0;
  color: #4CAF50;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
}

/* Scrollbar */
.portu-messages::-webkit-scrollbar,
.portu-contact-list::-webkit-scrollbar,
.portu-detail-body::-webkit-scrollbar {
  width: 4px;
}
.portu-messages::-webkit-scrollbar-track,
.portu-contact-list::-webkit-scrollbar-track,
.portu-detail-body::-webkit-scrollbar-track {
  background: transparent;
}
.portu-messages::-webkit-scrollbar-thumb,
.portu-contact-list::-webkit-scrollbar-thumb,
.portu-detail-body::-webkit-scrollbar-thumb {
  background: #E0E4F0;
  border-radius: 2px;
}
`
