'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

type ChatMode = 'floating' | 'pinned-right' | 'pinned-bottom' | 'fullscreen'

const QUICK_ACTIONS = [
  { label: 'Create Contact', cmd: 'Create a new contact', icon: '👤' },
  { label: 'Send Email', cmd: 'Help me compose an email', icon: '✉️' },
  { label: 'Run Workflow', cmd: 'Show me available workflows', icon: '⚡' },
  { label: 'Check Analytics', cmd: 'Show my analytics overview', icon: '📊' },
  { label: 'HIPAA Scan', cmd: 'Run a HIPAA compliance scan', icon: '🛡' },
  { label: 'Schedule Task', cmd: 'Create a new task', icon: '✓' },
  { label: 'Search Contacts', cmd: 'Search my contacts', icon: '🔍' },
  { label: 'Blog Post', cmd: 'Help me write a blog post', icon: '📝' },
]

export function AIChatBox() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [greeted, setGreeted] = useState(false)
  const [mode, setMode] = useState<ChatMode>('floating')
  const [showMenu, setShowMenu] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ w: 400, h: 560 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  // Only show on dashboard pages
  if (!pathname?.startsWith('/dashboard')) return null

  // Initialize position
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPos({ x: window.innerWidth - 424, y: window.innerHeight - 584 })
    }
  }, [])

  useEffect(() => {
    if (open && !greeted) {
      setMessages([{ role: 'assistant', content: "I'm Jaxx — your AI engine. I can manage contacts, run workflows, write content, check compliance, and navigate anywhere in 0nCore. What do you need?" }])
      setGreeted(true)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open, greeted])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (mode !== 'floating') return
    e.preventDefault()
    setIsDragging(true)
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }, [mode, pos])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
    const onUp = () => setIsDragging(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [isDragging])

  // Resize handlers
  useEffect(() => {
    if (!isResizing) return
    const onMove = (e: MouseEvent) => {
      const box = boxRef.current
      if (!box) return
      setSize({
        w: Math.max(340, e.clientX - pos.x),
        h: Math.max(300, e.clientY - pos.y),
      })
    }
    const onUp = () => setIsResizing(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [isResizing, pos])

  async function sendMessage(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    setInput('')
    setShowActions(false)
    setLoading(true)

    try {
      const res = await fetch('/api/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, persona: 'engine' }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'Something went wrong.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Mode-specific styles
  const getContainerStyle = (): React.CSSProperties => {
    if (mode === 'fullscreen') return { position: 'fixed', inset: 0, zIndex: 9999, borderRadius: 0 }
    if (mode === 'pinned-right') return { position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, zIndex: 9999, borderRadius: 0, borderLeft: '1px solid var(--border, #30363d)' }
    if (mode === 'pinned-bottom') return { position: 'fixed', bottom: 0, left: 0, right: 0, height: 400, zIndex: 9999, borderRadius: 0, borderTop: '1px solid var(--border, #30363d)' }
    return { position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: 9999, borderRadius: 14, border: '1px solid rgba(110,224,90,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(110,224,90,0.04)' }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
        width: 52, height: 52, borderRadius: 14,
        background: 'linear-gradient(135deg, #6EE05A, #00B4FF)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(110,224,90,0.3)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(110,224,90,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(110,224,90,0.3)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d1117" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </button>
    )
  }

  return (
    <div ref={boxRef} style={{ ...getContainerStyle(), background: 'var(--card, #161b22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ═══ Header — draggable ═══ */}
      <div
        onMouseDown={onDragStart}
        style={{
          padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border, #30363d)',
          cursor: mode === 'floating' ? 'grab' : 'default',
          userSelect: 'none', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(110,224,90,0.04), transparent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, rgba(110,224,90,0.15), rgba(0,180,255,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6EE05A" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground, #f0f4f8)', display: 'flex', alignItems: 'center', gap: 6 }}>
              Jaxx
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6EE05A', boxShadow: '0 0 6px #6EE05A' }} />
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted-foreground, #6b7280)' }}>0nAI Engine</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Mode menu */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(!showMenu)} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              ⋮
            </button>
            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 1 }} onClick={() => setShowMenu(false)} />
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 180, background: 'var(--card, #161b22)', border: '1px solid var(--border, #30363d)', borderRadius: 8, padding: 4, zIndex: 2, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
                  {[
                    { label: 'Floating', mode: 'floating' as ChatMode, icon: '◻️' },
                    { label: 'Pin Right', mode: 'pinned-right' as ChatMode, icon: '▶️' },
                    { label: 'Pin Bottom', mode: 'pinned-bottom' as ChatMode, icon: '🔽' },
                    { label: 'Full Screen', mode: 'fullscreen' as ChatMode, icon: '⬜' },
                  ].map(opt => (
                    <button key={opt.mode} onClick={() => { setMode(opt.mode); setShowMenu(false) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 12, fontWeight: 500, color: mode === opt.mode ? 'var(--primary, #6EE05A)' : 'var(--foreground)', background: mode === opt.mode ? 'rgba(110,224,90,0.06)' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                    >
                      <span>{opt.icon}</span> {opt.label}
                      {mode === opt.mode && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: 'auto' }}><polyline points="20 6 9 17 4 12" /></svg>}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border, #30363d)', margin: '4px 0' }} />
                  <button onClick={() => { setMessages([]); setGreeted(false); setShowMenu(false) }}
                    style={{ width: '100%', padding: '7px 10px', fontSize: 12, color: 'var(--muted-foreground)', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    Clear Chat
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Minimize */}
          <button onClick={() => setOpen(false)} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* ═══ Messages ═══ */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: 12,
              background: msg.role === 'user' ? 'rgba(110,224,90,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(110,224,90,0.15)' : 'var(--border, #30363d)'}`,
              color: 'var(--foreground, #f0f4f8)', fontSize: 13, lineHeight: 1.6,
              borderBottomRightRadius: msg.role === 'user' ? 4 : 12,
              borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 12,
            }}>
              {msg.content}
            </div>
            {msg.timestamp && <span style={{ fontSize: 9, color: 'var(--muted-foreground)', marginTop: 2, padding: '0 4px' }}>{msg.timestamp}</span>}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 14px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary, #6EE05A)', animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        )}
      </div>

      {/* ═══ Quick Actions ═══ */}
      {showActions && (
        <div style={{ padding: '8px 14px 0', display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: '1px solid var(--border, #30363d)' }}>
          {QUICK_ACTIONS.map(a => (
            <button key={a.label} onClick={() => sendMessage(a.cmd)} style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border, #30363d)',
              color: 'var(--foreground)', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span>{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      )}

      {/* ═══ Input ═══ */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border, #30363d)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button onClick={() => setShowActions(!showActions)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border, #30363d)', background: 'transparent', color: showActions ? 'var(--primary, #6EE05A)' : 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask Jaxx anything..."
            rows={1}
            style={{
              flex: 1, resize: 'none', padding: '8px 12px',
              background: 'transparent', border: '1px solid var(--border, #30363d)',
              borderRadius: 8, color: 'var(--foreground)', fontSize: 13,
              fontFamily: 'inherit', outline: 'none', maxHeight: 100,
              lineHeight: 1.4,
            }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading} style={{
            width: 34, height: 34, borderRadius: 8, border: 'none', flexShrink: 0,
            background: input.trim() ? 'var(--primary, #6EE05A)' : 'var(--border, #30363d)',
            color: input.trim() ? 'var(--primary-foreground, #0d1117)' : 'var(--muted-foreground)',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>

      {/* Resize handle (floating mode only) */}
      {mode === 'floating' && (
        <div onMouseDown={e => { e.preventDefault(); setIsResizing(true) }} style={{
          position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, cursor: 'nwse-resize',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: 'absolute', bottom: 3, right: 3, opacity: 0.2 }}>
            <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
