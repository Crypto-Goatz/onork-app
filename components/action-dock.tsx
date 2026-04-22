'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Zap, MessageSquare, ListTodo, Clock, Bookmark,
  Settings, X, Plus, Search, Phone,
  Mail, Users, BarChart3, FileText, Calendar, Mic,
  Shield, Bot, Layers
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

interface QuickTask { id: string; text: string; done: boolean }
interface QuickNote { id: string; text: string; date: string }

const TASKS_KEY = '0n_dock_tasks'
const NOTES_KEY = '0n_dock_notes'

const ACTION_GROUPS = [
  {
    label: 'Create',
    items: [
      { label: 'New Contact', href: '/dashboard/contacts?action=new', icon: Users, colorClass: 'text-core-cyan' },
      { label: 'New Task', href: '/dashboard/tasks', icon: ListTodo, colorClass: 'text-core-green' },
      { label: 'New Deal', href: '/dashboard/pipeline', icon: Layers, colorClass: 'text-core-purple' },
      { label: 'New Event', href: '/dashboard/calendar', icon: Calendar, colorClass: 'text-core-amber' },
    ],
  },
  {
    label: 'Communicate',
    items: [
      { label: 'Send Email', href: '/dashboard/email/builder', icon: Mail, colorClass: 'text-core-cyan' },
      { label: 'Phone Call', href: '/dashboard/phone', icon: Phone, colorClass: 'text-core-green' },
      { label: 'Chat with Jaxx', href: '/dashboard/chat', icon: MessageSquare, colorClass: 'text-core-purple' },
      { label: 'Voice AI', href: '/dashboard/voice', icon: Mic, colorClass: 'text-core-amber' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, colorClass: 'text-core-cyan' },
      { label: 'HIPAA Scan', href: '/dashboard/hipaa', icon: Shield, colorClass: 'text-core-red' },
      { label: 'Workflows', href: '/dashboard/workflows', icon: Zap, colorClass: 'text-core-green' },
      { label: 'Agent Studio', href: '/dashboard/ai', icon: Bot, colorClass: 'text-core-purple' },
    ],
  },
]

export function ActionDock() {
  const pathname = usePathname()
  const router = useRouter()
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

  useEffect(() => {
    try { const s = localStorage.getItem(TASKS_KEY); if (s) setTasks(JSON.parse(s)) } catch {}
    try { const s = localStorage.getItem(NOTES_KEY); if (s) setNotes(JSON.parse(s)) } catch {}
  }, [])
  useEffect(() => { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)) }, [notes])

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return
    const t = setInterval(() => setTimerSeconds(p => p <= 1 ? (setTimerRunning(false), 0) : p - 1), 1000)
    return () => clearInterval(t)
  }, [timerRunning, timerSeconds])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  function handleTabClick(tab: DockTab) {
    if (isOpen && activeTab === tab) setIsOpen(false)
    else { setActiveTab(tab); setIsOpen(true) }
  }

  if (!pathname?.startsWith('/dashboard')) return null

  return (
    <>
      {/* ═══ Tab Strip ═══ */}
      <div className={cn(
        'fixed z-[8000] flex flex-col gap-0.5 transition-all duration-300 ease-out top-1/2 -translate-y-1/2',
        isOpen ? 'right-[360px]' : 'right-0'
      )}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = isOpen && activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => handleTabClick(tab.key)}
              className={cn(
                'group relative flex items-center justify-center w-9 h-9 rounded-l-lg transition-all duration-200',
                isActive
                  ? 'bg-core-card border border-r-0 border-core-green/30 text-core-green'
                  : 'bg-core-bg border border-r-0 border-core-border text-core-text-muted hover:text-core-text hover:border-core-green/20'
              )}
            >
              <Icon className="size-[14px]" />
              {!isOpen && (
                <span className="absolute right-full mr-2 px-2 py-1 text-[10px] font-medium rounded-md bg-core-card border border-core-border text-core-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                  {tab.label}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ═══ Panel ═══ */}
      <div className={cn(
        'fixed top-0 right-0 bottom-0 z-[7999] w-[360px] border-l border-core-border transition-transform duration-300 ease-out flex flex-col bg-core-card',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-core-border shrink-0">
          <span className="text-xs font-semibold text-core-text tracking-wide uppercase">
            {TABS.find(t => t.key === activeTab)?.label}
          </span>
          <button onClick={() => setIsOpen(false)} className="flex items-center justify-center w-6 h-6 rounded-md text-core-text-muted hover:text-core-text hover:bg-core-card-hover transition-colors">
            <X className="size-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Quick Actions ── */}
          {activeTab === 'actions' && (
            <div className="p-3 space-y-4">
              {ACTION_GROUPS.map(group => (
                <div key={group.label}>
                  <div className="px-1 mb-2 text-[10px] font-bold text-core-text-muted uppercase tracking-widest">{group.label}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.items.map(action => {
                      const Icon = action.icon
                      return (
                        <button key={action.label} onClick={() => { router.push(action.href); setIsOpen(false) }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-core-border bg-core-bg hover:bg-core-card-hover hover:border-core-green/20 transition-all text-left group"
                        >
                          <Icon className={cn('size-3.5 shrink-0', action.colorClass)} />
                          <span className="text-[12px] font-medium text-core-text-dim group-hover:text-core-text transition-colors">{action.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Tasks ── */}
          {activeTab === 'tasks' && (
            <div className="p-3 space-y-3">
              <div className="flex gap-2">
                <input value={taskInput} onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && taskInput.trim()) { setTasks(p => [{ id: Date.now().toString(), text: taskInput.trim(), done: false }, ...p]); setTaskInput('') } }}
                  placeholder="Add task..." className="flex-1 h-8 px-3 text-xs rounded-lg bg-core-bg border border-core-border text-core-text placeholder:text-core-text-muted focus:border-core-green/40 focus:outline-none" />
                <button onClick={() => { if (taskInput.trim()) { setTasks(p => [{ id: Date.now().toString(), text: taskInput.trim(), done: false }, ...p]); setTaskInput('') } }}
                  className="h-8 px-3 rounded-lg bg-core-green text-core-bg text-xs font-semibold hover:bg-core-green/90 transition-colors">Add</button>
              </div>
              <div className="space-y-0.5">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-core-card-hover/30 transition-colors group">
                    <button onClick={() => setTasks(p => p.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                      className={cn('flex items-center justify-center w-4 h-4 rounded border-[1.5px] transition-all shrink-0',
                        t.done ? 'bg-core-green border-core-green' : 'border-core-text-muted/40'
                      )}>
                      {t.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-core-bg"><polyline points="20 6 9 17 4 12" /></svg>}
                    </button>
                    <span className={cn('text-xs flex-1', t.done ? 'line-through text-core-text-muted/50' : 'text-core-text')}>{t.text}</span>
                    <button onClick={() => setTasks(p => p.filter(x => x.id !== t.id))} className="opacity-0 group-hover:opacity-100 text-core-text-muted hover:text-core-red transition-all">
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                {tasks.length === 0 && <p className="text-xs text-core-text-muted/50 text-center py-6">No tasks yet</p>}
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          {activeTab === 'notes' && (
            <div className="p-3 space-y-3">
              <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Quick note..." rows={3}
                className="w-full px-3 py-2 text-xs rounded-lg bg-core-bg border border-core-border text-core-text placeholder:text-core-text-muted focus:border-core-green/40 focus:outline-none resize-none" />
              <button onClick={() => { if (noteInput.trim()) { setNotes(p => [{ id: Date.now().toString(), text: noteInput.trim(), date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }, ...p]); setNoteInput('') } }}
                disabled={!noteInput.trim()} className="w-full h-8 rounded-lg bg-core-green text-core-bg text-xs font-semibold hover:bg-core-green/90 transition-colors disabled:opacity-30">Save Note</button>
              <div className="space-y-2 pt-1">
                {notes.map(n => (
                  <div key={n.id} className="px-3 py-2 rounded-lg border border-core-border bg-core-bg group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-core-green">{n.date}</span>
                      <button onClick={() => setNotes(p => p.filter(x => x.id !== n.id))} className="opacity-0 group-hover:opacity-100 text-core-text-muted hover:text-core-red transition-all">
                        <X className="size-3" />
                      </button>
                    </div>
                    <p className="text-xs text-core-text-dim leading-relaxed">{n.text}</p>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-xs text-core-text-muted/50 text-center py-6">No notes yet</p>}
              </div>
            </div>
          )}

          {/* ── Timer ── */}
          {activeTab === 'timer' && (
            <div className="p-3 text-center space-y-4 pt-8">
              <div className={cn('text-4xl font-bold font-mono tracking-wider transition-colors', timerRunning ? 'text-core-green' : 'text-core-text-muted')}>
                {formatTime(timerSeconds)}
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => { if (!timerRunning) setTimerSeconds(timerPreset * 60); setTimerRunning(!timerRunning) }}
                  className={cn('px-4 py-2 rounded-lg text-xs font-semibold transition-colors border',
                    timerRunning ? 'border-core-red/30 text-core-red hover:bg-core-red/10' : 'border-core-green/30 text-core-green hover:bg-core-green/10'
                  )}>{timerRunning ? 'Stop' : 'Start'}</button>
                {!timerRunning && <button onClick={() => setTimerSeconds(timerPreset * 60)} className="px-4 py-2 rounded-lg text-xs font-medium border border-core-border text-core-text-muted hover:text-core-text">Reset</button>}
              </div>
              {!timerRunning && (
                <div className="flex gap-2 justify-center">
                  {[15, 25, 45, 60].map(m => (
                    <button key={m} onClick={() => { setTimerPreset(m); setTimerSeconds(m * 60) }}
                      className={cn('px-3 py-1 rounded-md text-[10px] font-semibold transition-all border',
                        timerPreset === m ? 'border-core-green/30 text-core-green bg-core-green/10' : 'border-core-border text-core-text-muted hover:text-core-text'
                      )}>{m}m</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Phone ── */}
          {activeTab === 'phone' && (
            <div className="p-3 space-y-3">
              <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+1 (555) 123-4567"
                className="w-full h-10 px-3 text-center text-lg font-mono rounded-lg bg-core-bg border border-core-border text-core-text placeholder:text-core-text-muted focus:border-core-green/40 focus:outline-none tracking-wider" />
              <div className="grid grid-cols-3 gap-1.5">
                {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                  <button key={key} onClick={() => setPhoneNumber(p => p + key)}
                    className="h-10 rounded-lg border border-core-border bg-core-bg hover:bg-core-card-hover text-core-text text-sm font-semibold transition-colors">{key}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button disabled={!phoneNumber.trim()} className="flex-1 h-10 rounded-lg bg-core-green text-core-bg font-semibold text-sm hover:bg-core-green/90 transition-colors disabled:opacity-30 flex items-center justify-center gap-2">
                  <Phone className="size-4" /> Call
                </button>
                <button onClick={() => setPhoneNumber('')} className="h-10 px-4 rounded-lg border border-core-border text-core-text-muted hover:text-core-text text-sm transition-colors">Clear</button>
              </div>
            </div>
          )}

          {/* ── Search ── */}
          {activeTab === 'search' && (
            <div className="p-3 space-y-2">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search everything..." autoFocus
                className="w-full h-9 px-3 text-sm rounded-lg bg-core-bg border border-core-border text-core-text placeholder:text-core-text-muted focus:border-core-green/40 focus:outline-none" />
              {[
                { label: 'Contacts', href: '/dashboard/contacts', icon: Users },
                { label: 'Pipeline', href: '/dashboard/pipeline', icon: BarChart3 },
                { label: 'Tasks', href: '/dashboard/tasks', icon: ListTodo },
                { label: 'Email', href: '/dashboard/email', icon: Mail },
                { label: 'Social', href: '/dashboard/social', icon: MessageSquare },
                { label: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
                { label: 'Files', href: '/dashboard/files', icon: FileText },
              ].filter(item => !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase())).map(item => {
                const Icon = item.icon
                return (
                  <button key={item.label} onClick={() => { router.push(item.href); setIsOpen(false) }}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-core-card-hover text-sm text-core-text-muted hover:text-core-text transition-colors text-left">
                    <Icon className="size-3.5" /> {item.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Settings ── */}
          {activeTab === 'settings' && (
            <div className="p-3 space-y-1.5">
              {[
                { label: 'Account Settings', href: '/dashboard/settings', icon: Settings },
                { label: 'Analytics Setup', href: '/dashboard/settings/analytics', icon: BarChart3 },
                { label: 'Security', href: '/dashboard/security', icon: Shield },
                { label: 'Integrations', href: '/dashboard/integrations', icon: Zap },
                { label: 'Documentation', href: '/dashboard/docs', icon: FileText },
              ].map(item => {
                const Icon = item.icon
                return (
                  <button key={item.label} onClick={() => { router.push(item.href); setIsOpen(false) }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg hover:bg-core-card-hover hover:border-core-green/20 transition-all text-sm text-core-text-muted hover:text-core-text text-left">
                    <Icon className="size-3.5" /> {item.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-[7998] bg-black/20" onClick={() => setIsOpen(false)} />}
    </>
  )
}
