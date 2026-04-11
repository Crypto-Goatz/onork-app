'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ── Types ──

interface Crew {
  id: string
  name: string
  role: string
  description: string
  avatar_color: string
  k_layers: string[]
  tools: string[]
  status: string
  message_count: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface DisplayMessage extends Message {
  id: string
  time: string
}

// ── K-Layer Labels ──

const K_LAYER_MAP: Record<string, string> = {
  K1: 'Brand Voice',
  K2: 'Audience',
  K3: 'Products',
  K4: 'Intelligence',
  K5: 'Playbooks',
  K6: 'Integrations',
  K7: 'Memory',
}

const ALL_K_LAYERS = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7']

// ── Default Crew (always available) ──

const DEFAULT_CREW: Crew = {
  id: '__0nai__',
  name: '0nAI Assistant',
  role: 'ai-operator',
  description: 'Your AI business operator with K-Layer intelligence',
  avatar_color: '#6EE05A',
  k_layers: ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'],
  tools: ['chat', 'execute', 'analyze', 'compose'],
  status: 'active',
  message_count: 0,
}

// ── Helpers ──

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function timeNow(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Component ──

export default function ChatPage() {
  const [crews, setCrews] = useState<Crew[]>([DEFAULT_CREW])
  const [activeCrew, setActiveCrew] = useState<Crew>(DEFAULT_CREW)
  const [messages, setMessages] = useState<Map<string, DisplayMessage[]>>(
    new Map([[DEFAULT_CREW.id, [{
      id: 'welcome',
      role: 'assistant',
      content: "I'm 0nAI, your business operator. I read your K-Layers to understand your brand, audience, products, and playbooks. Ask me anything.",
      time: timeNow(),
    }]]]),
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNewCrew, setShowNewCrew] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // New crew form
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('general')
  const [newColor, setNewColor] = useState('#6EE05A')
  const [newKLayers, setNewKLayers] = useState<string[]>(['K1'])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Fetch crews ──

  useEffect(() => {
    fetch('/api/crews')
      .then((r) => r.json())
      .then((d) => {
        const fetched: Crew[] = d.crews || []
        const has0nAI = fetched.some(
          (c) => c.name === '0nAI Assistant' || c.id === '__0nai__',
        )
        const all = has0nAI ? fetched : [DEFAULT_CREW, ...fetched]
        setCrews(all)
        const assistant = all.find(
          (c) => c.name === '0nAI Assistant' || c.id === '__0nai__',
        )
        if (assistant) setActiveCrew(assistant)
      })
      .catch(() => {})
  }, [])

  // ── Auto-scroll ──

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeCrew?.id])

  // ── Current messages ──

  const currentMessages = messages.get(activeCrew?.id || '') || []

  // ── Send message ──

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading || !activeCrew) return

    const userMsg: DisplayMessage = {
      id: uid(),
      role: 'user',
      content: text,
      time: timeNow(),
    }

    setMessages((prev) => {
      const next = new Map(prev)
      const arr = [...(next.get(activeCrew.id) || []), userMsg]
      next.set(activeCrew.id, arr)
      return next
    })
    setInput('')
    setLoading(true)

    try {
      const history: Message[] = (messages.get(activeCrew.id) || []).map(
        (m) => ({ role: m.role, content: m.content }),
      )

      const res = await fetch('/api/console/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, crewId: activeCrew.id }),
      })

      const data = await res.json()

      const aiMsg: DisplayMessage = {
        id: uid(),
        role: 'assistant',
        content: data.reply || data.error || 'No response.',
        time: timeNow(),
      }

      setMessages((prev) => {
        const next = new Map(prev)
        const arr = [...(next.get(activeCrew.id) || []), aiMsg]
        next.set(activeCrew.id, arr)
        return next
      })
    } catch {
      const errMsg: DisplayMessage = {
        id: uid(),
        role: 'assistant',
        content: 'Connection error. Try again.',
        time: timeNow(),
      }
      setMessages((prev) => {
        const next = new Map(prev)
        const arr = [...(next.get(activeCrew.id) || []), errMsg]
        next.set(activeCrew.id, arr)
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [input, loading, activeCrew, messages])

  // ── Key handler ──

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Create crew ──

  async function createCrew() {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/crews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          role: newRole,
          avatar_color: newColor,
          k_layers: newKLayers,
          tools: [],
        }),
      })
      const d = await res.json()
      if (d.crew) {
        setCrews((prev) => [...prev, d.crew])
        setActiveCrew(d.crew)
        setShowNewCrew(false)
        setNewName('')
        setNewRole('general')
        setNewColor('#6EE05A')
        setNewKLayers(['K1'])
      }
    } catch {}
  }

  // ── Delete crew ──

  async function deleteCrew(id: string) {
    try {
      await fetch('/api/crews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setCrews((prev) => prev.filter((c) => c.id !== id))
      if (activeCrew?.id === id) setActiveCrew(DEFAULT_CREW)
      setDeleteConfirm(null)
      setShowSettings(false)
    } catch {}
  }

  // ── Filtered crews ──

  const filtered = crews.filter(
    (c) =>
      c.status !== 'archived' &&
      c.name.toLowerCase().includes(search.toLowerCase()),
  )

  // ── Render ──

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 64px)',
      background: 'var(--jp-bg, #0d1117)',
      color: 'var(--jp-text, #f0f4f8)',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ═══ LEFT PANEL ═══ */}
      <div style={{
        width: 260,
        minWidth: 260,
        borderRight: '1px solid var(--jp-border, #30363d)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--jp-bg, #0d1117)',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 16px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Messages
          </span>
          <button
            onClick={() => setShowNewCrew(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--jp-text-secondary, #9ca3af)',
              cursor: 'pointer',
              fontSize: 18,
              padding: 4,
              lineHeight: 1,
              borderRadius: 6,
            }}
            title="New crew"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 12px 12px' }}>
          <input
            type="text"
            placeholder="Search crews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--jp-bg-card, #161b22)',
              border: '1px solid var(--jp-border, #30363d)',
              borderRadius: 8,
              padding: '8px 12px',
              color: 'var(--jp-text, #f0f4f8)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        {/* Crews section */}
        <div style={{
          padding: '4px 16px 8px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--jp-text-muted, #6b7280)',
          textTransform: 'uppercase',
        }}>
          Crews
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
          {filtered.map((crew) => {
            const isActive = activeCrew?.id === crew.id
            const crewMessages = messages.get(crew.id)
            const lastMsg = crewMessages?.[crewMessages.length - 1]
            return (
              <button
                key={crew.id}
                onClick={() => {
                  setActiveCrew(crew)
                  inputRef.current?.focus()
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: isActive
                    ? 'var(--jp-bg-card, #161b22)'
                    : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: crew.avatar_color || '#6EE05A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0d1117',
                  flexShrink: 0,
                  position: 'relative',
                }}>
                  {initials(crew.name)}
                  {crew.status === 'active' && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#6EE05A',
                      border: '2px solid var(--jp-bg, #0d1117)',
                    }} />
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 2,
                  }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--jp-text, #f0f4f8)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {crew.name}
                    </span>
                    <span style={{
                      fontSize: 10,
                      color: 'var(--jp-text-muted, #6b7280)',
                      flexShrink: 0,
                      marginLeft: 4,
                    }}>
                      {lastMsg?.time || ''}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--jp-text-muted, #6b7280)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {lastMsg?.content?.slice(0, 50) || crew.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Chats section placeholder */}
        <div style={{
          padding: '12px 16px 4px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--jp-text-muted, #6b7280)',
          textTransform: 'uppercase',
        }}>
          Chats
        </div>
        <div style={{
          padding: '8px 16px 12px',
          fontSize: 12,
          color: 'var(--jp-text-muted, #6b7280)',
        }}>
          Direct messages coming soon
        </div>

        {/* + New Crew */}
        <div style={{ padding: '8px 12px 14px' }}>
          <button
            onClick={() => setShowNewCrew(true)}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: 8,
              border: '1px solid #6EE05A',
              background: 'transparent',
              color: '#6EE05A',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(110, 224, 90, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            + New Crew
          </button>
        </div>
      </div>

      {/* ═══ CENTER PANEL ═══ */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}>

        {/* Header bar */}
        <div style={{
          height: 56,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--jp-border, #30363d)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setShowSettings((p) => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: activeCrew?.avatar_color || '#6EE05A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#0d1117',
            }}>
              {initials(activeCrew?.name || '')}
            </div>
            <div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--jp-text, #f0f4f8)',
                textAlign: 'left',
              }}>
                {activeCrew?.name}
              </div>
              <div style={{
                fontSize: 11,
                color: '#6EE05A',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#6EE05A',
                  display: 'inline-block',
                }} />
                Online
              </div>
            </div>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Phone icon (placeholder) */}
            <button style={{
              background: 'var(--jp-bg-card, #161b22)',
              border: '1px solid var(--jp-border, #30363d)',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--jp-text-muted, #6b7280)',
              cursor: 'not-allowed',
              opacity: 0.5,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
            {/* Video icon (placeholder) */}
            <button style={{
              background: 'var(--jp-bg-card, #161b22)',
              border: '1px solid var(--jp-border, #30363d)',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--jp-text-muted, #6b7280)',
              cursor: 'not-allowed',
              opacity: 0.5,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {currentMessages.length === 0 && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 12,
              color: 'var(--jp-text-muted, #6b7280)',
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: activeCrew?.avatar_color || '#6EE05A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 700,
                color: '#0d1117',
                opacity: 0.6,
              }}>
                {initials(activeCrew?.name || '')}
              </div>
              <span style={{ fontSize: 14 }}>
                {activeCrew?.id === '__0nai__'
                  ? 'Start a conversation with 0nAI'
                  : `Chat with ${activeCrew?.name} coming soon. Use the 0nAI Assistant for now.`}
              </span>
            </div>
          )}

          {currentMessages.map((msg) => {
            const isUser = msg.role === 'user'
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  gap: 8,
                  alignItems: 'flex-end',
                }}
              >
                {/* AI avatar */}
                {!isUser && (
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: activeCrew?.avatar_color || '#6EE05A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#0d1117',
                    flexShrink: 0,
                  }}>
                    {initials(activeCrew?.name || '')}
                  </div>
                )}

                <div style={{
                  maxWidth: '65%',
                  padding: '10px 14px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser ? '#6EE05A' : 'var(--jp-bg-card, #161b22)',
                  color: isUser ? '#0d1117' : 'var(--jp-text, #f0f4f8)',
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                  <div style={{
                    fontSize: 10,
                    marginTop: 4,
                    opacity: 0.5,
                    textAlign: isUser ? 'right' : 'left',
                  }}>
                    {msg.time}
                  </div>
                </div>

                {/* User avatar */}
                {isUser && (
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'var(--jp-bg-card, #161b22)',
                    border: '1px solid var(--jp-border, #30363d)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--jp-text-secondary, #9ca3af)',
                    flexShrink: 0,
                  }}>
                    U
                  </div>
                )}
              </div>
            )
          })}

          {/* Typing indicator */}
          {loading && (
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
            }}>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: activeCrew?.avatar_color || '#6EE05A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#0d1117',
                flexShrink: 0,
              }}>
                {initials(activeCrew?.name || '')}
              </div>
              <div style={{
                padding: '12px 18px',
                borderRadius: '16px 16px 16px 4px',
                background: 'var(--jp-bg-card, #161b22)',
                display: 'flex',
                gap: 4,
                alignItems: 'center',
              }}>
                <span className="chat-typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="chat-typing-dot" style={{ animationDelay: '200ms' }} />
                <span className="chat-typing-dot" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: '12px 20px 16px',
          borderTop: '1px solid var(--jp-border, #30363d)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
        }}>
          {/* Attachment placeholder */}
          <button style={{
            background: 'var(--jp-bg-card, #161b22)',
            border: '1px solid var(--jp-border, #30363d)',
            borderRadius: 8,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--jp-text-muted, #6b7280)',
            cursor: 'pointer',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${activeCrew?.name || 'crew'}...`}
            rows={1}
            style={{
              flex: 1,
              background: 'var(--jp-bg-card, #161b22)',
              border: '1px solid var(--jp-border, #30363d)',
              borderRadius: 12,
              padding: '10px 14px',
              color: 'var(--jp-text, #f0f4f8)',
              fontSize: 13.5,
              resize: 'none',
              outline: 'none',
              minHeight: 40,
              maxHeight: 120,
              lineHeight: 1.45,
              fontFamily: 'inherit',
            }}
          />

          {/* Send */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: 'none',
              background: input.trim() ? '#6EE05A' : 'var(--jp-bg-card, #161b22)',
              color: input.trim() ? '#0d1117' : 'var(--jp-text-muted, #6b7280)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      {showSettings && activeCrew && (
        <div style={{
          width: 280,
          minWidth: 280,
          borderLeft: '1px solid var(--jp-border, #30363d)',
          background: 'var(--jp-bg, #0d1117)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}>

          {/* Settings header */}
          <div style={{
            padding: '16px 16px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--jp-border, #30363d)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Crew Settings</span>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--jp-text-muted, #6b7280)',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
                padding: 4,
              }}
            >
              &times;
            </button>
          </div>

          {/* Avatar + info */}
          <div style={{
            padding: '24px 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: activeCrew.avatar_color || '#6EE05A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              color: '#0d1117',
            }}>
              {initials(activeCrew.name)}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center' }}>
              {activeCrew.name}
            </div>
            <span style={{
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 12,
              background: 'rgba(110, 224, 90, 0.1)',
              color: '#6EE05A',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {activeCrew.role}
            </span>
            <div style={{
              fontSize: 12,
              color: '#6EE05A',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#6EE05A',
                display: 'inline-block',
              }} />
              STATUS: Online
            </div>
          </div>

          {/* K-Layers */}
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--jp-text-muted, #6b7280)',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              K-Layers
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_K_LAYERS.map((k) => {
                const active = activeCrew.k_layers?.includes(k)
                return (
                  <span
                    key={k}
                    title={K_LAYER_MAP[k]}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: active
                        ? 'rgba(110, 224, 90, 0.12)'
                        : 'var(--jp-bg-card, #161b22)',
                      color: active ? '#6EE05A' : 'var(--jp-text-muted, #6b7280)',
                      border: active
                        ? '1px solid rgba(110, 224, 90, 0.25)'
                        : '1px solid var(--jp-border, #30363d)',
                      cursor: 'default',
                    }}
                  >
                    {k}
                  </span>
                )
              })}
            </div>
            <div style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--jp-text-muted, #6b7280)',
              lineHeight: 1.5,
            }}>
              {activeCrew.k_layers
                ?.map((k) => K_LAYER_MAP[k])
                .filter(Boolean)
                .join(' / ') || 'No layers assigned'}
            </div>
          </div>

          {/* Tools */}
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--jp-text-muted, #6b7280)',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              Tools
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(activeCrew.tools?.length ? activeCrew.tools : ['none']).map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 5,
                    background: 'var(--jp-bg-card, #161b22)',
                    color: 'var(--jp-text-secondary, #9ca3af)',
                    border: '1px solid var(--jp-border, #30363d)',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: '8px 16px 20px', marginTop: 'auto' }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--jp-text-muted, #6b7280)',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button style={{
                width: '100%',
                padding: '9px 0',
                borderRadius: 8,
                border: '1px solid var(--jp-border, #30363d)',
                background: 'var(--jp-bg-card, #161b22)',
                color: 'var(--jp-text, #f0f4f8)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                Edit Crew
              </button>

              {activeCrew.id !== '__0nai__' && (
                deleteConfirm === activeCrew.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => deleteCrew(activeCrew.id)}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: 8,
                        border: 'none',
                        background: '#dc2626',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: 8,
                        border: '1px solid var(--jp-border, #30363d)',
                        background: 'transparent',
                        color: 'var(--jp-text-secondary, #9ca3af)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(activeCrew.id)}
                    style={{
                      width: '100%',
                      padding: '9px 0',
                      borderRadius: 8,
                      border: '1px solid rgba(220, 38, 38, 0.3)',
                      background: 'rgba(220, 38, 38, 0.08)',
                      color: '#f87171',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Delete Crew
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ NEW CREW MODAL ═══ */}
      {showNewCrew && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowNewCrew(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 380,
              background: 'var(--jp-bg-card, #161b22)',
              border: '1px solid var(--jp-border, #30363d)',
              borderRadius: 14,
              padding: 24,
            }}
          >
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 20,
              color: 'var(--jp-text, #f0f4f8)',
            }}>
              Create New Crew
            </div>

            {/* Name */}
            <label style={{ fontSize: 11, color: 'var(--jp-text-secondary, #9ca3af)', fontWeight: 600 }}>
              NAME
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Content Writer"
              style={{
                width: '100%',
                background: 'var(--jp-bg, #0d1117)',
                border: '1px solid var(--jp-border, #30363d)',
                borderRadius: 8,
                padding: '9px 12px',
                color: 'var(--jp-text, #f0f4f8)',
                fontSize: 13,
                outline: 'none',
                marginTop: 6,
                marginBottom: 14,
              }}
            />

            {/* Role */}
            <label style={{ fontSize: 11, color: 'var(--jp-text-secondary, #9ca3af)', fontWeight: 600 }}>
              ROLE
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--jp-bg, #0d1117)',
                border: '1px solid var(--jp-border, #30363d)',
                borderRadius: 8,
                padding: '9px 12px',
                color: 'var(--jp-text, #f0f4f8)',
                fontSize: 13,
                outline: 'none',
                marginTop: 6,
                marginBottom: 14,
              }}
            >
              <option value="general">General</option>
              <option value="content-writer">Content Writer</option>
              <option value="sales-rep">Sales Rep</option>
              <option value="support-agent">Support Agent</option>
              <option value="strategist">Strategist</option>
              <option value="developer">Developer</option>
            </select>

            {/* Color */}
            <label style={{ fontSize: 11, color: 'var(--jp-text-secondary, #9ca3af)', fontWeight: 600 }}>
              AVATAR COLOR
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 14 }}>
              {['#6EE05A', '#3b82f6', '#a78bfa', '#f59e0b', '#ef4444', '#06b6d4'].map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: c,
                      border: newColor === c ? '2px solid #fff' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                  />
                ),
              )}
            </div>

            {/* K-Layers */}
            <label style={{ fontSize: 11, color: 'var(--jp-text-secondary, #9ca3af)', fontWeight: 600 }}>
              K-LAYERS
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 20 }}>
              {ALL_K_LAYERS.map((k) => {
                const selected = newKLayers.includes(k)
                return (
                  <button
                    key={k}
                    onClick={() =>
                      setNewKLayers((prev) =>
                        selected ? prev.filter((l) => l !== k) : [...prev, k],
                      )
                    }
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '5px 10px',
                      borderRadius: 6,
                      background: selected
                        ? 'rgba(110, 224, 90, 0.12)'
                        : 'var(--jp-bg, #0d1117)',
                      color: selected ? '#6EE05A' : 'var(--jp-text-muted, #6b7280)',
                      border: selected
                        ? '1px solid rgba(110, 224, 90, 0.25)'
                        : '1px solid var(--jp-border, #30363d)',
                      cursor: 'pointer',
                    }}
                  >
                    {k}
                  </button>
                )
              })}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowNewCrew(false)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: '1px solid var(--jp-border, #30363d)',
                  background: 'transparent',
                  color: 'var(--jp-text-secondary, #9ca3af)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={createCrew}
                disabled={!newName.trim()}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: newName.trim() ? '#6EE05A' : 'var(--jp-bg, #0d1117)',
                  color: newName.trim() ? '#0d1117' : 'var(--jp-text-muted, #6b7280)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: newName.trim() ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                Create Crew
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Typing animation CSS ═══ */}
      <style>{`
        .chat-typing-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #6EE05A;
          display: inline-block;
          animation: chatTypingBounce 1.2s infinite ease-in-out;
        }
        @keyframes chatTypingBounce {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
