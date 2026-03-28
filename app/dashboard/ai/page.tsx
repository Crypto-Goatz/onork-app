'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  role: 'user' | 'ai' | 'system'
  content: string
  action?: string
  timestamp: number
}

const SUGGESTIONS = [
  'Score all my leads and tell me who to call first',
  'Generate a 5-module course on social media marketing',
  'Show me my pipeline — how many deals are open?',
  'Draft an email follow-up for everyone who visited this week',
  'Book an appointment for tomorrow at 2pm',
  'How many contacts did I get this month?',
  'Create a nurture sequence for cold leads',
  'Send a review request to my last 10 customers',
  'What are my top performing automations?',
  'Generate a blog post about SEO trends',
]

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      const name = user?.user_metadata?.business_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'
      setUserName(name)
      setMessages([{
        id: '0',
        role: 'system',
        content: `Hey ${name}. I'm your 0nAI — 819 tools, 54 services, one brain. Tell me what you need and I'll handle it. No menus, no clicks, just results.`,
        timestamp: Date.now(),
      }])
    })
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      })
      const data = await res.json()

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: data.response || 'Something went wrong. Try again.',
        action: data.action,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'ai',
        content: 'Connection error. Check your network and try again.',
        timestamp: Date.now(),
      }])
    }

    setLoading(false)
    inputRef.current?.focus()
  }

  const showSuggestions = messages.length <= 1

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      maxWidth: 800, margin: '0 auto', padding: '0 16px',
    }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            marginBottom: 20,
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%',
              padding: msg.role === 'system' ? '20px 0' : '14px 18px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'linear-gradient(135deg, #2dd4bf, #14b8a6)' :
                msg.role === 'system' ? 'transparent' : '#141e30',
              color: msg.role === 'user' ? '#0c1220' : '#e8ecf2',
              border: msg.role === 'system' ? 'none' : msg.role === 'ai' ? '1px solid #1c2b42' : 'none',
              fontSize: msg.role === 'system' ? 16 : 14,
              lineHeight: 1.7,
              fontWeight: msg.role === 'user' ? 500 : 400,
            }}>
              {msg.role === 'ai' && (
                <div style={{
                  fontSize: 10, color: '#2dd4bf', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  marginBottom: 6,
                }}>0nAI</div>
              )}
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              {msg.action && (
                <div style={{
                  marginTop: 10, padding: '6px 10px',
                  background: 'rgba(45,212,191,0.08)',
                  border: '1px solid rgba(45,212,191,0.15)',
                  borderRadius: 6, fontSize: 11, color: '#2dd4bf',
                }}>
                  Action executed: {msg.action}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
            <div style={{
              padding: '14px 18px', borderRadius: '16px 16px 16px 4px',
              background: '#141e30', border: '1px solid #1c2b42',
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: '#2dd4bf', animation: 'pulse 1s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: 3, background: '#2dd4bf', animation: 'pulse 1s infinite 0.2s' }} />
                <span style={{ width: 6, height: 6, borderRadius: 3, background: '#2dd4bf', animation: 'pulse 1s infinite 0.4s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && (
          <div style={{ marginTop: 12 }}>
            <div style={{
              fontSize: 11, color: '#556880', marginBottom: 12,
              textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
            }}>Try saying</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.slice(0, 6).map(s => (
                <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }} style={{
                  padding: '8px 14px',
                  background: '#141e30', border: '1px solid #1c2b42',
                  borderRadius: 20, color: '#8b9ab5', fontSize: 12,
                  cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'left', lineHeight: 1.4,
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#2dd4bf40'; e.currentTarget.style.color = '#2dd4bf' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1c2b42'; e.currentTarget.style.color = '#8b9ab5' }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 0 24px',
        borderTop: '1px solid #1c2b42',
      }}>
        <div style={{
          display: 'flex', gap: 10,
          background: '#141e30', border: '1px solid #1c2b42',
          borderRadius: 14, padding: '4px 4px 4px 16px',
          alignItems: 'flex-end',
          transition: 'border-color 0.2s',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Tell 0nAI what to do..."
            rows={1}
            style={{
              flex: 1, padding: '12px 0',
              background: 'transparent', border: 'none',
              color: '#e8ecf2', fontSize: 15,
              outline: 'none', resize: 'none',
              lineHeight: 1.5, maxHeight: 120,
              fontFamily: '-apple-system, sans-serif',
            }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()} style={{
            width: 40, height: 40,
            borderRadius: 10,
            background: input.trim() ? 'linear-gradient(135deg, #2dd4bf, #14b8a6)' : '#1c2b42',
            border: 'none', cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginBottom: 2,
            transition: 'background 0.2s',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#0c1220' : '#556880'} strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 8, padding: '0 4px',
        }}>
          <span style={{ fontSize: 11, color: '#556880' }}>Enter to send · Shift+Enter for new line</span>
          <span style={{ fontSize: 11, color: '#556880' }}>819 tools · 54 services · one brain</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
