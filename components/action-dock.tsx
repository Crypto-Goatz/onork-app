'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  Zap, MessageSquare, ListTodo, Clock, Bookmark,
  Settings, X, ChevronRight, Plus, Search, Phone
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DockTab = 'actions' | 'tasks' | 'notes' | 'phone' | 'timer' | 'search' | 'settings'

const TABS: { key: DockTab; icon: typeof Zap; label: string }[] = [
  { key: 'actions', icon: Zap, label: 'Quick Actions' },
  { key: 'tasks', icon: ListTodo, label: 'Tasks' },
  { key: 'notes', icon: Bookmark, label: 'Notes' },
  { key: 'phone', icon: Phone, label: 'Dialer' },
  { key: 'timer', icon: Clock, label: 'Timer' },
  { key: 'search', icon: Search, label: 'Search' },
  { key: 'settings', icon: Settings, label: 'Settings' },
]

interface QuickTask {
  id: string
  text: string
  done: boolean
}

interface QuickNote {
  id: string
  text: string
  date: string
}

const TASKS_KEY = '0n_dock_tasks'
const NOTES_KEY = '0n_dock_notes'

export function ActionDock() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<DockTab>('actions')
  const [tasks, setTasks] = useState<QuickTask[]>([])
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [taskInput, setTaskInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(25 * 60)
  const [timerPreset, setTimerPreset] = useState(25)
  const [searchQuery, setSearchQuery] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [recentCalls, setRecentCalls] = useState<{ number: string; date: string }[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('0n_recent_calls') || '[]') } catch { return [] }
  })

  // Load persisted data
  useEffect(() => {
    try { const s = localStorage.getItem(TASKS_KEY); if (s) setTasks(JSON.parse(s)) } catch {}
    try { const s = localStorage.getItem(NOTES_KEY); if (s) setNotes(JSON.parse(s)) } catch {}
  }, [])

  useEffect(() => { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)) }, [notes])

  // Timer
  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return
    const t = setInterval(() => setTimerSeconds(p => p <= 1 ? (setTimerRunning(false), 0) : p - 1), 1000)
    return () => clearInterval(t)
  }, [timerRunning, timerSeconds])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // Context-aware quick actions based on current page
  const getActions = () => {
    const base = [
      { label: 'New Task', href: '/dashboard/tasks', icon: ListTodo },
      { label: 'Send Email', href: '/dashboard/email/builder', icon: MessageSquare },
    ]
    if (pathname?.includes('/contacts')) base.unshift({ label: 'Add Contact', href: '/dashboard/contacts', icon: Plus })
    if (pathname?.includes('/social')) base.unshift({ label: 'Quick Post', href: '/dashboard/social', icon: Zap })
    if (pathname?.includes('/pipeline')) base.unshift({ label: 'Add Deal', href: '/dashboard/pipeline', icon: Plus })
    return base
  }

  function addTask() {
    if (!taskInput.trim()) return
    setTasks(p => [{ id: Date.now().toString(), text: taskInput.trim(), done: false }, ...p])
    setTaskInput('')
  }

  function addNote() {
    if (!noteInput.trim()) return
    setNotes(p => [{ id: Date.now().toString(), text: noteInput.trim(), date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }, ...p])
    setNoteInput('')
  }

  function handleTabClick(tab: DockTab) {
    if (isOpen && activeTab === tab) {
      setIsOpen(false)
    } else {
      setActiveTab(tab)
      setIsOpen(true)
    }
  }

  return (
    <>
      {/* ═══ Floating Icon Strip — Right side, vertically centered ═══ */}
      <div
        className="fixed z-[8000] flex flex-col gap-1 transition-all duration-300 ease-out"
        style={{
          right: isOpen ? 340 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = isOpen && activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={cn(
                'group relative flex items-center justify-center w-10 h-10 rounded-l-lg border border-r-0 transition-all duration-200',
                isActive
                  ? 'bg-primary/15 border-primary/30 text-primary'
                  : 'bg-background/80 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border'
              )}
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <Icon className="size-4" />
              {/* Tooltip */}
              {!isOpen && (
                <span className="absolute right-full mr-2 px-2 py-1 text-[10px] font-medium rounded-md bg-popover border border-border text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {tab.label}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ═══ Sliding Panel ═══ */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-[7999] w-[340px] border-l transition-transform duration-300 ease-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderColor: 'hsl(var(--border))',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm font-semibold text-foreground">
            {TABS.find(t => t.key === activeTab)?.label}
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* ── Quick Actions ── */}
          {activeTab === 'actions' && (
            <div className="space-y-2">
              {getActions().map((action, i) => {
                const Icon = action.icon
                return (
                  <a
                    key={i}
                    href={action.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 hover:border-primary/20 transition-all text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Icon className="size-4 text-primary" />
                    {action.label}
                    <ChevronRight className="size-3 ml-auto opacity-40" />
                  </a>
                )
              })}
            </div>
          )}

          {/* ── Tasks ── */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  placeholder="Add task..."
                  className="flex-1 h-8 px-3 text-xs rounded-lg bg-input/30 border border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                />
                <button onClick={addTask} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                  Add
                </button>
              </div>
              <div className="space-y-1">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors group">
                    <button
                      onClick={() => setTasks(p => p.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                      className={cn(
                        'flex items-center justify-center w-4 h-4 rounded border-[1.5px] transition-all shrink-0',
                        t.done ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                      )}
                    >
                      {t.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary-foreground"><polyline points="20 6 9 17 4 12" /></svg>}
                    </button>
                    <span className={cn('text-xs flex-1', t.done ? 'line-through text-muted-foreground/50' : 'text-foreground')}>{t.text}</span>
                    <button onClick={() => setTasks(p => p.filter(x => x.id !== t.id))} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all text-xs">x</button>
                  </div>
                ))}
                {tasks.length === 0 && <p className="text-xs text-muted-foreground/50 text-center py-4">No tasks yet</p>}
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <textarea
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                placeholder="Quick note..."
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-lg bg-input/30 border border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none resize-none"
              />
              <button onClick={addNote} disabled={!noteInput.trim()} className="w-full h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-30">
                Save Note
              </button>
              <div className="space-y-2 pt-2">
                {notes.map(n => (
                  <div key={n.id} className="px-3 py-2 rounded-lg border border-border/50 bg-card/20 group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-primary">{n.date}</span>
                      <button onClick={() => setNotes(p => p.filter(x => x.id !== n.id))} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-[10px] transition-all">remove</button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.text}</p>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-xs text-muted-foreground/50 text-center py-4">No notes yet</p>}
              </div>
            </div>
          )}

          {/* ── Timer ── */}
          {activeTab === 'timer' && (
            <div className="text-center space-y-4">
              <div className={cn(
                'text-4xl font-bold font-mono tracking-wider transition-colors',
                timerRunning ? 'text-primary' : 'text-muted-foreground'
              )} style={timerRunning ? { textShadow: '0 0 20px hsl(var(--primary) / 0.3)' } : {}}>
                {formatTime(timerSeconds)}
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => { if (!timerRunning) setTimerSeconds(timerPreset * 60); setTimerRunning(!timerRunning) }}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
                    timerRunning
                      ? 'bg-destructive/15 border border-destructive/30 text-destructive hover:bg-destructive/25'
                      : 'bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25'
                  )}
                >
                  {timerRunning ? 'Stop' : 'Start'}
                </button>
                {!timerRunning && (
                  <button onClick={() => setTimerSeconds(timerPreset * 60)} className="px-4 py-2 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors">
                    Reset
                  </button>
                )}
              </div>
              {!timerRunning && (
                <div className="flex gap-2 justify-center">
                  {[15, 25, 45, 60].map(m => (
                    <button
                      key={m}
                      onClick={() => { setTimerPreset(m); setTimerSeconds(m * 60) }}
                      className={cn(
                        'px-3 py-1 rounded-md text-[10px] font-semibold transition-all',
                        timerPreset === m
                          ? 'bg-primary/15 border border-primary/30 text-primary'
                          : 'border border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Phone/Dialer ── */}
          {activeTab === 'phone' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <input
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full h-10 px-3 text-center text-lg font-mono rounded-lg bg-input/30 border border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none tracking-wider"
                />
                <div className="grid grid-cols-3 gap-1.5">
                  {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                    <button
                      key={key}
                      onClick={() => setPhoneNumber(p => p + key)}
                      className="h-10 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 text-foreground text-sm font-semibold transition-colors"
                    >
                      {key}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!phoneNumber.trim()) return
                      const updated = [{ number: phoneNumber, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }, ...recentCalls].slice(0, 10)
                      setRecentCalls(updated)
                      localStorage.setItem('0n_recent_calls', JSON.stringify(updated))
                      fetch('/api/crm/phone/call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: phoneNumber }) }).catch(() => {})
                    }}
                    disabled={!phoneNumber.trim()}
                    className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    <Phone className="size-4" /> Call
                  </button>
                  <button
                    onClick={() => setPhoneNumber('')}
                    className="h-10 px-4 rounded-lg border border-border text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {recentCalls.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent</p>
                  {recentCalls.map((call, i) => (
                    <button
                      key={i}
                      onClick={() => setPhoneNumber(call.number)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 text-xs transition-colors"
                    >
                      <span className="font-mono text-foreground">{call.number}</span>
                      <span className="text-muted-foreground">{call.date}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Search ── */}
          {activeTab === 'search' && (
            <div className="space-y-3">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search everything..."
                autoFocus
                className="w-full h-9 px-3 text-sm rounded-lg bg-input/30 border border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
              />
              <div className="space-y-1">
                {[
                  { label: 'Contacts', href: '/dashboard/contacts', icon: '👥' },
                  { label: 'Pipeline', href: '/dashboard/pipeline', icon: '📊' },
                  { label: 'Tasks', href: '/dashboard/tasks', icon: '✓' },
                  { label: 'Email', href: '/dashboard/email', icon: '✉' },
                  { label: 'Social', href: '/dashboard/social', icon: '📱' },
                  { label: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
                  { label: 'Phone', href: '/dashboard/phone', icon: '📞' },
                  { label: 'Calendar', href: '/dashboard/calendar', icon: '📅' },
                ].filter(item => !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                  <a key={item.label} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <span>{item.icon}</span>
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Settings ── */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              <a href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 transition-all text-sm text-muted-foreground hover:text-foreground">
                <Settings className="size-4" /> Account Settings
              </a>
              <a href="/dashboard/settings/analytics" className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 transition-all text-sm text-muted-foreground hover:text-foreground">
                <Zap className="size-4" /> Google Analytics Setup
              </a>
              <a href="/dashboard/security" className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 transition-all text-sm text-muted-foreground hover:text-foreground">
                <Search className="size-4" /> Security Dashboard
              </a>
              <a href="/dashboard/docs" className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 transition-all text-sm text-muted-foreground hover:text-foreground">
                <MessageSquare className="size-4" /> Documentation
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Backdrop ═══ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[7998] bg-black/20 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
