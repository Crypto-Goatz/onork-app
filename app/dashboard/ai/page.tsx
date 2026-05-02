'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Sparkles, Send } from 'lucide-react'

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

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session: __sess } }) => {
      const user = __sess?.user ?? null;
      setChecking(false)
      if (!user || user.email !== OWNER_EMAIL) {
        window.location.href = '/dashboard'
        return
      }
      setUserEmail(user.email)
      const name = user.user_metadata?.full_name || 'Mike'
      setUserName(name)

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
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-8 h-8 rounded-full border-2 border-core-surface border-t-core-green animate-spin" />
      </div>
    )
  }

  // ── PIN GATE ──
  if (!verified) {
    return (
      <div className="flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(110,224,90,0.03),transparent)]" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="max-w-sm w-full px-8 py-10 bg-core-surface border border-core-border rounded-2xl text-center shadow-2xl">
          {/* Shield icon */}
          <div className="w-14 h-14 rounded-2xl bg-core-green/[0.08] border border-core-green/15 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-7 h-7 text-core-green" strokeWidth={1.5} />
          </div>

          <h2 className="text-xl font-extrabold text-core-text mb-1.5">
            0nAI — Vault Access
          </h2>
          <p className="text-[13px] text-core-text-muted mb-6">
            Identity confirmed: {userEmail}<br />
            Enter your PIN to continue.
          </p>

          <div className="flex gap-2">
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
              className={[
                'flex-1 py-3.5 px-4 rounded-xl border bg-core-bg text-core-text text-xl font-mono text-center tracking-[0.25em] outline-none transition-colors',
                pinError ? 'border-core-red' : 'border-core-border',
              ].join(' ')}
            />
            <button
              onClick={handlePin}
              disabled={pin.length < 4}
              className={[
                'px-6 py-3.5 rounded-xl font-bold text-sm transition-all',
                pin.length === 4
                  ? 'bg-core-green text-core-bg cursor-pointer'
                  : 'bg-core-border text-core-text-muted cursor-default',
              ].join(' ')}
            >
              Verify
            </button>
          </div>

          {pinError && (
            <p className="text-xs text-core-red mt-3">Invalid PIN. Try again.</p>
          )}

          <p className="text-[10px] text-core-text-muted mt-6 opacity-60">
            AES-256-GCM encrypted session. Owner access only.
          </p>
        </div>
      </div>
    )
  }

  // ── MAIN 0nAI INTERFACE ──
  const showSuggestions = messages.length <= 1

  return (
    <div
      className="flex flex-col px-4 mx-auto"
      style={{ height: 'calc(100vh - 64px)', maxWidth: 800 }}
    >
      <meta name="robots" content="noindex, nofollow" />

      {/* Status bar */}
      <div className="flex items-center justify-between py-3 border-b border-core-border text-[11px] text-core-text-muted">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-core-green shadow-[0_0_8px_rgba(110,224,90,0.5)]" />
          <span className="font-bold text-core-green tracking-wide">0nAI ONLINE</span>
          <span className="text-core-text-muted/40">|</span>
          <span>1,183 tools</span>
          <span className="text-core-text-muted/40">|</span>
          <span>99 services</span>
          <span className="text-core-text-muted/40">|</span>
          <span>5 patents</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-core-green/[0.08] border border-core-green/15 text-core-green font-bold text-[9px] tracking-widest">
          OWNER
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={[
              'mb-5 flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start',
            ].join(' ')}
          >
            <div
              className={[
                'max-w-[85%]',
                msg.role === 'user'
                  ? 'px-4 py-3.5 rounded-[16px_16px_4px_16px] bg-gradient-to-br from-core-green to-[#3ecf8e] text-core-bg font-medium text-sm leading-relaxed'
                  : msg.role === 'system'
                    ? 'text-base leading-relaxed text-core-text'
                    : 'px-4 py-3.5 rounded-[16px_16px_16px_4px] bg-core-surface border border-core-border text-core-text text-sm leading-relaxed',
              ].join(' ')}
            >
              {msg.role === 'ai' && (
                <div className="flex items-center gap-1.5 text-[10px] text-core-green font-bold uppercase tracking-widest mb-1.5">
                  <Sparkles className="w-3 h-3 text-core-green" strokeWidth={2} />
                  0nAI
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.action && (
                <div className="mt-2.5 px-2.5 py-1.5 bg-core-green/[0.06] border border-core-green/12 rounded-md text-[11px] text-core-green font-mono">
                  Action: {msg.action}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start mb-5">
            <div className="px-4 py-3.5 rounded-[16px_16px_16px_4px] bg-core-surface border border-core-border">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-core-green animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && (
          <div className="mt-3">
            <div className="text-[11px] text-core-text-muted mb-3 uppercase tracking-widest font-semibold">
              Quick commands
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.slice(0, 6).map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus() }}
                  className="px-3.5 py-2 bg-core-surface border border-core-border rounded-xl text-xs text-core-text-dim cursor-pointer transition-all text-left leading-snug hover:border-core-green/30 hover:text-core-green"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="py-4 pb-6 border-t border-core-border">
        <div className="flex gap-2.5 items-end bg-core-surface border border-core-border rounded-2xl pl-4 pr-1 py-1 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Tell 0nAI what to build..."
            rows={1}
            className="flex-1 py-3 bg-transparent border-0 text-core-text text-[15px] outline-none resize-none leading-relaxed font-sans placeholder:text-core-text-muted"
            style={{ maxHeight: 120 }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className={[
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mb-0.5 transition-colors',
              input.trim() ? 'bg-core-green cursor-pointer' : 'bg-core-border cursor-default',
            ].join(' ')}
          >
            <Send
              className={`w-4 h-4 ${input.trim() ? 'text-core-bg' : 'text-core-text-muted'}`}
              strokeWidth={2}
            />
          </button>
        </div>
        <div className="flex justify-between mt-2 px-1">
          <span className="text-[11px] text-core-text-muted">Enter to send · Shift+Enter for new line</span>
          <span className="text-[11px] text-core-text-muted">
            <span className="text-core-green">1,183</span> tools · <span className="text-core-green">99</span> services · owner mode
          </span>
        </div>
      </div>
    </div>
  )
}
