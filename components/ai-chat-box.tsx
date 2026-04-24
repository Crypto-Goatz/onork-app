'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import {
  MessageSquare, X, Plus, Send, Layers,
  Users, Zap, BarChart3, Shield, CheckSquare, Search, FileText,
  Maximize2, PanelRight, PanelBottom, Square, Trash2, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PendingAction {
  type: string
  label: string
  description: string
  params: Record<string, unknown>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  action?: PendingAction | null
  actionStatus?: 'pending' | 'confirmed' | 'rejected' | 'executed'
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

type ChatMode = 'floating' | 'pinned-right' | 'pinned-bottom' | 'fullscreen'

const SESSIONS_KEY = '0n_chat_sessions'
const ACTIVE_SESSION_KEY = '0n_chat_active'
const MAX_SESSIONS = 50

function generateSessionId() { return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }

function loadSessions(): ChatSession[] {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]') } catch { return [] }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)))
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/### (.+)/g, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- (.+)/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      return match.includes('1.') ? `<ol>${match}</ol>` : `<ul>${match}</ul>`
    })
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>')
    .replace(/<p><\/p>/g, '')
}

function getSessionTitle(messages: Message[]): string {
  const firstUser = messages.find(m => m.role === 'user')
  if (!firstUser) return 'New Chat'
  const text = firstUser.content.slice(0, 40)
  return text.length < firstUser.content.length ? text + '...' : text
}

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
  const [showHistory, setShowHistory] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionExecuting, setActionExecuting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [chatPrefs, setChatPrefs] = useState<{ confirmActions: boolean; showNotifications: boolean; autoSuggest: boolean }>({
    confirmActions: true, showNotifications: true, autoSuggest: true,
  })
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
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

  // Listen for deploy-chat event from header button — opens as centered modal
  useEffect(() => {
    function handleDeploy(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.open) {
        setOpen(true)
        setMode('floating')
        // Center the chat modal
        const w = Math.min(520, window.innerWidth - 48)
        const h = Math.min(640, window.innerHeight - 120)
        setSize({ w, h })
        setPos({
          x: Math.round((window.innerWidth - w) / 2),
          y: Math.round((window.innerHeight - h) / 2) - 20,
        })
        // Show tutorial on first deploy
        const tutDone = localStorage.getItem('0n_chat_tutorial_done')
        if (!tutDone) setShowTutorial(true)
      } else {
        setOpen(false)
      }
    }
    window.addEventListener('0ncore-deploy-chat', handleDeploy)
    return () => window.removeEventListener('0ncore-deploy-chat', handleDeploy)
  }, [])

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = loadSessions()
    setSessions(stored)
    const activeId = localStorage.getItem(ACTIVE_SESSION_KEY)
    const active = stored.find(s => s.id === activeId)
    if (active) {
      setActiveSessionId(active.id)
      setMessages(active.messages)
      setGreeted(true)
    }
  }, [])

  // Auto-save current session on every message change
  useEffect(() => {
    if (!activeSessionId || messages.length === 0) return
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages, title: getSessionTitle(messages), updatedAt: new Date().toISOString() }
          : s
      )
      saveSessions(updated)
      return updated
    })
  }, [messages, activeSessionId])

  // Start new session
  function startNewSession() {
    const id = generateSessionId()
    const greeting: Message = { role: 'assistant', content: "I'm Jaxx — your AI engine. I can manage contacts, run workflows, write content, check compliance, and navigate anywhere in 0nCore. What do you need?" }
    const session: ChatSession = {
      id,
      title: 'New Chat',
      messages: [greeting],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setSessions(prev => {
      const updated = [session, ...prev].slice(0, MAX_SESSIONS)
      saveSessions(updated)
      return updated
    })
    setActiveSessionId(id)
    setMessages([greeting])
    setGreeted(true)
    setShowHistory(false)
    localStorage.setItem(ACTIVE_SESSION_KEY, id)
  }

  // Switch to existing session
  function switchSession(sessionId: string) {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return
    setActiveSessionId(session.id)
    setMessages(session.messages)
    setGreeted(true)
    setShowHistory(false)
    localStorage.setItem(ACTIVE_SESSION_KEY, session.id)
  }

  // Delete a session
  function deleteSession(sessionId: string) {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId)
      saveSessions(updated)
      return updated
    })
    if (activeSessionId === sessionId) {
      setMessages([])
      setActiveSessionId('')
      setGreeted(false)
      localStorage.removeItem(ACTIVE_SESSION_KEY)
    }
  }

  // Initialize position
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPos({ x: window.innerWidth - 424, y: window.innerHeight - 584 })
    }
  }, [])

  useEffect(() => {
    if (open && !greeted) {
      startNewSession()
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

    // Ensure we have an active session
    if (!activeSessionId) startNewSession()

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
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      // Check if the AI wants to execute an action
      if (data.intent?.detected && data.intent?.action) {
        const action: PendingAction = {
          type: data.intent.action,
          label: data.intent.action.replace(/_/g, ' '),
          description: data.reply?.slice(0, 200) || '',
          params: {},
        }

        setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'I can help with that.', timestamp: ts, action, actionStatus: 'pending' }])

        // Show confirmation if enabled
        if (chatPrefs.confirmActions) {
          setPendingAction(action)
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'Something went wrong.', timestamp: ts }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Execute a confirmed action
  async function executeAction(action: PendingAction) {
    setActionExecuting(true)
    setPendingAction(null)

    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `${action.type}: ${JSON.stringify(action.params)}` }),
      })
      const data = await res.json()

      setMessages(prev => {
        const updated = [...prev]
        // Find the last message with this pending action and mark it executed
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].actionStatus === 'pending') {
            updated[i] = { ...updated[i], actionStatus: 'executed' }
            break
          }
        }
        return [...updated, {
          role: 'assistant' as const,
          content: `Done! ${data.output || data.message || action.label + ' completed.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]
      })

      if (chatPrefs.showNotifications) {
        const { toast } = await import('sonner')
        toast.success(action.label, { description: 'Action executed successfully' })
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: 'Action failed. Please try again or do it manually.',
      }])
    }
    setActionExecuting(false)
  }

  function rejectAction() {
    setPendingAction(null)
    setMessages(prev => {
      const updated = [...prev]
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].actionStatus === 'pending') {
          updated[i] = { ...updated[i], actionStatus: 'rejected' }
          break
        }
      }
      return [...updated, {
        role: 'assistant' as const,
        content: 'No problem — cancelled. Let me know if you need anything else.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]
    })
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
                      onClick={() => { startNewSession(); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-core-green bg-transparent hover:bg-core-card-hover rounded-md cursor-pointer border-none transition-colors text-left"
                    >
                      <Plus className="size-3.5" />
                      New Chat
                    </button>
                    <button
                      onClick={() => { setShowHistory(!showHistory); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-core-text-muted hover:text-core-text bg-transparent hover:bg-core-card-hover rounded-md cursor-pointer border-none transition-colors text-left"
                    >
                      <Search className="size-3.5" />
                      Chat History ({sessions.length})
                    </button>
                    <div className="border-t border-core-border my-1" />
                    <button
                      onClick={() => { if (activeSessionId) deleteSession(activeSessionId); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-core-red bg-transparent hover:bg-core-card-hover rounded-md cursor-pointer border-none transition-colors text-left"
                    >
                      <Trash2 className="size-3.5" />
                      Delete Chat
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

        {/* ═══ Session History Sidebar ═══ */}
        {showHistory && (
          <div className="absolute top-[49px] right-0 bottom-0 w-[220px] bg-core-surface border-l border-core-border z-[5] flex flex-col overflow-hidden">
            <div className="px-3 py-2.5 border-b border-core-border flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-core-text-muted uppercase tracking-wide">History</span>
              <button onClick={() => setShowHistory(false)} className="text-core-text-muted hover:text-core-text transition-colors cursor-pointer bg-transparent border-none p-0">
                <X className="size-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <button onClick={startNewSession}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-core-green font-semibold bg-transparent hover:bg-core-green/[0.04] border-none border-b border-core-border cursor-pointer text-left transition-colors">
                <Plus className="size-3" />
                New Chat
              </button>
              {sessions.map(s => (
                <button key={s.id} onClick={() => switchSession(s.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 border-none border-b border-core-border/50 cursor-pointer transition-colors',
                    s.id === activeSessionId
                      ? 'bg-core-green/[0.06] text-core-text'
                      : 'bg-transparent text-core-text-dim hover:bg-core-card-hover'
                  )}>
                  <div className="text-xs font-medium truncate">{s.title}</div>
                  <div className="text-[9px] text-core-text-muted mt-0.5">
                    {s.messages.length - 1} messages · {new Date(s.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </button>
              ))}
              {sessions.length === 0 && (
                <p className="text-[11px] text-core-text-muted text-center py-6">No chat history</p>
              )}
            </div>
          </div>
        )}

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
                {msg.role === 'assistant' ? (
                  <div className="prose-sm [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_strong]:text-core-text [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-core-text [&_h3]:mt-3 [&_h3]:mb-1"
                    dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content) }} />
                ) : msg.content}
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

      {/* ═══ Action Confirmation Modal ═══ */}
      {pendingAction && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-[#161b22] border border-core-green/20 rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)] animate-[tutFadeIn_0.2s_ease-out]">
            <div className="px-6 pt-5 pb-3 bg-gradient-to-b from-core-green/[0.06] to-transparent">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-core-green" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-core-green">Confirm Action</span>
              </div>
              <h3 className="text-[16px] font-bold text-white capitalize">{pendingAction.label}</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-[13px] text-white/50 leading-relaxed mb-4">{pendingAction.description}</p>
              {Object.keys(pendingAction.params).length > 0 && (
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-4">
                  {Object.entries(pendingAction.params).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-1 text-[12px]">
                      <span className="text-white/30 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-white/70">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={rejectAction}
                  className="flex-1 py-2.5 rounded-lg border border-white/[0.08] bg-transparent text-white/50 text-[13px] font-medium hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeAction(pendingAction)}
                  disabled={actionExecuting}
                  className="flex-1 py-2.5 rounded-lg bg-core-green text-core-bg text-[13px] font-bold hover:bg-core-green/90 transition-colors cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionExecuting ? (
                    <div className="w-4 h-4 border-2 border-core-bg border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {actionExecuting ? 'Executing...' : 'Yes, do it'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Interactive Tutorial Overlay ═══ */}
      {showTutorial && (
        <div className="fixed inset-0 z-[99999] pointer-events-none">
          {/* Dark backdrop with cutout */}
          <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={() => {}} />

          {/* Tutorial card — positioned relative to the chat box */}
          <div
            className="absolute pointer-events-auto animate-[tutFadeIn_0.3s_ease-out]"
            style={{
              left: Math.max(16, (pos.x || window.innerWidth / 2 - 260) - 280),
              top: Math.max(80, (pos.y || window.innerHeight / 2 - 320) + [0, 0, 160, 320, 400][tutorialStep] || 0),
              width: 260,
            }}
          >
            <div className="bg-[#161b22] border border-[#6EE05A]/20 rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative">
              {/* Animated arrow pointing right */}
              <div className="absolute -right-6 top-4">
                <svg width="24" height="24" viewBox="0 0 24 24" className="text-[#6EE05A] animate-[arrowBounce_1s_ease-in-out_infinite]">
                  <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>

              {/* Step content */}
              {tutorialStep === 0 && (
                <>
                  <div className="text-[10px] font-bold text-[#6EE05A] uppercase tracking-widest mb-2">Step 1 of 5</div>
                  <h4 className="text-[15px] font-bold text-white mb-1.5">Meet Jaxx, your AI assistant</h4>
                  <p className="text-[12px] text-white/50 leading-relaxed">This is your command center. Type anything in plain English — Jaxx can manage your CRM, run reports, send emails, and execute 1,554 tools.</p>
                </>
              )}
              {tutorialStep === 1 && (
                <>
                  <div className="text-[10px] font-bold text-[#00d4ff] uppercase tracking-widest mb-2">Step 2 of 5</div>
                  <h4 className="text-[15px] font-bold text-white mb-1.5">Drag to move</h4>
                  <p className="text-[12px] text-white/50 leading-relaxed">Grab the header bar and drag the chat anywhere on your screen. Put it wherever works best for your workflow.</p>
                </>
              )}
              {tutorialStep === 2 && (
                <>
                  <div className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-widest mb-2">Step 3 of 5</div>
                  <h4 className="text-[15px] font-bold text-white mb-1.5">Resize to fit</h4>
                  <p className="text-[12px] text-white/50 leading-relaxed">Grab the bottom-right corner to resize. Make it as big or small as you need. It remembers your preference.</p>
                </>
              )}
              {tutorialStep === 3 && (
                <>
                  <div className="text-[10px] font-bold text-[#f5c518] uppercase tracking-widest mb-2">Step 4 of 5</div>
                  <h4 className="text-[15px] font-bold text-white mb-1.5">Change the layout</h4>
                  <p className="text-[12px] text-white/50 leading-relaxed">Click the <strong>three dots menu</strong> (top-right) to pin the chat to the right side, bottom, or go fullscreen. Pick what fits your screen.</p>
                </>
              )}
              {tutorialStep === 4 && (
                <>
                  <div className="text-[10px] font-bold text-[#6EE05A] uppercase tracking-widest mb-2">Step 5 of 5</div>
                  <h4 className="text-[15px] font-bold text-white mb-1.5">Try it now!</h4>
                  <p className="text-[12px] text-white/50 leading-relaxed">Type something like <span className="text-[#6EE05A] font-medium">"show my contacts"</span> or <span className="text-[#6EE05A] font-medium">"write a blog post about AI"</span> and watch Jaxx work.</p>
                </>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === tutorialStep ? 'w-4 bg-[#6EE05A]' : i < tutorialStep ? 'w-1.5 bg-[#6EE05A]/40' : 'w-1.5 bg-white/10'}`} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowTutorial(false); localStorage.setItem('0n_chat_tutorial_done', 'true') }}
                    className="px-3 py-1.5 text-[11px] text-white/30 hover:text-white/50 bg-transparent border-none cursor-pointer transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => {
                      if (tutorialStep < 4) {
                        setTutorialStep(tutorialStep + 1)
                      } else {
                        setShowTutorial(false)
                        localStorage.setItem('0n_chat_tutorial_done', 'true')
                        inputRef.current?.focus()
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[#6EE05A] text-[#0d1117] text-[12px] font-bold hover:bg-[#6EE05A]/90 transition-colors cursor-pointer border-none"
                  >
                    {tutorialStep < 4 ? 'Next' : 'Start Chatting'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pulsing ring around the target area */}
          <div
            className="absolute border-2 border-[#6EE05A]/40 rounded-xl pointer-events-none animate-[tutPulse_2s_ease-in-out_infinite]"
            style={{
              left: (pos.x || window.innerWidth / 2 - 260) - 4,
              top: (pos.y || window.innerHeight / 2 - 320) + [0, -4, (size.h || 560) - 40, 0, (size.h || 560) - 80][tutorialStep],
              width: (size.w || 520) + 8,
              height: tutorialStep === 0 ? (size.h || 560) + 8 : tutorialStep === 1 ? 48 : tutorialStep === 2 ? 40 : tutorialStep === 3 ? 48 : 60,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes tutFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes arrowBounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(6px); }
        }
        @keyframes tutPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </>
  )
}
