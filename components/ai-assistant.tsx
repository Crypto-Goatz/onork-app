'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  intent?: {
    detected: boolean
    action?: string
    confidence?: number
  }
}

type Persona = 'engine' | 'writer' | 'social' | 'sales' | 'support' | 'custom'
type SecurityLevel = 'low' | 'default' | 'strict'

const PERSONA_LABELS: Record<Persona, string> = {
  engine: 'Engine',
  writer: 'Writer',
  social: 'Social',
  sales: 'Sales',
  support: 'Support',
  custom: 'Custom',
}

const PERSONA_DESCRIPTIONS: Record<Persona, string> = {
  engine: 'Full K-layer access — can do everything',
  writer: 'Content creation — blogs, emails, social',
  social: 'Social media management',
  sales: 'Pipeline, follow-ups, proposals',
  support: 'Customer support using company knowledge',
  custom: 'User-defined persona',
}

// ---------------------------------------------------------------------------
// Markdown-lite renderer (bold, lists, code)
// ---------------------------------------------------------------------------

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <div key={i} style={{ paddingLeft: 12, marginBottom: 2 }}>
          {formatInline(line)}
        </div>
      )
      continue
    }

    // Bullet list
    if (/^[-*]\s/.test(line.trim())) {
      elements.push(
        <div key={i} style={{ paddingLeft: 12, marginBottom: 2 }}>
          {formatInline(line.trim())}
        </div>
      )
      continue
    }

    // Header (##)
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^(#+)/)?.[1].length || 1
      const headerText = line.replace(/^#+\s*/, '')
      elements.push(
        <div key={i} style={{
          fontWeight: 700,
          fontSize: level === 1 ? 15 : level === 2 ? 14 : 13,
          marginTop: 8,
          marginBottom: 4,
          color: '#f0f4f8',
        }}>
          {headerText}
        </div>
      )
      continue
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} style={{ height: 6 }} />)
      continue
    }

    // Normal paragraph
    elements.push(
      <div key={i} style={{ marginBottom: 2 }}>
        {formatInline(line)}
      </div>
    )
  }

  return <>{elements}</>
}

function formatInline(text: string): React.ReactNode {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#f0f4f8', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{
        background: 'rgba(126,217,87,0.1)',
        padding: '1px 5px',
        borderRadius: 3,
        fontSize: '0.9em',
        color: '#7ed957',
      }}>{part.slice(1, -1)}</code>
    }
    return <span key={i}>{part}</span>
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [persona, setPersona] = useState<Persona>('engine')
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('default')
  const [suggestions, setSuggestions] = useState<string[]>([
    'What can you do?',
    'Show me my pipeline',
    'Help me build something',
  ])
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Load settings on mount
  useEffect(() => {
    fetch('/api/engine/settings')
      .then(r => r.json())
      .then(data => {
        if (data.security_level) setSecurityLevel(data.security_level)
        if (data.default_persona) setPersona(data.default_persona)
      })
      .catch(() => {})
  }, [])

  // -------------------------------------------------------------------
  // Send message
  // -------------------------------------------------------------------

  const send = useCallback(async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || thinking) return
    setInput('')

    const userMsgId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: msg }])
    setThinking(true)
    setSuggestions([])

    try {
      const res = await fetch('/api/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          conversationId,
          persona,
          securityLevel,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.error || 'Something went wrong. Try again.',
        }])
        setThinking(false)
        return
      }

      // Update conversation ID for multi-turn
      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      // Add assistant message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || 'No response.',
        intent: data.intent,
      }])

      // Update suggestions
      if (data.suggestions?.length) {
        setSuggestions(data.suggestions)
      } else {
        setSuggestions(['Tell me more', 'What else can you do?', 'Help me build something'])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Connection error. Check your network and try again.',
      }])
    }

    setThinking(false)
  }, [input, thinking, conversationId, persona, securityLevel])

  // -------------------------------------------------------------------
  // New conversation
  // -------------------------------------------------------------------

  const newConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setSuggestions(['What can you do?', 'Show me my pipeline', 'Help me build something'])
  }, [])

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9000,
          width: 52, height: 52, borderRadius: 16,
          background: open ? '#1e293b' : 'linear-gradient(135deg, #7ed957 0%, #00d4ff 100%)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 24px rgba(126,217,87,0.4), 0 0 40px rgba(126,217,87,0.15)',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f0f4f8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            <path d="M18 7.5l.375-1.313 1.313-.375-1.313-.375L18 4.125l-.375 1.312-1.313.375 1.313.375z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 8999,
          width: 380, height: 520,
          background: '#0d1117',
          border: '1px solid #1e293b',
          borderRadius: 16,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(126,217,87,0.05)',
          animation: 'aiSlideUp 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid #1e293b',
            background: 'linear-gradient(135deg, rgba(126,217,87,0.06) 0%, rgba(0,212,255,0.03) 100%)',
          }}>
            {/* Top row: Title + Persona + New */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: 'linear-gradient(135deg, #7ed957, #00d4ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 900, color: '#000', flexShrink: 0,
              }}>0n</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4f8', lineHeight: 1.2 }}>
                  0nAI Engine
                </div>
              </div>

              {/* Persona dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
                  style={{
                    padding: '3px 10px', borderRadius: 6,
                    background: 'rgba(126,217,87,0.1)', border: '1px solid rgba(126,217,87,0.2)',
                    color: '#7ed957', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {PERSONA_LABELS[persona]}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showPersonaDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4,
                    width: 220, background: '#161b22', border: '1px solid #1e293b',
                    borderRadius: 10, overflow: 'hidden', zIndex: 100,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                  }}>
                    {(Object.keys(PERSONA_LABELS) as Persona[]).map(p => (
                      <button
                        key={p}
                        onClick={() => { setPersona(p); setShowPersonaDropdown(false) }}
                        style={{
                          width: '100%', padding: '8px 12px', border: 'none',
                          background: p === persona ? 'rgba(126,217,87,0.08)' : 'transparent',
                          cursor: 'pointer', textAlign: 'left',
                          borderLeft: p === persona ? '2px solid #7ed957' : '2px solid transparent',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: p === persona ? '#7ed957' : '#d1d5db' }}>
                          {PERSONA_LABELS[p]}
                        </div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                          {PERSONA_DESCRIPTIONS[p]}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* New conversation */}
              <button
                onClick={newConversation}
                title="New conversation"
                style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid #1e293b',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              {/* Green dot */}
              <div style={{ width: 6, height: 6, borderRadius: 3, background: '#7ed957', boxShadow: '0 0 8px #7ed957', flexShrink: 0 }} />
            </div>

            {/* Security level pills */}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {(['low', 'default', 'strict'] as SecurityLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => setSecurityLevel(level)}
                  style={{
                    padding: '2px 8px', borderRadius: 4, border: 'none',
                    background: level === securityLevel ? 'rgba(126,217,87,0.12)' : 'transparent',
                    color: level === securityLevel ? '#7ed957' : '#4b5563',
                    fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, marginBottom: 14,
                  background: 'linear-gradient(135deg, rgba(126,217,87,0.15), rgba(0,212,255,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>&#10022;</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8', marginBottom: 4 }}>
                  0nAI Engine
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, maxWidth: 260 }}>
                  Your complete AI brain. I can build workflows, manage contacts, create content, and automate your business.
                </div>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '88%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                  background: m.role === 'user' ? 'linear-gradient(135deg, #7ed957, #5cb83a)' : 'rgba(255,255,255,0.04)',
                  color: m.role === 'user' ? '#000' : '#d1d5db',
                  border: m.role === 'assistant' ? '1px solid #1e293b' : 'none',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: m.role === 'assistant' ? 4 : 12,
                }}>
                  {m.role === 'assistant' ? (
                    <div style={{ margin: 0 }}>
                      {/* Bridge intent indicator */}
                      {m.intent?.detected && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 4, marginBottom: 6,
                          background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)',
                          fontSize: 10, color: '#00d4ff', fontWeight: 600,
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                          {m.intent.action || 'Action detected'}
                        </div>
                      )}
                      {renderMarkdown(m.content)}
                    </div>
                  ) : (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid #1e293b', borderBottomLeftRadius: 4 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: '#7ed957', opacity: 0.5, animation: 'aiBounce 1s infinite' }} />
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: '#7ed957', opacity: 0.5, animation: 'aiBounce 1s infinite 0.15s' }} />
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: '#7ed957', opacity: 0.5, animation: 'aiBounce 1s infinite 0.3s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && !thinking && messages.length > 0 && (
            <div style={{ padding: '0 12px 6px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  style={{
                    padding: '4px 10px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid #1e293b',
                    color: '#8b95a5', fontSize: 11, cursor: 'pointer',
                    transition: 'border-color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Empty state suggestions */}
          {messages.length === 0 && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {suggestions.map((q, i) => (
                <button key={i} onClick={() => send(q)} style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid #1e293b',
                  color: '#8b95a5', fontSize: 12, textAlign: 'left', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #1e293b', background: '#0a0e17' }}>
            <form onSubmit={e => { e.preventDefault(); send() }} style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Ask ${PERSONA_LABELS[persona]}...`}
                disabled={thinking}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid #1e293b',
                  color: '#f0f4f8', fontSize: 13, outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button type="submit" disabled={thinking || !input.trim()} style={{
                width: 38, height: 38, borderRadius: 10, border: 'none',
                background: input.trim() ? 'linear-gradient(135deg, #7ed957, #00d4ff)' : '#1e293b',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#000' : '#4b5563'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes aiSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes aiBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  )
}
