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
        <div key={i} className="pl-3 mb-0.5">
          {formatInline(line)}
        </div>
      )
      continue
    }

    // Bullet list
    if (/^[-*]\s/.test(line.trim())) {
      elements.push(
        <div key={i} className="pl-3 mb-0.5">
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
        <div
          key={i}
          className={`font-bold mt-2 mb-1 text-[#f0f4f8] ${level === 1 ? 'text-[15px]' : level === 2 ? 'text-[14px]' : 'text-[13px]'}`}
        >
          {headerText}
        </div>
      )
      continue
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />)
      continue
    }

    // Normal paragraph
    elements.push(
      <div key={i} className="mb-0.5">
        {formatInline(line)}
      </div>
    )
  }

  return <>{elements}</>
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-[#f0f4f8] font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="bg-[#6EE05A]/10 px-1 py-px rounded text-[0.9em] text-[#6EE05A]"
        >
          {part.slice(1, -1)}
        </code>
      )
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    fetch('/api/engine/settings')
      .then(r => r.json())
      .then(data => {
        if (data.security_level) setSecurityLevel(data.security_level)
        if (data.default_persona) setPersona(data.default_persona)
      })
      .catch(() => {})
  }, [])

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
        body: JSON.stringify({ message: msg, conversationId, persona, securityLevel }),
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

      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || 'No response.',
        intent: data.intent,
      }])

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

  const newConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setSuggestions(['What can you do?', 'Show me my pipeline', 'Help me build something'])
  }, [])

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={[
          'fixed bottom-6 right-6 z-[9000] w-[52px] h-[52px] rounded-2xl border-none cursor-pointer',
          'flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          open
            ? 'bg-[#1e293b] shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
            : 'bg-gradient-to-br from-[#6EE05A] to-[#14b8a6] shadow-[0_4px_24px_rgba(110,224,90,0.4),0_0_40px_rgba(110,224,90,0.15)]',
        ].join(' ')}
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
        <div className="fixed bottom-[88px] right-6 z-[8999] w-[380px] h-[520px] bg-[#0d1117] border border-[#30363d] rounded-2xl flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(110,224,90,0.05)] animate-[aiSlideUp_0.3s_cubic-bezier(0.4,0,0.2,1)]">

          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-[#30363d] bg-gradient-to-br from-[#6EE05A]/[.06] to-[#14b8a6]/[.03]">
            <div className="flex items-center gap-2">
              <div className="w-[26px] h-[26px] rounded-[7px] bg-gradient-to-br from-[#6EE05A] to-[#14b8a6] flex items-center justify-center text-[9px] font-black text-black shrink-0">
                0n
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-[#f0f4f8] leading-tight">
                  0nAI Engine
                </div>
              </div>

              {/* Persona dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
                  className="flex items-center gap-1 px-2.5 py-[3px] rounded-md bg-[#6EE05A]/10 border border-[#6EE05A]/20 text-[#6EE05A] text-[11px] font-semibold cursor-pointer"
                >
                  {PERSONA_LABELS[persona]}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showPersonaDropdown && (
                  <div className="absolute top-full right-0 mt-1 w-[220px] bg-[#161b22] border border-[#30363d] rounded-[10px] overflow-hidden z-[100] shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                    {(Object.keys(PERSONA_LABELS) as Persona[]).map(p => (
                      <button
                        key={p}
                        onClick={() => { setPersona(p); setShowPersonaDropdown(false) }}
                        className={[
                          'w-full px-3 py-2 border-none text-left cursor-pointer',
                          p === persona
                            ? 'bg-[#6EE05A]/[.08] border-l-2 border-l-[#6EE05A]'
                            : 'bg-transparent border-l-2 border-l-transparent',
                        ].join(' ')}
                      >
                        <div className={`text-[12px] font-semibold ${p === persona ? 'text-[#6EE05A]' : 'text-[#d1d5db]'}`}>
                          {PERSONA_LABELS[p]}
                        </div>
                        <div className="text-[10px] text-[#6b7280] mt-px">
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
                className="w-[26px] h-[26px] rounded-md bg-white/[.04] border border-[#30363d] cursor-pointer flex items-center justify-center"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              {/* Green dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-[#6EE05A] shadow-[0_0_8px_#6EE05A] shrink-0" />
            </div>

            {/* Security level pills */}
            <div className="flex gap-1 mt-1.5">
              {(['low', 'default', 'strict'] as SecurityLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => setSecurityLevel(level)}
                  className={[
                    'px-2 py-0.5 rounded border-none text-[10px] font-semibold cursor-pointer transition-all duration-150',
                    level === securityLevel
                      ? 'bg-[#6EE05A]/[.12] text-[#6EE05A]'
                      : 'bg-transparent text-[#4b5563]',
                  ].join(' ')}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-5">
                <div className="w-11 h-11 rounded-xl mb-3.5 bg-gradient-to-br from-[#6EE05A]/15 to-[#14b8a6]/10 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6EE05A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="text-[15px] font-bold text-[#f0f4f8] mb-1">
                  0nAI Engine
                </div>
                <div className="text-[12px] text-[#6b7280] leading-relaxed max-w-[260px]">
                  Your complete AI brain. I can build workflows, manage contacts, create content, and automate your business.
                </div>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={[
                  'max-w-[88%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed',
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-[#6EE05A] to-[#4abe2e] text-black rounded-br-[4px]'
                    : 'bg-white/[.04] text-[#d1d5db] border border-[#30363d] rounded-bl-[4px]',
                ].join(' ')}>
                  {m.role === 'assistant' ? (
                    <div>
                      {m.intent?.detected && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded mb-1.5 bg-[#14b8a6]/[.08] border border-[#14b8a6]/15 text-[10px] text-[#14b8a6] font-semibold">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                          {m.intent.action || 'Action detected'}
                        </div>
                      )}
                      {renderMarkdown(m.content)}
                    </div>
                  ) : (
                    <p className="m-0 whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-xl rounded-bl-[4px] bg-white/[.04] border border-[#30363d]">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6EE05A] opacity-50 animate-[aiBounce_1s_infinite]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6EE05A] opacity-50 animate-[aiBounce_1s_infinite_150ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6EE05A] opacity-50 animate-[aiBounce_1s_infinite_300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions (after messages) */}
          {suggestions.length > 0 && !thinking && messages.length > 0 && (
            <div className="px-3 pb-1.5 flex gap-1 flex-wrap">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="px-2.5 py-1 rounded-md bg-white/[.02] border border-[#30363d] text-[#9ca3af] text-[11px] cursor-pointer transition-[border-color] duration-150 whitespace-nowrap"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Empty state suggestions */}
          {messages.length === 0 && (
            <div className="px-3 pb-2 flex flex-col gap-1">
              {suggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  className="px-3.5 py-2 rounded-lg bg-white/[.02] border border-[#30363d] text-[#9ca3af] text-[12px] text-left cursor-pointer transition-[border-color] duration-150"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2 border-t border-[#30363d] bg-[#0d1117]">
            <form onSubmit={e => { e.preventDefault(); send() }} className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Ask ${PERSONA_LABELS[persona]}...`}
                disabled={thinking}
                className="flex-1 px-3.5 py-2.5 rounded-[10px] bg-white/[.04] border border-[#30363d] text-[#f0f4f8] text-[13px] outline-none font-[inherit]"
              />
              <button
                type="submit"
                disabled={thinking || !input.trim()}
                className={[
                  'w-[38px] h-[38px] rounded-[10px] border-none flex items-center justify-center transition-all duration-200',
                  input.trim()
                    ? 'bg-gradient-to-br from-[#6EE05A] to-[#14b8a6] cursor-pointer'
                    : 'bg-[#30363d] cursor-default',
                ].join(' ')}
              >
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
