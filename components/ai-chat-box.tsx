'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import {
  MessageSquare, X, Plus, Send, Layers,
  Users, Zap, BarChart3, Shield, CheckSquare, Search, FileText,
  Maximize2, PanelRight, PanelBottom, Square, Trash2, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

type ChatMode = 'floating' | 'pinned-right' | 'pinned-bottom' | 'fullscreen'

const QUICK_ACTIONS = [
  { label: 'Create Contact', cmd: 'Create a new contact', icon: Users },
  { label: 'Send Email', cmd: 'Help me compose an email', icon: MessageSquare },
  { label: 'Run Workflow', cmd: 'Show me available workflows', icon: Zap },
  { label: 'Check Analytics', cmd: 'Show my analytics overview', icon: BarChart3 },
  { label: 'HIPAA Scan', cmd: 'Run a HIPAA compliance scan', icon: Shield },
  { label: 'Schedule Task', cmd: 'Create a new task', icon: CheckSquare },
  { label: 'Search Contacts', cmd: 'Search my contacts', icon: Search },
  { label: 'Blog Post', cmd: 'Help me write a blog post', icon: FileText },
]

const MODE_OPTIONS: { label: string; mode: ChatMode; icon: typeof Maximize2 }[] = [
  { label: 'Floating', mode: 'floating', icon: Square },
  { label: 'Pin Right', mode: 'pinned-right', icon: PanelRight },
  { label: 'Pin Bottom', mode: 'pinned-bottom', icon: PanelBottom },
  { label: 'Full Screen', mode: 'fullscreen', icon: Maximize2 },
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

  // Floating button (chat closed)
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9998] w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-core-green to-core-cyan border-none cursor-pointer flex items-center justify-center shadow-lg shadow-core-green/30 hover:scale-105 hover:shadow-xl hover:shadow-core-green/40 transition-all duration-200"
      >
        <MessageSquare className="size-6 text-core-bg" />
      </button>
    )
  }

  // Container positioning for non-floating modes
  const pinnedRightClass = 'fixed top-0 right-0 bottom-0 w-[420px] z-[9999] rounded-none border-l border-core-border'
  const pinnedBottomClass = 'fixed bottom-0 left-0 right-0 h-[400px] z-[9999] rounded-none border-t border-core-border'
  const fullscreenClass = 'fixed inset-0 z-[9999] rounded-none'

  return (
    <>
      {/* Overlay wrapper for floating: uses inline style for dynamic pos/size only */}
      <div
        ref={boxRef}
        className={cn(
          'bg-core-card flex flex-col overflow-hidden',
          mode === 'fullscreen' && fullscreenClass,
          mode === 'pinned-right' && pinnedRightClass,
          mode === 'pinned-bottom' && pinnedBottomClass,
          mode === 'floating' && 'fixed z-[9999] rounded-2xl border border-core-green/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
        )}
        style={mode === 'floating' ? { left: pos.x, top: pos.y, width: size.w, height: size.h } : undefined}
      >
        {/* ═══ Header — draggable ═══ */}
        <div
          onMouseDown={onDragStart}
          className={cn(
            'px-3.5 py-2.5 flex items-center justify-between border-b border-core-border shrink-0 bg-gradient-to-r from-core-green/[0.04] to-transparent select-none',
            mode === 'floating' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-core-green/15 to-core-cyan/15 flex items-center justify-center">
              <Layers className="size-3.5 text-core-green" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-core-text flex items-center gap-1.5">
                Jaxx
                <span className="w-[5px] h-[5px] rounded-full bg-core-green shadow-[0_0_6px_theme(colors.core-green)]" />
              </div>
              <div className="text-[9px] text-core-text-muted">0nAI Engine</div>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Mode menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-[26px] h-[26px] rounded-md border-none bg-transparent text-core-text-muted hover:text-core-text hover:bg-core-card-hover cursor-pointer flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-[1]" onClick={() => setShowMenu(false)} />
                  <div className="absolute top-full right-0 mt-1 w-[180px] bg-core-card border border-core-border rounded-lg p-1 z-[2] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
                    {MODE_OPTIONS.map(opt => {
                      const Icon = opt.icon
                      return (
                        <button key={opt.mode} onClick={() => { setMode(opt.mode); setShowMenu(false) }}
                          className={cn(
                            'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors text-left border-none',
                            mode === opt.mode
                              ? 'bg-core-green/[0.06] text-core-green'
                              : 'bg-transparent text-core-text hover:bg-core-card-hover'
                          )}
                        >
                          <Icon className="size-3.5" />
                          {opt.label}
                          {mode === opt.mode && <Check className="size-3 ml-auto" />}
                        </button>
                      )
                    })}
                    <div className="border-t border-core-border my-1" />
                    <button
                      onClick={() => { setMessages([]); setGreeted(false); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-core-text-muted hover:text-core-text bg-transparent hover:bg-core-card-hover rounded-md cursor-pointer border-none transition-colors text-left"
                    >
                      <Trash2 className="size-3.5" />
                      Clear Chat
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="w-[26px] h-[26px] rounded-md border-none bg-transparent text-core-text-muted hover:text-core-text hover:bg-core-card-hover cursor-pointer flex items-center justify-center transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* ═══ Messages ═══ */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
              <div className={cn(
                'max-w-[85%] px-3.5 py-2.5 rounded-xl text-core-text text-[13px] leading-relaxed',
                msg.role === 'user'
                  ? 'bg-core-green/10 border border-core-green/15 rounded-br-sm'
                  : 'bg-white/[0.03] border border-core-border rounded-bl-sm'
              )}>
                {msg.content}
              </div>
              {msg.timestamp && (
                <span className="text-[9px] text-core-text-muted mt-0.5 px-1">{msg.timestamp}</span>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-1 px-3.5 py-2">
              {[
                'animate-[dotPulse_1.2s_ease-in-out_0s_infinite]',
                'animate-[dotPulse_1.2s_ease-in-out_0.15s_infinite]',
                'animate-[dotPulse_1.2s_ease-in-out_0.3s_infinite]',
              ].map((animClass, i) => (
                <div
                  key={i}
                  className={cn('w-1.5 h-1.5 rounded-full bg-core-green', animClass)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ═══ Quick Actions ═══ */}
        {showActions && (
          <div className="px-3.5 pt-2 pb-0 flex flex-wrap gap-1.5 border-t border-core-border">
            {QUICK_ACTIONS.map(a => {
              const Icon = a.icon
              return (
                <button key={a.label} onClick={() => sendMessage(a.cmd)}
                  className="flex items-center gap-1 px-2.5 py-[5px] rounded-md text-[11px] font-medium bg-white/[0.03] border border-core-border text-core-text hover:bg-core-card-hover hover:border-core-green/20 cursor-pointer transition-colors"
                >
                  <Icon className="size-3 text-core-text-muted" />
                  {a.label}
                </button>
              )
            })}
          </div>
        )}

        {/* ═══ Input ═══ */}
        <div className="p-3 border-t border-core-border shrink-0">
          <div className="flex gap-2 items-end">
            <button
              onClick={() => setShowActions(!showActions)}
              className={cn(
                'w-[34px] h-[34px] rounded-lg border bg-transparent cursor-pointer flex items-center justify-center shrink-0 transition-colors',
                showActions ? 'border-core-green text-core-green' : 'border-core-border text-core-text-muted hover:text-core-text'
              )}
            >
              <Plus className="size-4" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Ask Jaxx anything..."
              rows={1}
              className="flex-1 resize-none px-3 py-2 bg-transparent border border-core-border rounded-lg text-core-text text-[13px] placeholder:text-core-text-muted focus:border-core-green/40 focus:outline-none max-h-[100px] leading-snug"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={cn(
                'w-[34px] h-[34px] rounded-lg border-none shrink-0 flex items-center justify-center transition-colors',
                input.trim()
                  ? 'bg-core-green text-core-bg cursor-pointer hover:bg-core-green/90'
                  : 'bg-core-border text-core-text-muted cursor-default'
              )}
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>

        {/* Resize handle (floating mode only) */}
        {mode === 'floating' && (
          <div
            onMouseDown={e => { e.preventDefault(); setIsResizing(true) }}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end pb-[3px] pr-[3px]"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-20 text-core-text-muted">
              <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}
