'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { StrikeSettingsDialog, DEFAULT_CONFIG, type StrikeConfig, type StrikeSection } from '@/components/strike-settings-dialog'

interface QuickNote {
  id: string
  text: string
  summary: string
  date: string
  done: boolean
}

interface StrikeTask {
  id: string
  text: string
  done: boolean
  priority: 'low' | 'med' | 'high'
  created: string
}

const STRIKE_CONFIG_KEY = '0n_strike_config'
const STRIKE_TASKS_KEY = '0n_strike_tasks'
const NOTES_KEY = '0n_quick_notes'

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

  // Notes state
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [noteInput, setNoteInput] = useState('')
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Tasks state
  const [tasks, setTasks] = useState<StrikeTask[]>([])
  const [taskInput, setTaskInput] = useState('')
  const [taskPriority, setTaskPriority] = useState<'low' | 'med' | 'high'>('med')

  // Focus timer state
  const [focusTime, setFocusTime] = useState(25 * 60)
  const [focusRunning, setFocusRunning] = useState(false)
  const [focusLeft, setFocusLeft] = useState(25 * 60)
  const focusRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load persisted state
  useEffect(() => {
    try { const s = localStorage.getItem(NOTES_KEY); if (s) setNotes(JSON.parse(s)) } catch {}
    try { const s = localStorage.getItem(STRIKE_TASKS_KEY); if (s) setTasks(JSON.parse(s)) } catch {}
    try { const s = localStorage.getItem(STRIKE_CONFIG_KEY); if (s) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(s) }) } catch {}
  }, [])

  // Focus timer interval
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

  // Note functions
  function saveNote() {
    if (!noteInput.trim()) return
    const note: QuickNote = {
      id: Date.now().toString(),
      text: noteInput.trim(),
      summary: noteInput.length > 80 ? noteInput.slice(0, 77) + '...' : noteInput,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      done: false,
    }
    persistNotes([note, ...notes])
    setNoteInput('')
    setNoteModalOpen(false)
  }

  function toggleNote(id: string) { persistNotes(notes.map(n => n.id === id ? { ...n, done: !n.done } : n)) }
  function removeNote(id: string) { persistNotes(notes.filter(n => n.id !== id)); if (expanded === id) setExpanded(null) }
  function expandNote(n: QuickNote) { setExpanded(n.id); setEditText(n.text) }
  function saveEdit() { if (expanded) { persistNotes(notes.map(n => n.id === expanded ? { ...n, text: editText, summary: editText.length > 80 ? editText.slice(0, 77) + '...' : editText } : n)); setExpanded(null) } }

  // Task functions
  function addTask() {
    if (!taskInput.trim()) return
    const task: StrikeTask = {
      id: Date.now().toString(),
      text: taskInput.trim(),
      done: false,
      priority: taskPriority,
      created: new Date().toISOString(),
    }
    persistTasks([task, ...tasks])
    setTaskInput('')
  }

  function toggleTask(id: string) { persistTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)) }
  function removeTask(id: string) { persistTasks(tasks.filter(t => t.id !== id)) }

  const priorityColor: Record<string, string> = { low: '#6b7280', med: '#f59e0b', high: '#ef4444' }
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // Context-aware quick actions
  function getContextActions(): { label: string; color: string }[] {
    if (pathname.includes('/email')) return [{ label: 'Quick Compose', color: '#00d4ff' }]
    if (pathname.includes('/contacts')) return [{ label: 'Quick Add Contact', color: '#00d4ff' }]
    if (pathname.includes('/social')) return [{ label: 'Quick Post', color: '#00d4ff' }]
    if (pathname.includes('/tasks')) return [{ label: 'Quick Task', color: '#00d4ff' }]
    return [
      { label: 'New Note', color: '#7ed957' },
      { label: 'New Task', color: '#00d4ff' },
    ]
  }

  const contextActions = getContextActions()
  const SIDEBAR_W = 280

  return (
    <>
      {/* Toggle pill */}
      <button
        onClick={() => setIsOpen(p => !p)}
        style={{
          position: 'fixed', bottom: 80, right: isOpen ? SIDEBAR_W + 8 : 12,
          zIndex: 70, background: '#000', border: '1px solid #1e293b',
          borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#7ed957', letterSpacing: '0.06em' }}>STRIKE</span>
        <div style={{
          width: 32, height: 18, borderRadius: 9, position: 'relative',
          background: isOpen ? '#7ed957' : '#1e293b',
          transition: 'background 0.2s',
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: 7,
            background: isOpen ? '#000' : '#4b5563',
            position: 'absolute', top: 2,
            left: isOpen ? 16 : 2,
            transition: 'left 0.2s, background 0.2s',
          }} />
        </div>
      </button>

      {/* Sidebar panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: SIDEBAR_W, zIndex: 60,
        background: 'rgba(0,0,0,0.95)',
        borderLeft: '1px solid #1e293b',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transform: isOpen ? 'translateX(0)' : `translateX(${SIDEBAR_W}px)`,
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px 10px', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: 3,
              background: '#7ed957', boxShadow: '0 0 8px #7ed957',
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f4f8', letterSpacing: '0.04em' }}>Strike Menu</span>
          </div>
          <StrikeSettingsDialog config={config} onConfigChange={persistConfig} />
        </div>

        {/* Context-aware actions */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Quick Actions
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {contextActions.map(a => (
              <button
                key={a.label}
                onClick={() => {
                  if (a.label === 'New Note' || a.label === 'Quick Compose') setNoteModalOpen(true)
                  if (a.label === 'New Task' || a.label === 'Quick Task' || a.label === 'Quick Add Contact') {
                    // Focus the task input
                    const el = document.getElementById('strike-task-input')
                    if (el) el.focus()
                  }
                }}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: `${a.color}10`, border: `1px solid ${a.color}25`,
                  color: a.color, cursor: 'pointer', letterSpacing: '0.02em',
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px' }}>
          {/* Tasks Section */}
          {sections.includes('tasks') && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Tasks ({tasks.filter(t => !t.done).length})
              </div>

              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <input
                  id="strike-task-input"
                  value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTask() }}
                  placeholder="Add task..."
                  style={{
                    flex: 1, padding: '7px 10px', background: '#0a0a0a',
                    border: '1px solid #1e293b', borderRadius: 6,
                    color: '#f0f4f8', fontSize: 12, outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={() => {
                    const next = taskPriority === 'low' ? 'med' : taskPriority === 'med' ? 'high' : 'low'
                    setTaskPriority(next)
                  }}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: '1px solid #1e293b',
                    background: '#0a0a0a', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                  title={`Priority: ${taskPriority}`}
                >
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: priorityColor[taskPriority] }} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {tasks.map(t => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', borderRadius: 6,
                      background: 'transparent',
                      transition: 'background 0.1s',
                      opacity: t.done ? 0.4 : 1,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(126,217,87,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <button
                      onClick={() => toggleTask(t.id)}
                      style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: t.done ? '2px solid #7ed957' : '2px solid #30363d',
                        background: t.done ? '#7ed957' : 'transparent',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t.done && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    <div style={{
                      width: 4, height: 4, borderRadius: 2, flexShrink: 0,
                      background: priorityColor[t.priority],
                    }} />
                    <span style={{
                      flex: 1, fontSize: 12, color: '#d1d5db',
                      textDecoration: t.done ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {t.text}
                    </span>
                    <button
                      onClick={() => removeTask(t.id)}
                      style={{
                        background: 'none', border: 'none', color: '#30363d',
                        cursor: 'pointer', fontSize: 11, padding: '0 2px',
                        opacity: 0, transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                    >
                      x
                    </button>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div style={{ fontSize: 11, color: '#30363d', textAlign: 'center', padding: 12 }}>
                    No tasks yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {sections.includes('notes') && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Notes ({notes.length})
                </div>
                <button
                  onClick={() => setNoteModalOpen(true)}
                  style={{
                    background: 'transparent', border: '1px solid #1e293b',
                    borderRadius: 4, color: '#7ed957', fontSize: 11,
                    padding: '2px 8px', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  + New
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {notes.map(n => (
                  <div
                    key={n.id}
                    onClick={() => expandNote(n)}
                    style={{
                      padding: '8px 10px', borderRadius: 6,
                      background: '#0a0a0a', border: '1px solid #1e293b',
                      cursor: 'pointer', transition: 'border-color 0.15s',
                      opacity: n.done ? 0.4 : 1,
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#7ed957'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 9, color: '#7ed957', fontWeight: 600, letterSpacing: '0.03em' }}>{n.date}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={e => { e.stopPropagation(); toggleNote(n.id) }}
                          style={{ background: 'none', border: 'none', color: n.done ? '#7ed957' : '#30363d', cursor: 'pointer', fontSize: 11, padding: 0 }}
                        >
                          {'\u2713'}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); removeNote(n.id) }}
                          style={{ background: 'none', border: 'none', color: '#30363d', cursor: 'pointer', fontSize: 11, padding: 0 }}
                        >
                          {'\u2715'}
                        </button>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11, color: '#94a3b8', lineHeight: 1.4,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const,
                    }}>
                      {n.summary}
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div style={{ fontSize: 11, color: '#30363d', textAlign: 'center', padding: 12 }}>
                    No notes yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Clock Section */}
          {sections.includes('clock') && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Clock
              </div>
              <div style={{
                textAlign: 'center', padding: '12px 0',
                fontFamily: 'monospace', fontSize: 28, fontWeight: 700,
                color: '#7ed957', letterSpacing: '0.05em',
                textShadow: '0 0 20px rgba(126,217,87,0.3)',
              }}>
                <ClockDisplay />
              </div>
            </div>
          )}

          {/* Focus Timer Section */}
          {sections.includes('focus') && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Focus Timer
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'monospace', fontSize: 36, fontWeight: 700,
                  color: focusRunning ? '#7ed957' : '#4b5563',
                  letterSpacing: '0.05em', marginBottom: 10,
                  textShadow: focusRunning ? '0 0 20px rgba(126,217,87,0.3)' : 'none',
                  transition: 'color 0.3s, text-shadow 0.3s',
                }}>
                  {formatTime(focusLeft)}
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button
                    onClick={() => { if (!focusRunning) { setFocusLeft(focusTime) } setFocusRunning(p => !p) }}
                    style={{
                      padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: focusRunning ? 'rgba(239,68,68,0.15)' : 'rgba(126,217,87,0.1)',
                      border: `1px solid ${focusRunning ? '#ef4444' : '#7ed957'}`,
                      color: focusRunning ? '#ef4444' : '#7ed957',
                      cursor: 'pointer',
                    }}
                  >
                    {focusRunning ? 'Stop' : 'Start'}
                  </button>
                  {!focusRunning && (
                    <button
                      onClick={() => { setFocusLeft(focusTime) }}
                      style={{
                        padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: 'transparent', border: '1px solid #1e293b',
                        color: '#4b5563', cursor: 'pointer',
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                {!focusRunning && (
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
                    {[15, 25, 45, 60].map(m => (
                      <button
                        key={m}
                        onClick={() => { setFocusTime(m * 60); setFocusLeft(m * 60) }}
                        style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                          background: focusTime === m * 60 ? 'rgba(126,217,87,0.1)' : 'transparent',
                          border: `1px solid ${focusTime === m * 60 ? '#7ed957' : '#1e293b'}`,
                          color: focusTime === m * 60 ? '#7ed957' : '#4b5563',
                          cursor: 'pointer',
                        }}
                      >
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
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '8px 12px', borderTop: '1px solid #1e293b',
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', gap: 6,
        }}>
          <button
            onClick={() => setNoteModalOpen(true)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 6,
              background: '#7ed957', border: 'none',
              color: '#000', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.02em',
            }}
          >
            + Quick Note
          </button>
          <button
            onClick={() => {
              const cleared = tasks.filter(t => !t.done)
              persistTasks(cleared)
            }}
            style={{
              padding: '8px 12px', borderRadius: 6,
              background: 'transparent', border: '1px solid #1e293b',
              color: '#4b5563', fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear done
          </button>
        </div>
      </div>

      {/* Note Input Modal */}
      {noteModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setNoteModalOpen(false) }}
        >
          <div style={{
            background: '#000', border: '1px solid #1e293b', borderRadius: 16,
            width: 400, padding: 24, animation: 'strikeGlobalModalIn 0.25s ease',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#7ed957', marginBottom: 12 }}>Quick Note</div>
            <textarea
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder="Paste or type anything..."
              style={{
                width: '100%', minHeight: 120, background: '#0a0a0a',
                border: '1px solid #1e293b', borderRadius: 8, padding: 12,
                color: '#7ed957', fontSize: 13, resize: 'vertical',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) saveNote() }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={async () => { try { const t = await navigator.clipboard.readText(); setNoteInput(t) } catch {} }}
                style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #1e293b', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Paste
              </button>
              <button
                onClick={() => setNoteInput('')}
                style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #1e293b', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Clear
              </button>
              <button
                onClick={saveNote}
                disabled={!noteInput.trim()}
                style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #7ed957', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: noteInput.trim() ? 1 : 0.3 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Note Edit Modal */}
      {expanded && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setExpanded(null) }}
        >
          <div style={{
            background: '#000', border: '1px solid #1e293b', borderRadius: 16,
            width: 440, padding: 24, animation: 'strikeGlobalModalIn 0.25s ease',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#7ed957', marginBottom: 4 }}>Edit Note</div>
            <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 12 }}>{notes.find(n => n.id === expanded)?.date}</div>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              style={{
                width: '100%', minHeight: 160, background: '#0a0a0a',
                border: '1px solid #1e293b', borderRadius: 8, padding: 12,
                color: '#7ed957', fontSize: 13, resize: 'vertical',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => navigator.clipboard.writeText(editText)} style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #1e293b', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Copy</button>
              <button onClick={() => setExpanded(null)} style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #1e293b', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEdit} style={{ flex: 1, padding: '8px 0', background: '#000', border: '1px solid #7ed957', borderRadius: 6, color: '#7ed957', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes strikeGlobalModalIn { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
    </>
  )
}
