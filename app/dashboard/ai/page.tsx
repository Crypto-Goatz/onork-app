'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * 0nAI — The Brain
 *
 * OWNER-ONLY PAGE: mike@rocketopp.com
 * Middleware blocks all other users at the edge.
 * Client-side double-checks email + requires PIN.
 * Hidden from nav, search engines, and all external links.
 *
 * This is the nerve center of the entire 0n ecosystem.
 */

const OWNER_EMAIL = 'mike@rocketopp.com'
const OWNER_PIN = '0841' // Mike's verification PIN

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
  const [verified, setVerified] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [checking, setChecking] = useState(true)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)

  // ── Verify identity on load ──
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setChecking(false)
      if (!user || user.email !== OWNER_EMAIL) {
        // Shouldn't get here (middleware blocks), but just in case
        window.location.href = '/dashboard'
        return
      }
      setUserEmail(user.email)
      const name = user.user_metadata?.full_name || 'Mike'
      setUserName(name)

      // Check if already verified this session
      if (sessionStorage.getItem('0nai_verified') === 'true') {
        setVerified(true)
        initChat(name)
      } else {
        setTimeout(() => pinRef.current?.focus(), 100)
      }
    })
  }, [])

  function handlePin() {
    if (pin === OWNER_PIN) {
      sessionStorage.setItem('0nai_verified', 'true')
      setVerified(true)
      initChat(userName)
    } else {
      setPinError(true)
      setPin('')
      setTimeout(() => setPinError(false), 2000)
    }
  }

  function initChat(name: string) {
    setMessages([{
      id: '0',
      role: 'system',
      content: `Welcome back, ${name}. 0nAI online — ${new Date().toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. 1,183 tools across 99 services. 5 patents. Full ecosystem access. What are we building?`,
      timestamp: Date.now(),
    }])
    setTimeout(() => inputRef.current?.focus(), 200)
  }

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
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'ai',
        content: data.response || 'Something went wrong. Try again.',
        action: data.action,
        timestamp: Date.now(),
      }])
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

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #1c2b42', borderTopColor: '#7ed957', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── PIN GATE ──
  if (!verified) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 'calc(100vh - 64px)',
        background: 'radial-gradient(ellipse at center, rgba(110,224,90,0.03), transparent)',
      }}>
        <div style={{
          maxWidth: 380, width: '100%', padding: '2.5rem 2rem',
          background: 'var(--jp-surface-elevated, #111827)',
          border: '1px solid var(--jp-border, #1E293B)',
          borderRadius: 20,
          textAlign: 'center',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}>
          {/* Shield icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(110,224,90,0.08)',
            border: '1px solid rgba(110,224,90,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <svg width="28" height="28" fill="none" stroke="#7ed957" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>

          <h2 style={{
            fontSize: '1.25rem', fontWeight: 800,
            color: 'var(--jp-text, #E8EAED)',
            margin: '0 0 0.375rem',
          }}>
            0nAI — Vault Access
          </h2>
          <p style={{
            fontSize: '0.8125rem',
            color: 'var(--jp-text-muted, #4A5568)',
            margin: '0 0 1.5rem',
          }}>
            Identity confirmed: {userEmail}<br />
            Enter your PIN to continue.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={pinRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handlePin()}
              placeholder="PIN"
              autoComplete="off"
              style={{
                flex: 1,
                padding: '14px 16px',
                borderRadius: 12,
                border: `1px solid ${pinError ? '#ef4444' : 'var(--jp-border, #1E293B)'}`,
                background: 'var(--jp-surface, #0B0F19)',
                color: 'var(--jp-text, #E8EAED)',
                fontSize: '1.25rem',
                fontFamily: "'JetBrains Mono', monospace",
                textAlign: 'center',
                letterSpacing: '0.25em',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={handlePin}
              disabled={pin.length < 4}
              style={{
                padding: '14px 24px',
                borderRadius: 12,
                background: pin.length === 4 ? '#7ed957' : 'var(--jp-border, #1E293B)',
                color: pin.length === 4 ? '#000' : 'var(--jp-text-muted, #4A5568)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: pin.length === 4 ? 'pointer' : 'default',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              Verify
            </button>
          </div>

          {pinError && (
            <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.75rem' }}>
              Invalid PIN. Try again.
            </p>
          )}

          <p style={{
            fontSize: '0.625rem',
            color: 'var(--jp-text-muted, #4A5568)',
            marginTop: '1.5rem',
            opacity: 0.6,
          }}>
            AES-256-GCM encrypted session. Owner access only.
          </p>
        </div>
      </div>
    )
  }

  // ── MAIN 0nAI INTERFACE ──
  const showSuggestions = messages.length <= 1

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      maxWidth: 800, margin: '0 auto', padding: '0 16px',
    }}>
      {/* Noindex meta */}
      <meta name="robots" content="noindex, nofollow" />

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid var(--jp-border, #1c2b42)',
        fontSize: '0.6875rem',
        color: 'var(--jp-text-muted, #556880)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#7ed957',
            boxShadow: '0 0 8px rgba(110,224,90,0.5)',
          }} />
          <span style={{ fontWeight: 700, color: '#7ed957', letterSpacing: '0.05em' }}>0nAI ONLINE</span>
          <span style={{ color: 'var(--jp-text-muted, #3a4a5c)' }}>|</span>
          <span>1,183 tools</span>
          <span style={{ color: 'var(--jp-text-muted, #3a4a5c)' }}>|</span>
          <span>99 services</span>
          <span style={{ color: 'var(--jp-text-muted, #3a4a5c)' }}>|</span>
          <span>5 patents</span>
        </div>
        <span style={{
          padding: '2px 8px',
          borderRadius: 4,
          background: 'rgba(110,224,90,0.08)',
          border: '1px solid rgba(110,224,90,0.15)',
          color: '#7ed957',
          fontWeight: 700,
          fontSize: '0.5625rem',
          letterSpacing: '0.08em',
        }}>
          OWNER
        </span>
      </div>

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
              background: msg.role === 'user' ? 'linear-gradient(135deg, #7ed957, #3ecf8e)' :
                msg.role === 'system' ? 'transparent' : 'var(--jp-surface, #141e30)',
              color: msg.role === 'user' ? '#0c1220' : 'var(--jp-text, #e8ecf2)',
              border: msg.role === 'system' ? 'none' : msg.role === 'ai' ? '1px solid var(--jp-border, #1c2b42)' : 'none',
              fontSize: msg.role === 'system' ? 16 : 14,
              lineHeight: 1.7,
              fontWeight: msg.role === 'user' ? 500 : 400,
            }}>
              {msg.role === 'ai' && (
                <div style={{
                  fontSize: 10, color: '#7ed957', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <svg width="12" height="12" fill="none" stroke="#7ed957" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
                  0nAI
                </div>
              )}
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              {msg.action && (
                <div style={{
                  marginTop: 10, padding: '6px 10px',
                  background: 'rgba(110,224,90,0.06)',
                  border: '1px solid rgba(110,224,90,0.12)',
                  borderRadius: 6, fontSize: 11, color: '#7ed957',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  Action: {msg.action}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
            <div style={{
              padding: '14px 18px', borderRadius: '16px 16px 16px 4px',
              background: 'var(--jp-surface, #141e30)', border: '1px solid var(--jp-border, #1c2b42)',
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 0.2, 0.4].map(d => (
                  <span key={d} style={{ width: 6, height: 6, borderRadius: 3, background: '#7ed957', animation: `pulse 1s infinite ${d}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && (
          <div style={{ marginTop: 12 }}>
            <div style={{
              fontSize: 11, color: 'var(--jp-text-muted, #556880)', marginBottom: 12,
              textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
            }}>Quick commands</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.slice(0, 6).map(s => (
                <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }} style={{
                  padding: '8px 14px',
                  background: 'var(--jp-surface, #141e30)',
                  border: '1px solid var(--jp-border, #1c2b42)',
                  borderRadius: 10, color: 'var(--jp-text-secondary, #8b9ab5)', fontSize: 12,
                  cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'left', lineHeight: 1.4,
                  fontFamily: 'inherit',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(110,224,90,0.3)'; e.currentTarget.style.color = '#7ed957' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--jp-border, #1c2b42)'; e.currentTarget.style.color = 'var(--jp-text-secondary, #8b9ab5)' }}
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
        borderTop: '1px solid var(--jp-border, #1c2b42)',
      }}>
        <div style={{
          display: 'flex', gap: 10,
          background: 'var(--jp-surface, #141e30)',
          border: '1px solid var(--jp-border, #1c2b42)',
          borderRadius: 14, padding: '4px 4px 4px 16px',
          alignItems: 'flex-end',
          transition: 'border-color 0.2s',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Tell 0nAI what to build..."
            rows={1}
            style={{
              flex: 1, padding: '12px 0',
              background: 'transparent', border: 'none',
              color: 'var(--jp-text, #e8ecf2)', fontSize: 15,
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
            background: input.trim() ? '#7ed957' : 'var(--jp-border, #1c2b42)',
            border: 'none', cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginBottom: 2,
            transition: 'background 0.2s',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#0c1220' : 'var(--text-muted, #6b7280)'} strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 8, padding: '0 4px',
        }}>
          <span style={{ fontSize: 11, color: 'var(--jp-text-muted, #556880)' }}>Enter to send · Shift+Enter for new line</span>
          <span style={{ fontSize: 11, color: 'var(--jp-text-muted, #3a4a5c)' }}>
            <span style={{ color: '#7ed957' }}>1,183</span> tools · <span style={{ color: '#7ed957' }}>99</span> services · owner mode
          </span>
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
