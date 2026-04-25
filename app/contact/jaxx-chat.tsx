'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, User } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'What is 0nCore?',
  'How much does it cost?',
  'How does the LinkedIn bot work?',
  'Can I try it for free?',
]

export function JaxxChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hey! I'm Jaxx — the AI behind 0nCore. Ask me anything about the platform, pricing, features, or how it works. I know everything." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return

    const userMsg: Message = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: [...messages, userMsg].slice(-10) }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "I'm here to help!" }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection issue — try again or email mike@rocketopp.com' }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const hasUserMessages = messages.length > 1

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col min-h-[520px] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3 bg-gradient-to-r from-[#7ed957]/[0.04] to-transparent">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7ed957]/20 to-[#00d4ff]/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#7ed957]" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-white flex items-center gap-1.5">
            Jaxx
            <span className="w-[6px] h-[6px] rounded-full bg-[#7ed957] shadow-[0_0_6px_#7ed957]" />
          </h3>
          <p className="text-[10px] text-white/30">0nCore AI &middot; Knows everything</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md bg-[#7ed957]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-[#7ed957]" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#7ed957]/15 border border-[#7ed957]/20 text-white rounded-br-sm'
                : 'bg-white/[0.04] border border-white/[0.06] text-white/80 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-white/40" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#7ed957]/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-[#7ed957]" />
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Suggestions (only before first user message) */}
      {!hasUserMessages && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/50 hover:text-white hover:border-[#7ed957]/30 hover:bg-[#7ed957]/[0.04] transition-all cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/[0.06] flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
          placeholder="Ask anything about 0nCore..."
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] placeholder:text-white/25 outline-none focus:border-[#7ed957]/30 transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl bg-[#7ed957] flex items-center justify-center cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-30"
        >
          <Send className="w-4 h-4 text-[#020810]" />
        </button>
      </div>
    </div>
  )
}
