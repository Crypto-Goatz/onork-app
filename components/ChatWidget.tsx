'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [greeted, setGreeted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && !greeted) {
      setMessages([{
        role: 'assistant',
        content: "Hey! I'm 0nAI — the brain behind 0nCore. I can answer questions about the platform, help you find the right plan, or just chat about what you're building. What can I help with?",
      }])
      setGreeted(true)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open, greeted])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || data.error || 'Something went wrong.',
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again.',
      }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <>
      {/* Chat Panel */}
      <div style={{
        position: 'fixed',
        bottom: open ? '24px' : '-600px',
        right: '24px',
        width: '380px',
        height: '540px',
        background: '#0C0D12',
        border: '1px solid rgba(110,224,90,0.15)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(110,224,90,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9999,
        transition: 'bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(110,224,90,0.08), rgba(110,224,90,0.02))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/brand/0n-neon-logo.svg"
              alt="0nAI"
              style={{ width: '28px', height: '28px', borderRadius: '6px' }}
            />
            <div>
              <div style={{
                fontSize: '14px', fontWeight: 700, color: '#E8ECF4',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                0nAI
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#6EE05A', boxShadow: '0 0 6px #6EE05A',
                  display: 'inline-block',
                }} />
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                AI Assistant · Always online
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: '28px', height: '28px', borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
              color: 'rgba(255,255,255,0.4)', fontSize: '14px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              gap: '8px',
              alignItems: 'flex-end',
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6EE05A, #4ecb3a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', fontWeight: 800, color: '#080B0F', flexShrink: 0,
                }}>
                  0n
                </div>
              )}
              <div style={{
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user'
                  ? '14px 14px 4px 14px'
                  : '14px 14px 14px 4px',
                background: msg.role === 'user'
                  ? '#6EE05A'
                  : 'rgba(255,255,255,0.05)',
                color: msg.role === 'user' ? '#080B0F' : '#E8ECF4',
                fontSize: '13px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6EE05A, #4ecb3a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '8px', fontWeight: 800, color: '#080B0F', flexShrink: 0,
              }}>
                0n
              </div>
              <div style={{
                padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', gap: '4px', alignItems: 'center',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6EE05A', opacity: 0.5, animation: 'wPulse 1.2s infinite' }} />
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6EE05A', opacity: 0.5, animation: 'wPulse 1.2s infinite 0.2s' }} />
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6EE05A', opacity: 0.5, animation: 'wPulse 1.2s infinite 0.4s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Quick actions (only when few messages) */}
        {messages.length <= 1 && !loading && (
          <div style={{
            padding: '0 16px 8px',
            display: 'flex', flexWrap: 'wrap', gap: '6px',
          }}>
            {[
              'What is 0nCore?',
              'Show me pricing',
              'How does K-Layer work?',
              'I want to try it',
            ].map(q => (
              <button
                key={q}
                onClick={() => { setInput(q); setTimeout(() => sendMessage(), 50) }}
                onMouseDown={() => setInput(q)}
                style={{
                  padding: '5px 10px', borderRadius: '8px',
                  border: '1px solid rgba(110,224,90,0.15)',
                  background: 'rgba(110,224,90,0.05)',
                  color: '#6EE05A', fontSize: '11px',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: '8px',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask 0nAI anything..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: '#E8ECF4',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              width: '40px', height: '40px',
              borderRadius: '10px',
              background: loading || !input.trim() ? 'rgba(255,255,255,0.05)' : '#6EE05A',
              border: 'none',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={loading || !input.trim() ? 'rgba(255,255,255,0.2)' : '#080B0F'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding: '6px 16px 8px',
          textAlign: 'center',
          fontSize: '9px',
          color: 'rgba(255,255,255,0.15)',
        }}>
          Powered by <span style={{ color: '#6EE05A' }}>0nAI</span> · <a href="https://0ncore.com" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>Get this bot for $8/mo</a>
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: open ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6EE05A, #4ecb3a)',
          border: open ? '1px solid rgba(255,255,255,0.1)' : 'none',
          boxShadow: open ? 'none' : '0 4px 20px rgba(110,224,90,0.3), 0 0 40px rgba(110,224,90,0.1)',
          cursor: 'pointer',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          transition: 'all 0.2s ease',
        }}
      >
        <img
          src="/brand/0n-neon-logo.svg"
          alt="Chat with 0nAI"
          style={{ width: '32px', height: '32px' }}
        />
      </button>

      <style>{`
        @keyframes wPulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
      `}</style>
    </>
  )
}
