'use client'

import { useState } from 'react'

interface ChatContact {
  id: string
  name: string
  initials: string
  preview: string
  time: string
  online: boolean
}

interface ChatMessage {
  id: string
  text: string
  direction: 'incoming' | 'outgoing'
  time: string
}

const contacts: ChatContact[] = [
  { id: 'jaxx', name: 'Jaxx AI', initials: 'JX', preview: 'How can I help you today?', time: 'Now', online: true },
  { id: '2', name: 'Support Bot', initials: 'SB', preview: 'Ticket #1024 resolved', time: '2h', online: true },
  { id: '3', name: 'System Alerts', initials: 'SA', preview: 'All systems operational', time: '5h', online: false },
  { id: '4', name: 'CRM Sync', initials: 'CR', preview: 'Last sync: 2m ago', time: '1d', online: false },
  { id: '5', name: 'Workflow Log', initials: 'WL', preview: 'No recent executions', time: '3d', online: false },
]

const initialMessages: ChatMessage[] = [
  {
    id: '1',
    text: 'Welcome to 0nCore. I\'m Jaxx, your AI assistant powered by 0nMCP. I have access to 1,171 tools across 54 services.',
    direction: 'incoming',
    time: '10:00 AM',
  },
  {
    id: '2',
    text: 'I can help you manage contacts, run workflows, check billing, configure integrations, and more. What would you like to do?',
    direction: 'incoming',
    time: '10:00 AM',
  },
]

export default function ChatPage() {
  const [activeContact, setActiveContact] = useState('jaxx')
  const [messages] = useState<ChatMessage[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')

  const currentContact = contacts.find((c) => c.id === activeContact)

  return (
    <div>
      <div className="jp-page-header">
        <h1 className="jp-page-title">Chat</h1>
        <p className="jp-page-subtitle">Talk to Jaxx AI or view system messages</p>
      </div>

      <div className="jp-chat-wrapper">
        {/* Contact List */}
        <div className="jp-chat-sidebar">
          <div className="jp-chat-sidebar-header">
            <div className="jp-chat-sidebar-title">Messages</div>
            <input
              type="text"
              className="jp-chat-input"
              placeholder="Search conversations..."
              style={{ height: 34, fontSize: '0.8125rem' }}
              readOnly
            />
          </div>
          <div className="jp-chat-contact-list">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`jp-chat-contact ${activeContact === contact.id ? 'active' : ''}`}
                onClick={() => setActiveContact(contact.id)}
              >
                <div
                  className="jp-chat-contact-avatar"
                  style={{
                    background: contact.id === 'jaxx' ? 'var(--jp-green)' : 'var(--jp-border-hi)',
                    color: contact.id === 'jaxx' ? '#000' : 'var(--jp-text)',
                    position: 'relative',
                  }}
                >
                  {contact.initials}
                  {contact.online && (
                    <span style={{
                      position: 'absolute',
                      bottom: -1,
                      right: -1,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: 'var(--jp-green)',
                      border: '2px solid var(--jp-bg-card)',
                    }} />
                  )}
                </div>
                <div className="jp-chat-contact-info">
                  <div className="jp-chat-contact-name">{contact.name}</div>
                  <div className="jp-chat-contact-preview">{contact.preview}</div>
                </div>
                <span className="jp-chat-contact-time">{contact.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Main */}
        <div className="jp-chat-main">
          {/* Chat Header */}
          <div className="jp-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: currentContact?.id === 'jaxx' ? 'var(--jp-green)' : 'var(--jp-border-hi)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: currentContact?.id === 'jaxx' ? '#000' : 'var(--jp-text)',
                }}
              >
                {currentContact?.initials}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--jp-text)' }}>
                  {currentContact?.name}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--jp-green)' }}>
                  {currentContact?.online ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="jp-header-btn" title="Voice Call">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button className="jp-header-btn" title="More">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="jp-chat-messages">
            <div style={{
              textAlign: 'center',
              fontSize: '0.6875rem',
              color: 'var(--jp-text-muted)',
              padding: '8px 0',
            }}>
              Today
            </div>
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`jp-chat-message ${msg.direction}`}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize: '0.6875rem',
                  color: 'var(--jp-text-muted)',
                  marginTop: 4,
                  textAlign: msg.direction === 'outgoing' ? 'right' : 'left',
                  paddingLeft: msg.direction === 'incoming' ? 4 : 0,
                  paddingRight: msg.direction === 'outgoing' ? 4 : 0,
                }}>
                  {msg.time}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="jp-chat-input-area">
            <button className="jp-header-btn" style={{ flexShrink: 0 }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="text"
              className="jp-chat-input"
              placeholder="Ask Jaxx anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button className="jp-chat-send-btn">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}
