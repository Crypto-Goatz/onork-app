'use client'
/**
 * Floating Jaxx widget — voice + text picker, mirrors /contact/page.
 *
 * Replaces the previous CRM widget loader (which renders fine but won't
 * connect because it has no container hook). Now a self-contained UI on
 * top of /api/chat/public + Web Speech API — exact same backend as the
 * contact page.
 */

import { useEffect, useRef, useState } from 'react'
import { Mic, MessageCircle, Sparkles, Send, X, ChevronLeft } from 'lucide-react'

type Mode = 'select' | 'voice' | 'text'
interface Msg { role: 'user' | 'assistant'; content: string }

const HELLO: Msg = {
  role: 'assistant',
  content: "Hey, I'm Jaxx. Ask me anything about 0nCore, the CRM, automations, or what we should build for you.",
}

export function VoiceAIWidget() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('select')
  const [messages, setMessages] = useState<Msg[]>([HELLO])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')

  const recogRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, transcript])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.continuous = false
    r.interimResults = true
    r.lang = 'en-US'
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((res: any) => res[0].transcript).join('')
      setTranscript(t)
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false)
        sendVoice(t)
      }
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    recogRef.current = r
  }, [])

  function startListening() {
    if (!recogRef.current) {
      setMode('text')
      setMessages((m) => [...m, { role: 'assistant', content: "Voice isn't supported in this browser — switching to text." }])
      return
    }
    setTranscript('')
    setListening(true)
    try { recogRef.current.start() } catch {}
  }

  function stopListening() {
    if (recogRef.current) try { recogRef.current.stop() } catch {}
    setListening(false)
  }

  async function sendText(text: string) {
    const t = text.trim()
    if (!t) return
    const next = [...messages, { role: 'user' as const, content: t }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const r = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await r.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || "I'm here to help." }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Connection issue — try again or email mike@rocketopp.com.' }])
    } finally {
      setBusy(false)
    }
  }

  async function sendVoice(text: string) {
    const t = text.trim()
    if (!t) return
    setTranscript('')
    const next = [...messages, { role: 'user' as const, content: t }]
    setMessages(next)
    setBusy(true)
    try {
      const r = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await r.json()
      const reply = data.reply || "I'm here to help."
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(reply)
        u.rate = 1.05
        u.pitch = 1.0
        window.speechSynthesis.speak(u)
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Connection issue — try again.' }])
    } finally {
      setBusy(false)
    }
  }

  function close() {
    stopListening()
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full bg-[#7ed957] shadow-[0_4px_20px_rgba(126,217,87,0.3)] flex items-center justify-center cursor-pointer border-none hover:scale-105 transition-transform group"
        aria-label="Talk to Jaxx"
      >
        <Mic className="w-6 h-6 text-[#020810]" />
        <span className="absolute -top-8 right-0 px-2.5 py-1 rounded-lg bg-[#0d1117] border border-white/[0.08] text-[11px] text-white/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Talk to Jaxx
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-[380px] h-[560px] rounded-2xl bg-[#0d1117] border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col animate-[voiceIn_0.25s_ease-out]">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-gradient-to-r from-[#7ed957]/[0.04] to-transparent">
        <div className="flex items-center gap-2.5">
          {mode !== 'select' && (
            <button
              onClick={() => { stopListening(); setMode('select') }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all bg-transparent border-none cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-[#7ed957]/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#7ed957]" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5">
              Jaxx <span className="w-[5px] h-[5px] rounded-full bg-[#7ed957] shadow-[0_0_6px_#7ed957]" />
            </h3>
            <p className="text-[10px] text-white/30">
              {mode === 'select' ? 'Voice or text' : mode === 'voice' ? 'Speak naturally' : 'Type your question'}
            </p>
          </div>
        </div>
        <button
          onClick={close}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all bg-transparent border-none cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {mode === 'select' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7ed957]/20 to-[#00d4ff]/20 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-[#7ed957]" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">Talk to Jaxx</h3>
            <p className="text-[12px] text-white/40">Choose how you want to chat</p>
          </div>
          <div className="flex gap-3 w-full justify-center">
            <button
              onClick={() => { setMode('voice'); startListening() }}
              className="flex flex-col items-center gap-2.5 px-6 py-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-[#7ed957]/30 hover:bg-[#7ed957]/[0.04] transition-all cursor-pointer group min-w-[120px]"
            >
              <div className="w-12 h-12 rounded-full bg-[#7ed957]/10 border border-[#7ed957]/20 flex items-center justify-center group-hover:bg-[#7ed957]/20 transition-colors">
                <Mic className="w-5 h-5 text-[#7ed957]" />
              </div>
              <span className="text-[12px] font-semibold text-white">Voice</span>
              <span className="text-[10px] text-white/30">Speak naturally</span>
            </button>
            <button
              onClick={() => setMode('text')}
              className="flex flex-col items-center gap-2.5 px-6 py-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/[0.04] transition-all cursor-pointer group min-w-[120px]"
            >
              <div className="w-12 h-12 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center group-hover:bg-[#00d4ff]/20 transition-colors">
                <MessageCircle className="w-5 h-5 text-[#00d4ff]" />
              </div>
              <span className="text-[12px] font-semibold text-white">Text</span>
              <span className="text-[10px] text-white/30">Type questions</span>
            </button>
          </div>
        </div>
      )}

      {mode === 'voice' && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <MessageRow key={i} role={msg.role} content={msg.content} />
            ))}
            {transcript && listening && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-[12px] text-white/40 bg-white/[0.02] border border-white/[0.04] rounded-br-sm italic">
                  {transcript}…
                </div>
              </div>
            )}
            {busy && <Typing />}
          </div>
          <div className="px-4 py-4 border-t border-white/[0.06] flex flex-col items-center gap-2 shrink-0">
            <button
              onClick={listening ? stopListening : startListening}
              className={`w-14 h-14 rounded-full border-none cursor-pointer transition-all flex items-center justify-center ${
                listening
                  ? 'bg-red-500/20 ring-2 ring-red-500/40 animate-pulse'
                  : 'bg-[#7ed957] hover:scale-105'
              }`}
              aria-label={listening ? 'Stop listening' : 'Start listening'}
            >
              <Mic className={`w-5 h-5 ${listening ? 'text-red-400' : 'text-[#020810]'}`} />
            </button>
            <span className="text-[10px] text-white/40">
              {listening ? 'Listening — click to stop' : 'Click to speak'}
            </span>
          </div>
        </>
      )}

      {mode === 'text' && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <MessageRow key={i} role={msg.role} content={msg.content} />
            ))}
            {busy && <Typing />}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); sendText(input) }}
            className="px-3 py-3 border-t border-white/[0.06] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#7ed957]/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="w-9 h-9 rounded-lg bg-[#7ed957] text-[#020810] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none transition-transform active:scale-95"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}

      <style>{`
        @keyframes voiceIn { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>
    </div>
  )
}

function MessageRow({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  return (
    <div className={`flex gap-2 ${role === 'user' ? 'justify-end' : ''}`}>
      {role === 'assistant' && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7ed957]/20 to-[#00d4ff]/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-[#7ed957]" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[12px] leading-relaxed ${
          role === 'user'
            ? 'bg-[#7ed957]/15 border border-[#7ed957]/20 text-white rounded-br-sm'
            : 'bg-white/[0.04] border border-white/[0.06] text-white/80 rounded-bl-sm'
        }`}
      >
        {content}
      </div>
    </div>
  )
}

function Typing() {
  return (
    <div className="flex gap-2">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7ed957]/20 to-[#00d4ff]/20 flex items-center justify-center shrink-0">
        <Sparkles className="w-3 h-3 text-[#7ed957]" />
      </div>
      <div className="rounded-2xl px-3.5 py-2 bg-white/[0.04] border border-white/[0.06] text-white/40 rounded-bl-sm flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
