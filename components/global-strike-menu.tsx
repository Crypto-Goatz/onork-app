'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { X, Check, Plus, Clock, StickyNote, ListTodo, Trash2 } from 'lucide-react'
import { StrikeSettingsDialog, DEFAULT_CONFIG, type StrikeConfig, type StrikeSection } from '@/components/strike-settings-dialog'
import { cn } from '@/lib/utils'

interface QuickNote { id: string; text: string; summary: string; date: string; done: boolean }
interface StrikeTask { id: string; text: string; done: boolean; priority: 'low' | 'med' | 'high'; created: string }

const STRIKE_CONFIG_KEY = '0n_strike_config'
const STRIKE_TASKS_KEY = '0n_strike_tasks'
const NOTES_KEY = '0n_quick_notes'

const PRIORITY_DOT: Record<string, string> = { low: 'bg-core-text-muted', med: 'bg-core-amber', high: 'bg-core-red' }
const PRIORITY_NEXT: Record<string, 'low' | 'med' | 'high'> = { low: 'med', med: 'high', high: 'low' }

function ClockDisplay() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [])
  return <>{time}</>
}

export function GlobalStrikeMenu() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<StrikeConfig>(DEFAULT_CONFIG)
  const sections = config.sections

  const [notes, setNotes] = useState<QuickNote[]>([])
  const [noteInput, setNoteInput] = useState('')
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const [tasks, setTasks] = useState<StrikeTask[]>([])
  const [taskInput, setTaskInput] = useState('')
  const [taskPriority, setTaskPriority] = useState<'low' | 'med' | 'high'>('med')

  const [focusTime, setFocusTime] = useState(25 * 60)
  const [focusRunning, setFocusRunning] = useState(false)
  const [focusLeft, setFocusLeft] = useState(25 * 60)
  const focusRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    try { const s = localStorage.getItem(NOTES_KEY); if (s) setNotes(JSON.parse(s)) } catch {}
    try { const s = localStorage.getItem(STRIKE_TASKS_KEY); if (s) setTasks(JSON.parse(s)) } catch {}
    try { const s = localStorage.getItem(STRIKE_CONFIG_KEY); if (s) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(s) }) } catch {}
  }, [])

  useEffect(() => {
    if (focusRunning && focusLeft > 0) {
      focusRef.current = setInterval(() => setFocusLeft(p => {
        if (p <= 1) { setFocusRunning(false); return 0 }
        return p - 1
      }), 1000)
    }
    return () => { if (focusRef.current) clearInterval(focusRef.current) }
  }, [focusRunning, focusLeft])

  function persistNotes(n: QuickNote[]) { setNotes(n); localStorage.setItem(NOTES_KEY, JSON.stringify(n)) }
  function persistTasks(t: StrikeTask[]) { setTasks(t); localStorage.setItem(STRIKE_TASKS_KEY, JSON.stringify(t)) }
  function persistConfig(c: StrikeConfig) { setConfig(c); localStorage.setItem(STRIKE_CONFIG_KEY, JSON.stringify(c)) }

  function saveNote() {
    if (!noteInput.trim()) return
    persistNotes([{ id: Date.now().toString(), text: noteInput.trim(), summary: noteInput.length > 80 ? noteInput.slice(0, 77) + '...' : noteInput, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), done: false }, ...notes])
    setNoteInput('')
    setNoteModalOpen(false)
  }
  function toggleNote(id: string) { persistNotes(notes.map(n => n.id === id ? { ...n, done: !n.done } : n)) }
  function removeNote(id: string) { persistNotes(notes.filter(n => n.id !== id)); if (expanded === id) setExpanded(null) }
  function expandNote(n: QuickNote) { setExpanded(n.id); setEditText(n.text) }
  function saveEdit() { if (expanded) { persistNotes(notes.map(n => n.id === expanded ? { ...n, text: editText, summary: editText.length > 80 ? editText.slice(0, 77) + '...' : editText } : n)); setExpanded(null) } }

  function addTask() {
    if (!taskInput.trim()) return
    persistTasks([{ id: Date.now().toString(), text: taskInput.trim(), done: false, priority: taskPriority, created: new Date().toISOString() }, ...tasks])
    setTaskInput('')
  }
  function toggleTask(id: string) { persistTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)) }
  function removeTask(id: string) { persistTasks(tasks.filter(t => t.id !== id)) }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  function getContextActions(): { label: string; action: () => void }[] {
    return [
      { label: 'New Note', action: () => setNoteModalOpen(true) },
      { label: 'New Task', action: () => document.getElementById('strike-task-input')?.focus() },
    ]
  }

  if (!pathname?.startsWith('/dashboard')) return null

  const SIDEBAR_W = 280

  return (
    <>
      {/* Toggle pill */}
      <button
        onClick={() => setIsOpen(p => !p)}
        className={cn(
          'fixed bottom-20 z-[70] bg-black border border-core-border rounded-lg px-3 py-1.5 cursor-pointer flex items-center gap-2 transition-all duration-300',
          isOpen ? `right-[${SIDEBAR_W + 8}px]` : 'right-3'
        )}
        style={{ right: isOpen ? SIDEBAR_W + 8 : 12 }}
      >
        <span className="text-[11px] font-bold text-core-green tracking-widest">STRIKE</span>
        <div className={cn('w-8 h-[18px] rounded-[9px] relative transition-colors duration-200', isOpen ? 'bg-core-green' : 'bg-core-border')}>
          <div className={cn('w-3.5 h-3.5 rounded-full absolute top-0.5 transition-all duration-200', isOpen ? 'left-4 bg-black' : 'left-0.5 bg-core-text-muted')} />
        </div>
      </button>

      {/* Sidebar panel */}
      <div className={cn(
        'fixed top-0 right-0 bottom-0 z-[60] bg-black/95 border-l border-core-border backdrop-blur-xl flex flex-col overflow-hidden transition-transform duration-300 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )} style={{ width: SIDEBAR_W }}>

        {/* Header */}
        <div className="px-4 pt-3.5 pb-2.5 border-b border-core-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-core-green shadow-[0_0_8px_theme(colors.core-green)]" />
            <span className="text-[13px] font-bold text-core-text tracking-wide">Strike Menu</span>
          </div>
          <StrikeSettingsDialog config={config} onConfigChange={persistConfig} />
        </div>

        {/* Context actions */}
        <div className="px-3 py-2.5 border-b border-core-border">
          <div className="text-[9px] font-bold text-core-text-muted tracking-widest uppercase mb-1.5">Quick Actions</div>
          <div className="flex gap-1">
            {getContextActions().map(a => (
              <button key={a.label} onClick={a.action}
                className="flex-1 py-1.5 rounded-md text-[10px] font-bold bg-core-green/10 border border-core-green/20 text-core-green cursor-pointer tracking-wide hover:bg-core-green/15 transition-colors">
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 pb-20">

          {/* Tasks */}
          {sections.includes('tasks') && (
            <div className="mb-5">
              <div className="text-[9px] font-bold text-core-text-muted tracking-widest uppercase mb-2">
                Tasks ({tasks.filter(t => !t.done).length})
              </div>
              <div className="flex gap-1 mb-2">
                <input id="strike-task-input" value={taskInput} onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTask() }}
                  placeholder="Add task..."
                  className="flex-1 px-2.5 py-1.5 bg-black border border-core-border rounded-md text-core-text text-xs placeholder:text-core-text-muted focus:border-core-green/40 focus:outline-none" />
                <button onClick={() => setTaskPriority(PRIORITY_NEXT[taskPriority])}
                  className="w-7 h-7 rounded-md border border-core-border bg-black flex items-center justify-center cursor-pointer" title={`Priority: ${taskPriority}`}>
                  <div className={cn('w-2 h-2 rounded-full', PRIORITY_DOT[taskPriority])} />
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                {tasks.map(t => (
                  <div key={t.id} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-core-green/[0.04] transition-colors group', t.done && 'opacity-40')}>
                    <button onClick={() => toggleTask(t.id)}
                      className={cn('w-4 h-4 rounded shrink-0 border-[1.5px] flex items-center justify-center transition-all cursor-pointer',
                        t.done ? 'border-core-green bg-core-green' : 'border-core-text-muted/40 bg-transparent')}>
                      {t.done && <Check className="w-2.5 h-2.5 text-black" />}
                    </button>
                    <div className={cn('w-1 h-1 rounded-full shrink-0', PRIORITY_DOT[t.priority])} />
                    <span className={cn('flex-1 text-xs truncate', t.done ? 'line-through text-core-text-muted/50' : 'text-core-text-dim')}>{t.text}</span>
                    <button onClick={() => removeTask(t.id)} className="opacity-0 group-hover:opacity-100 text-core-text-muted hover:text-core-red transition-all cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {tasks.length === 0 && <p className="text-[11px] text-core-border text-center py-3">No tasks yet</p>}
              </div>
            </div>
          )}

          {/* Notes */}
          {sections.includes('notes') && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] font-bold text-core-text-muted tracking-widest uppercase">Notes ({notes.length})</div>
                <button onClick={() => setNoteModalOpen(true)}
                  className="bg-transparent border border-core-border rounded px-2 py-0.5 text-core-green text-[11px] font-semibold cursor-pointer hover:border-core-green/30 transition-colors">
                  <Plus className="w-3 h-3 inline -mt-0.5" /> New
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {notes.map(n => (
                  <div key={n.id} onClick={() => expandNote(n)}
                    className={cn('px-2.5 py-2 rounded-md bg-black border border-core-border cursor-pointer hover:border-core-green/40 transition-colors', n.done && 'opacity-40')}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] text-core-green font-semibold">{n.date}</span>
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); toggleNote(n.id) }} className={cn('text-[11px] cursor-pointer', n.done ? 'text-core-green' : 'text-core-border')}>
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); removeNote(n.id) }} className="text-core-border hover:text-core-red cursor-pointer transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-core-text-dim leading-snug line-clamp-3">{n.summary}</p>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-[11px] text-core-border text-center py-3">No notes yet</p>}
              </div>
            </div>
          )}

          {/* Clock */}
          {sections.includes('clock') && (
            <div className="mb-5">
              <div className="text-[9px] font-bold text-core-text-muted tracking-widest uppercase mb-2">Clock</div>
              <div className="text-center py-3 font-mono text-[28px] font-bold text-core-green tracking-wider">
                <ClockDisplay />
              </div>
            </div>
          )}

          {/* Focus Timer */}
          {sections.includes('focus') && (
            <div className="mb-5">
              <div className="text-[9px] font-bold text-core-text-muted tracking-widest uppercase mb-2">Focus Timer</div>
              <div className="text-center">
                <div className={cn('font-mono text-4xl font-bold tracking-wider mb-2.5 transition-colors', focusRunning ? 'text-core-green' : 'text-core-text-muted')}>
                  {formatTime(focusLeft)}
                </div>
                <div className="flex gap-1.5 justify-center">
                  <button onClick={() => { if (!focusRunning) setFocusLeft(focusTime); setFocusRunning(p => !p) }}
                    className={cn('px-3.5 py-1.5 rounded-md text-[11px] font-bold border cursor-pointer transition-colors',
                      focusRunning ? 'border-core-red/30 text-core-red hover:bg-core-red/10' : 'border-core-green/30 text-core-green hover:bg-core-green/10')}>
                    {focusRunning ? 'Stop' : 'Start'}
                  </button>
                  {!focusRunning && (
                    <button onClick={() => setFocusLeft(focusTime)}
                      className="px-3.5 py-1.5 rounded-md text-[11px] font-semibold border border-core-border text-core-text-muted cursor-pointer hover:text-core-text transition-colors">
                      Reset
                    </button>
                  )}
                </div>
                {!focusRunning && (
                  <div className="flex gap-1 justify-center mt-2">
                    {[15, 25, 45, 60].map(m => (
                      <button key={m} onClick={() => { setFocusTime(m * 60); setFocusLeft(m * 60) }}
                        className={cn('px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer transition-all',
                          focusTime === m * 60 ? 'border-core-green/30 text-core-green bg-core-green/10' : 'border-core-border text-core-text-muted hover:text-core-text')}>
                        {m}m
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 border-t border-core-border bg-black/90 backdrop-blur-sm flex gap-1.5">
          <button onClick={() => setNoteModalOpen(true)}
            className="flex-1 py-2 rounded-md bg-core-green border-none text-black text-[11px] font-bold cursor-pointer hover:brightness-110 transition-all">
            + Quick Note
          </button>
          <button onClick={() => persistTasks(tasks.filter(t => !t.done))}
            className="px-3 py-2 rounded-md bg-transparent border border-core-border text-core-text-muted text-[11px] font-semibold cursor-pointer hover:text-core-text transition-colors">
            Clear done
          </button>
        </div>
      </div>

      {/* Note Modal */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-lg flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) setNoteModalOpen(false) }}>
          <div className="bg-black border border-core-border rounded-2xl w-[400px] p-6 animate-fade-in">
            <div className="text-sm font-bold text-core-green mb-3">Quick Note</div>
            <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Paste or type anything..."
              className="w-full min-h-[120px] bg-core-bg border border-core-border rounded-lg p-3 text-core-green text-[13px] resize-y outline-none focus:border-core-green/40 transition-colors"
              autoFocus onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) saveNote() }} />
            <div className="flex gap-2 mt-3">
              <button onClick={async () => { try { setNoteInput(await navigator.clipboard.readText()) } catch {} }}
                className="flex-1 py-2 bg-black border border-core-border rounded-md text-core-green text-xs font-semibold cursor-pointer hover:border-core-green/30 transition-colors">Paste</button>
              <button onClick={() => setNoteInput('')}
                className="flex-1 py-2 bg-black border border-core-border rounded-md text-core-green text-xs font-semibold cursor-pointer hover:border-core-green/30 transition-colors">Clear</button>
              <button onClick={saveNote} disabled={!noteInput.trim()}
                className="flex-1 py-2 bg-black border border-core-green rounded-md text-core-green text-xs font-bold cursor-pointer disabled:opacity-30 hover:bg-core-green/10 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {expanded && (
        <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-lg flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) setExpanded(null) }}>
          <div className="bg-black border border-core-border rounded-2xl w-[440px] p-6 animate-fade-in">
            <div className="text-sm font-bold text-core-green mb-1">Edit Note</div>
            <div className="text-[10px] text-core-text-muted mb-3">{notes.find(n => n.id === expanded)?.date}</div>
            <textarea value={editText} onChange={e => setEditText(e.target.value)}
              className="w-full min-h-[160px] bg-core-bg border border-core-border rounded-lg p-3 text-core-green text-[13px] resize-y outline-none focus:border-core-green/40 transition-colors" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => navigator.clipboard.writeText(editText)}
                className="flex-1 py-2 bg-black border border-core-border rounded-md text-core-green text-xs font-semibold cursor-pointer hover:border-core-green/30 transition-colors">Copy</button>
              <button onClick={() => setExpanded(null)}
                className="flex-1 py-2 bg-black border border-core-border rounded-md text-core-green text-xs font-semibold cursor-pointer hover:border-core-green/30 transition-colors">Cancel</button>
              <button onClick={saveEdit}
                className="flex-1 py-2 bg-black border border-core-green rounded-md text-core-green text-xs font-bold cursor-pointer hover:bg-core-green/10 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
