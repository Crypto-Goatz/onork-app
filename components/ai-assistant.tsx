'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || thinking) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text }])
    setThinking(true)

    try {
      const res = await fetch('/api/tasks/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          tasks: [],
          context: { page: typeof window !== 'undefined' ? window.location.pathname : '' },
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || data.error || 'No response',
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Connection error. Try again.',
      }])
    }
    setThinking(false)
  }

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
            padding: '14px 16px',
            borderBottom: '1px solid #1e293b',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, rgba(126,217,87,0.06) 0%, rgba(0,212,255,0.03) 100%)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #7ed957, #00d4ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 900, color: '#000',
            }}>0n</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4f8' }}>0nCore AI</div>
              <div style={{ fontSize: 10, color: '#4b5563' }}>Personal assistant — always here</div>
            </div>
            <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 3, background: '#7ed957', boxShadow: '0 0 8px #7ed957' }} />
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4f8', marginBottom: 4 }}>How can I help?</div>
                <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5 }}>Ask me anything about your dashboard, tasks, contacts, or workflows.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16, width: '100%' }}>
                  {['What should I focus on today?', 'Show me my pipeline summary', 'Help me write an email'].map(q => (
                    <button key={q} onClick={() => { setInput(q); setTimeout(send, 50) }} style={{
                      padding: '8px 14px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)', border: '1px solid #1e293b',
                      color: '#8b95a5', fontSize: 12, textAlign: 'left', cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                  background: m.role === 'user' ? 'linear-gradient(135deg, #7ed957, #5cb83a)' : 'rgba(255,255,255,0.04)',
                  color: m.role === 'user' ? '#000' : '#d1d5db',
                  border: m.role === 'assistant' ? '1px solid #1e293b' : 'none',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: m.role === 'assistant' ? 4 : 12,
                }}>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.content}</p>
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

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #1e293b', background: '#0a0e17' }}>
            <form onSubmit={e => { e.preventDefault(); send() }} style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything..."
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
