'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send } from 'lucide-react'

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
      <div
        className={[
          'fixed right-6 w-[380px] h-[540px] bg-[#0C0D12] border border-[#6EE05A]/15 rounded-2xl',
          'shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(110,224,90,0.05)]',
          'flex flex-col overflow-hidden z-[9999] transition-[bottom] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'font-[system-ui,-apple-system,sans-serif]',
          open ? 'bottom-6' : '-bottom-[600px]',
        ].join(' ')}
      >
        {/* Header */}
        <div className="px-[18px] py-3.5 bg-gradient-to-br from-[#6EE05A]/[.08] to-[#6EE05A]/[.02] border-b border-white/[.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/brand/0n-neon-logo.svg"
              alt="0nAI"
              className="w-7 h-7 rounded-md"
            />
            <div>
              <div className="text-[14px] font-bold text-[#E8ECF4] flex items-center gap-1.5">
                0nAI
                <span className="w-1.5 h-1.5 rounded-full bg-[#6EE05A] shadow-[0_0_6px_#6EE05A] inline-block" />
              </div>
              <div className="text-[10px] text-white/35">
                AI Assistant · Always online
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-md border border-white/[.08] bg-white/[.03] text-white/40 cursor-pointer flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 items-end ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#6EE05A] to-[#4ecb3a] flex items-center justify-center text-[8px] font-extrabold text-[#080B0F] shrink-0">
                  0n
                </div>
              )}
              <div
                className={[
                  'max-w-[75%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words',
                  msg.role === 'user'
                    ? 'bg-[#6EE05A] text-[#080B0F] rounded-[14px_14px_4px_14px]'
                    : 'bg-white/[.05] text-[#E8ECF4] rounded-[14px_14px_14px_4px]',
                ].join(' ')}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 items-end">
              <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#6EE05A] to-[#4ecb3a] flex items-center justify-center text-[8px] font-extrabold text-[#080B0F] shrink-0">
                0n
              </div>
              <div className="px-3.5 py-2.5 rounded-[14px_14px_14px_4px] bg-white/[.05] flex gap-1 items-center">
                <span className="w-[5px] h-[5px] rounded-full bg-[#6EE05A] opacity-50 animate-[wPulse_1.2s_infinite]" />
                <span className="w-[5px] h-[5px] rounded-full bg-[#6EE05A] opacity-50 animate-[wPulse_1.2s_infinite_200ms]" />
                <span className="w-[5px] h-[5px] rounded-full bg-[#6EE05A] opacity-50 animate-[wPulse_1.2s_infinite_400ms]" />
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        {messages.length <= 1 && !loading && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
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
                className="px-2.5 py-[5px] rounded-lg border border-[#6EE05A]/15 bg-[#6EE05A]/[.05] text-[#6EE05A] text-[11px] cursor-pointer font-[inherit] transition-[background] duration-150"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/[.06] flex gap-2 bg-black/20">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask 0nAI anything..."
            className="flex-1 px-3.5 py-2.5 rounded-[10px] border border-white/[.08] bg-white/[.03] text-[#E8ECF4] text-[13px] outline-none font-[inherit]"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={[
              'w-10 h-10 rounded-[10px] border-none flex items-center justify-center shrink-0 transition-[background] duration-150',
              loading || !input.trim()
                ? 'bg-white/[.05] cursor-not-allowed'
                : 'bg-[#6EE05A] cursor-pointer',
            ].join(' ')}
          >
            <Send
              size={16}
              className={loading || !input.trim() ? 'text-white/20' : 'text-[#080B0F]'}
            />
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 pb-2 pt-1.5 text-center text-[9px] text-white/15">
          Powered by <span className="text-[#6EE05A]">0nAI</span> ·{' '}
          <a href="https://0ncore.com" className="text-white/20 no-underline">Get this bot for $8/mo</a>
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={[
          'fixed bottom-6 right-6 w-14 h-14 rounded-2xl border-none cursor-pointer',
          'flex items-center justify-center z-[9998] transition-all duration-200 ease-in-out',
          open
            ? 'hidden bg-white/[.05] border border-white/10'
            : 'bg-gradient-to-br from-[#6EE05A] to-[#4ecb3a] shadow-[0_4px_20px_rgba(110,224,90,0.3),0_0_40px_rgba(110,224,90,0.1)]',
        ].join(' ')}
      >
        <img
          src="/brand/0n-neon-logo.svg"
          alt="Chat with 0nAI"
          className="w-8 h-8"
        />
      </button>

      <style>{`
        @keyframes wPulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
      `}</style>
    </>
  )
}
