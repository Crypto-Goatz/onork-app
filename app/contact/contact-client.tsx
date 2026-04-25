'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, User, Calendar, Mail, X, MessageSquare, Users, ArrowRight } from 'lucide-react'

// ── Types ──
interface Message { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'What is 0nCore?',
  'How much does it cost?',
  'How does the LinkedIn bot work?',
  'Can I try it for free?',
]

// ── Sound Wave Visualizer ──
function SoundWave({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full transition-all duration-300"
          style={{
            height: active ? `${12 + Math.sin(i * 0.8) * 10 + Math.random() * 8}px` : '4px',
            background: `linear-gradient(to top, #7ed957, #00d4ff)`,
            opacity: active ? 0.6 + Math.random() * 0.4 : 0.2,
            animationName: active ? 'waveBar' : 'none',
            animationDuration: `${0.4 + Math.random() * 0.4}s`,
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            animationTimingFunction: 'ease-in-out',
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  )
}

// ── Modal Wrapper ──
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#0d1117] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)] animate-[modalIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div />
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all bg-transparent border-none cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  )
}

// ── Main Component ──
export function ContactClient() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hey! I'm Jaxx — the AI behind 0nCore. Ask me anything about the platform, pricing, features, or how it works. I know everything." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactSent, setContactSent] = useState(false)
  const [contactSending, setContactSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async (text?: string) => {
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
  }, [input, loading, messages])

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contactForm.email) return
    setContactSending(true)

    // Send to CRM via the engine
    try {
      await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `Create a CRM contact: name=${contactForm.name}, email=${contactForm.email}, message=${contactForm.message}, source=website-contact-form`,
        }),
      })
    } catch {}

    setContactSent(true)
    setContactSending(false)

    // Add summary to Jaxx chat
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Got it! I've saved ${contactForm.name || 'your'} contact info. Someone from our team will reach out to ${contactForm.email} shortly. Anything else I can help with?`,
    }])
  }

  const hasUserMessages = messages.length > 1

  return (
    <>
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-6">

          {/* LEFT: Jaxx AI Chat with Sound Wave */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col min-h-[540px] overflow-hidden">
            {/* Header with sound wave */}
            <div className="px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-[#7ed957]/[0.06] to-[#00d4ff]/[0.03]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Circular sound wave container */}
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#7ed957]/20 to-[#00d4ff]/20 border border-[#7ed957]/20 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <SoundWave active={loading} />
                    </div>
                    {!loading && (
                      <Sparkles className="w-5 h-5 text-[#7ed957] relative z-10" />
                    )}
                    {/* Pulse ring when active */}
                    {loading && (
                      <div className="absolute inset-0 rounded-full border-2 border-[#7ed957]/30 animate-ping" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white flex items-center gap-1.5">
                      Jaxx
                      <span className="w-[6px] h-[6px] rounded-full bg-[#7ed957] shadow-[0_0_8px_#7ed957]" />
                    </h3>
                    <p className="text-[11px] text-white/30">0nCore AI &middot; Ask me anything</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7ed957]/20 to-[#00d4ff]/20 flex items-center justify-center shrink-0 mt-0.5">
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
                    <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3 h-3 text-white/40" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7ed957]/20 to-[#00d4ff]/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-[#7ed957]" />
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7ed957]/50 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]/50 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6]/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {!hasUserMessages && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/50 hover:text-white hover:border-[#7ed957]/30 hover:bg-[#7ed957]/[0.04] transition-all cursor-pointer">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/[0.06] flex gap-2">
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()} disabled={loading}
                placeholder="Ask anything about 0nCore..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] placeholder:text-white/25 outline-none focus:border-[#7ed957]/30 transition-colors disabled:opacity-50" />
              <button onClick={() => send()} disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-[#7ed957] flex items-center justify-center cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-30">
                <Send className="w-4 h-4 text-[#020810]" />
              </button>
            </div>

            <style>{`@keyframes waveBar { 0% { transform: scaleY(0.3); } 100% { transform: scaleY(1); } }`}</style>
          </div>

          {/* RIGHT: Action Cards */}
          <div className="space-y-4">
            {/* Book a Demo — opens modal */}
            <button onClick={() => setShowCalendar(true)}
              className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-[#7ed957]/20 transition-all text-left cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#7ed957]/10 flex items-center justify-center shrink-0 group-hover:bg-[#7ed957]/20 transition-colors">
                  <Calendar className="w-5 h-5 text-[#7ed957]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-white mb-1">Book a Demo</h3>
                  <p className="text-[13px] text-white/40 mb-2">See 0nCore in action. 15-minute walkthrough tailored to your business.</p>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7ed957]">
                    Schedule now <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </button>

            {/* Send a Message — opens modal */}
            <button onClick={() => setShowContactForm(true)}
              className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-[#00d4ff]/20 transition-all text-left cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 flex items-center justify-center shrink-0 group-hover:bg-[#00d4ff]/20 transition-colors">
                  <Mail className="w-5 h-5 text-[#00d4ff]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-white mb-1">Send a Message</h3>
                  <p className="text-[13px] text-white/40 mb-2">For partnerships, enterprise inquiries, or detailed support.</p>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#00d4ff]">
                    Open form <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </button>

            {/* Community */}
            <a href="https://0nmcp.com/community" target="_blank" rel="noopener noreferrer"
              className="block rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-[#14b8a6]/20 transition-all no-underline group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#14b8a6]/10 flex items-center justify-center shrink-0 group-hover:bg-[#14b8a6]/20 transition-colors">
                  <Users className="w-5 h-5 text-[#14b8a6]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white mb-1">Join the Community</h3>
                  <p className="text-[13px] text-white/40 mb-2">Connect with other 0nCore users. Share workflows, swap ideas.</p>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#14b8a6]">
                    Join on 0nmcp.com <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </a>

            {/* Stats */}
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-[#7ed957]/[0.04] to-[#00d4ff]/[0.03] p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[22px] font-extrabold text-[#7ed957]">1,554</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Tools</div>
                </div>
                <div>
                  <div className="text-[22px] font-extrabold text-[#00d4ff]">96</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Services</div>
                </div>
                <div>
                  <div className="text-[22px] font-extrabold text-[#14b8a6]">5</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Patents</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calendar Modal */}
      <Modal open={showCalendar} onClose={() => setShowCalendar(false)}>
        <div className="p-1">
          <iframe
            src="https://api.rocketclients.com/widget/booking/5xtTejAwYmiwULqboaL7"
            className="w-full border-none rounded-b-2xl"
            style={{ height: '650px' }}
            title="Book a Demo"
          />
        </div>
      </Modal>

      {/* Contact Form Modal */}
      <Modal open={showContactForm} onClose={() => { setShowContactForm(false); setContactSent(false) }}>
        <div className="p-6">
          {contactSent ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-[#7ed957]/15 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-7 h-7 text-[#7ed957]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Message sent!</h3>
              <p className="text-sm text-white/40">We&apos;ll get back to you shortly. Check your email for a confirmation.</p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold text-white mb-1">Send us a message</h3>
              <p className="text-sm text-white/40 mb-5">We&apos;ll respond within 24 hours.</p>
              <form onSubmit={handleContactSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">Name</label>
                  <input type="text" value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your name" required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] placeholder:text-white/20 outline-none focus:border-[#7ed957]/30" />
                </div>
                <div>
                  <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="you@company.com" required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] placeholder:text-white/20 outline-none focus:border-[#7ed957]/30" />
                </div>
                <div>
                  <label className="block text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">Message</label>
                  <textarea value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us about your project..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[13px] placeholder:text-white/20 outline-none focus:border-[#7ed957]/30 resize-none" />
                </div>
                <button type="submit" disabled={contactSending}
                  className="w-full py-3 rounded-xl bg-[#7ed957] text-[#020810] text-[14px] font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-50">
                  {contactSending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}
