'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, User, Calendar, Mail, X, MessageSquare, Users, ArrowRight, Mic, MessageCircle } from 'lucide-react'

// ── Types ──
type ChatMode = 'select' | 'text' | 'voice'
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
  const [chatMode, setChatMode] = useState<ChatMode>('select')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hey! I'm Jaxx — the AI behind 0nCore. Ask me anything about the platform, pricing, features, or how it works. I know everything." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceClarify, setVoiceClarify] = useState('')
  const [voiceActive, setVoiceActive] = useState(false)
  const voiceContainerRef = useRef<HTMLDivElement>(null)
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

  // Load voice widget when offcanvas opens
  useEffect(() => {
    if (!voiceActive || !voiceContainerRef.current) return
    const container = voiceContainerRef.current

    // Don't re-add if already loaded
    if (container.querySelector('script')) return

    const script = document.createElement('script')
    script.src = 'https://widgets.leadconnectorhq.com/loader.js'
    script.setAttribute('data-resources-url', 'https://widgets.leadconnectorhq.com/chat-widget/loader.js')
    script.setAttribute('data-widget-id', 'd01e99a1-ed3f-4f24-b4d8-407009a165a7')
    script.async = true
    container.appendChild(script)

    return () => {
      // Cleanup on close
      const scripts = container.querySelectorAll('script')
      scripts.forEach(s => s.remove())
    }
  }, [voiceActive])

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

          {/* LEFT: Jaxx — Voice or Text */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col min-h-[540px] overflow-hidden">

            {/* ═══ MODE SELECT ═══ */}
            {chatMode === 'select' && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7ed957]/20 to-[#00d4ff]/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-[#7ed957]" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-1">Talk to Jaxx</h3>
                  <p className="text-[13px] text-white/40">Choose how you want to chat</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setChatMode('voice')}
                    className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-[#7ed957]/30 hover:bg-[#7ed957]/[0.04] transition-all cursor-pointer group">
                    <div className="w-14 h-14 rounded-full bg-[#7ed957]/10 border border-[#7ed957]/20 flex items-center justify-center group-hover:bg-[#7ed957]/20 transition-colors">
                      <Mic className="w-6 h-6 text-[#7ed957]" />
                    </div>
                    <span className="text-[13px] font-semibold text-white">Voice</span>
                    <span className="text-[10px] text-white/30">Speak naturally</span>
                  </button>
                  <button onClick={() => setChatMode('text')}
                    className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/[0.04] transition-all cursor-pointer group">
                    <div className="w-14 h-14 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center group-hover:bg-[#00d4ff]/20 transition-colors">
                      <MessageCircle className="w-6 h-6 text-[#00d4ff]" />
                    </div>
                    <span className="text-[13px] font-semibold text-white">Text</span>
                    <span className="text-[10px] text-white/30">Type your questions</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══ VOICE MODE — placeholder in panel, real widget in offcanvas ═══ */}
            {chatMode === 'voice' && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-4">
                {/* Circular equalizer visualization */}
                <div className="relative w-[180px] h-[180px] flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-[#14b8a6]/30" />
                  <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
                    {Array.from({ length: 32 }).map((_, i) => {
                      const angle = (i / 32) * Math.PI * 2 - Math.PI / 2
                      const cx = 100 + Math.cos(angle) * 82
                      const cy = 100 + Math.sin(angle) * 82
                      const dx = Math.cos(angle)
                      const dy = Math.sin(angle)
                      return (
                        <line key={i} x1={cx - dx * 4} y1={cy - dy * 4} x2={cx + dx * 4} y2={cy + dy * 4}
                          stroke={voiceActive ? '#7ed957' : '#14b8a6'} strokeWidth="2.5" strokeLinecap="round" opacity="0.3"
                          style={{ animation: voiceActive ? `eqPulse ${0.4 + Math.random() * 0.5}s ease-in-out infinite alternate` : 'none', animationDelay: `${i * 0.03}s` }} />
                      )
                    })}
                  </svg>
                  <button onClick={() => setVoiceActive(!voiceActive)}
                    className={`w-[100px] h-[100px] rounded-full border flex items-center justify-center z-10 cursor-pointer transition-all ${voiceActive ? 'bg-[#7ed957]/10 border-[#7ed957]/30' : 'bg-[#161b22] border-white/[0.06] hover:border-[#14b8a6]/40'}`}>
                    <Mic className={`w-8 h-8 transition-colors ${voiceActive ? 'text-[#7ed957]' : 'text-[#14b8a6]'}`} />
                  </button>
                  {voiceActive && <div className="absolute inset-0 rounded-full border-2 border-[#7ed957]/20 animate-ping" />}
                </div>

                <p className="text-[13px] text-white/40 text-center">{voiceActive ? 'Jaxx is listening...' : 'Tap the mic to start'}</p>
                <p className="text-[10px] text-white/20 text-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#7ed957] mr-1" />Jaxx
                  <span className="inline-block w-2 h-2 rounded-full bg-[#a78bfa] mx-1 ml-3" />You
                </p>

                {/* Clarify input */}
                <div className="w-full mt-4 flex gap-2">
                  <input type="text" value={voiceClarify} onChange={e => setVoiceClarify(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && voiceClarify.trim()) { send(voiceClarify); setVoiceClarify('') } }}
                    placeholder="Type to clarify (if needed)..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-[12px] placeholder:text-white/20 outline-none focus:border-[#7ed957]/20" />
                  <button onClick={() => { if (voiceClarify.trim()) { send(voiceClarify); setVoiceClarify('') } }}
                    className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center cursor-pointer hover:bg-[#7ed957]/10 transition-all">
                    <Send className="w-3.5 h-3.5 text-white/40" />
                  </button>
                </div>

                <button onClick={() => setChatMode('select')} className="text-[11px] text-white/20 hover:text-white/50 bg-transparent border-none cursor-pointer mt-2">
                  Switch to text
                </button>

                <style>{`@keyframes eqPulse { 0% { transform: scaleX(1) scaleY(0.4); opacity: 0.2; } 100% { transform: scaleX(1) scaleY(1.8); opacity: 0.6; } }`}</style>
              </div>
            )}

            {/* ═══ TEXT MODE ═══ */}
            {chatMode === 'text' && (
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="px-5 py-3 border-b border-white/[0.06] bg-gradient-to-r from-[#7ed957]/[0.04] to-transparent flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7ed957]/20 to-[#00d4ff]/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#7ed957]" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5">
                        Jaxx <span className="w-[5px] h-[5px] rounded-full bg-[#7ed957] shadow-[0_0_6px_#7ed957]" />
                      </h3>
                      <p className="text-[10px] text-white/25">0nCore AI</p>
                    </div>
                  </div>
                  <button onClick={() => setChatMode('select')} className="text-[11px] text-white/30 hover:text-white/60 bg-transparent border-none cursor-pointer transition-colors">
                    Switch mode
                  </button>
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
              </div>
            )}
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

      {/* Voice Offcanvas — slides in from right */}
      {voiceActive && (
        <div className="fixed inset-0 z-[10000]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setVoiceActive(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-[#0d1117] border-l border-white/[0.06] shadow-[−20px_0_60px_rgba(0,0,0,0.5)] animate-[slideInRight_0.3s_ease-out] flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7ed957]/10 border border-[#7ed957]/20 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-[#7ed957]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                    Jaxx Voice <span className="w-[6px] h-[6px] rounded-full bg-[#7ed957] shadow-[0_0_8px_#7ed957] animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-white/30">AI Voice Assistant</p>
                </div>
              </div>
              <button onClick={() => setVoiceActive(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all bg-transparent border-none cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voice widget container */}
            <div ref={voiceContainerRef} className="flex-1 relative overflow-hidden" />

            {/* Clarify input */}
            <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
              <div className="flex gap-2">
                <input type="text" value={voiceClarify} onChange={e => setVoiceClarify(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && voiceClarify.trim()) { send(voiceClarify); setVoiceClarify('') } }}
                  placeholder="Type to clarify (if needed)..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-[12px] placeholder:text-white/20 outline-none focus:border-[#7ed957]/20" />
                <button onClick={() => { if (voiceClarify.trim()) { send(voiceClarify); setVoiceClarify('') } }}
                  className="w-10 h-10 rounded-xl bg-[#7ed957] flex items-center justify-center cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors">
                  <Send className="w-4 h-4 text-[#020810]" />
                </button>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
          `}</style>
        </div>
      )}

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
