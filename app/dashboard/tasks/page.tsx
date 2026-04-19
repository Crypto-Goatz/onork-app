'use client'

import { useState, useEffect, useCallback } from 'react'
import TaskBoard from './components/TaskBoard'
import type { Task as BoardTask } from './components/TaskBoard'
import ChatWindow from './components/ChatWindow'
import FocusMode from './components/FocusMode'
import CommandCenter from './components/CommandCenter'
import ClientManager from './components/ClientManager'
import ProjectCanvas from './components/ProjectCanvas'
import Inbox from './components/Inbox'
import CalendarView from './components/CalendarView'
import AutoPlanModal from './components/AutoPlanModal'
import OptimizationModal from './components/OptimizationModal'
import SocialTrendsModal from './components/SocialTrendsModal'
import type { Client, Project, Email, CalendarEvent } from './types'

type Task = BoardTask

const STORAGE_KEY = '0ncore_tasks'
const CLIENTS_KEY = '0ncore_clients'
const PROJECTS_KEY = '0ncore_projects'
const EMAILS_KEY = '0ncore_emails'
const EVENTS_KEY = '0ncore_events'

type ViewTab = 'dashboard' | 'clients' | 'projects' | 'inbox' | 'calendar' | 'recurring'

interface ChatMessage {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJson(key: string, data: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(data))
}

interface RecurringTask {
  id: string
  title: string
  description?: string
  frequency?: string
  assignedTo?: string
  status?: string
}

function RecurringTasksPanel() {
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', frequency: 'weekly' })

  useEffect(() => {
    loadRecurring()
  }, [])

  async function loadRecurring() {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/recurring-tasks')
      const data = await res.json()
      if (data.tasks && Array.isArray(data.tasks)) {
        setRecurringTasks(data.tasks)
      }
    } catch {}
    setLoading(false)
  }

  async function createTask() {
    if (!form.title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/crm/recurring-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.task) {
        setRecurringTasks(prev => [...prev, data.task])
      }
      setShowCreate(false)
      setForm({ title: '', description: '', frequency: 'weekly' })
    } catch {}
    setCreating(false)
  }

  async function deleteTask(id: string) {
    try {
      await fetch('/api/crm/recurring-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      })
      setRecurringTasks(prev => prev.filter(t => t.id !== id))
    } catch {}
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #1e293b', background: '#0d1117',
    color: '#f0f4f8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setShowCreate(false)}>
          <div style={{
            background: '#161b22', border: '1px solid #1e293b',
            borderRadius: 16, padding: 28, maxWidth: 460, width: '100%',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f4f8', margin: '0 0 20px' }}>New Recurring Task</h2>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Title *</span>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Weekly report" style={inp} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Description</span>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details..." rows={2} style={{ ...inp, resize: 'vertical' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Frequency</span>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} style={inp}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={createTask} disabled={creating || !form.title.trim()} style={{
                flex: 1, padding: 12, background: creating ? '#374151' : '#7ed957',
                color: '#0d1117', fontWeight: 700, fontSize: 14, borderRadius: 10, border: 'none', cursor: creating ? 'wait' : 'pointer',
                opacity: !form.title.trim() ? 0.5 : 1, fontFamily: 'inherit',
              }}>{creating ? 'Creating...' : 'Create'}</button>
              <button onClick={() => setShowCreate(false)} style={{
                padding: '12px 20px', borderRadius: 10, border: '1px solid #1e293b',
                background: 'transparent', color: '#4b5563', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Recurring Tasks</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7ed957', opacity: 0.8 }}>CRM recurring task automation</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          width: 36, height: 36, borderRadius: 8, background: '#7ed957', color: '#0d1117',
          border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>+</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#3d4654' }}>Loading recurring tasks...</div>
      ) : recurringTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#3d4654' }}>
          <p>No recurring tasks. Create one to automate repetitive work.</p>
          <button onClick={() => setShowCreate(true)} style={{
            marginTop: 12, padding: '10px 20px', background: '#7ed957', color: '#0d1117',
            fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
          }}>+ New Recurring Task</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recurringTasks.map(t => (
            <div key={t.id} style={{
              background: '#161b22', border: '1px solid #1e293b', borderRadius: 12,
              padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4f8' }}>{t.title}</div>
                <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                  {t.frequency && <span style={{
                    padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: 'rgba(126,217,87,0.1)', color: '#7ed957', marginRight: 8,
                  }}>{t.frequency}</span>}
                  {t.description && <span>{t.description}</span>}
                </div>
              </div>
              <button onClick={() => deleteTask(t.id)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: 'rgba(248,113,113,0.1)', color: '#f87171',
                border: '1px solid rgba(248,113,113,0.2)', cursor: 'pointer',
              }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [emails, setEmails] = useState<Email[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([
    'Plan my day',
    'What should I focus on?',
    'Create a task for me',
  ])
  const [focusTask, setFocusTask] = useState<Task | null>(null)
  const [mobileTab, setMobileTab] = useState<'board' | 'chat'>('board')
  const [mounted, setMounted] = useState(false)

  // View state
  const [activeView, setActiveView] = useState<ViewTab>('dashboard')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  // Modal state
  const [showAutoPlan, setShowAutoPlan] = useState(false)
  const [showOptimize, setShowOptimize] = useState(false)
  const [showSocial, setShowSocial] = useState(false)
  const [modalProcessing, setModalProcessing] = useState(false)
  const [socialContent, setSocialContent] = useState<string | undefined>()

  // Clock + session timer
  const [currentTime, setCurrentTime] = useState(new Date())
  const [sessionStart] = useState(Date.now())
  const [sessionElapsed, setSessionElapsed] = useState('0:00')

  useEffect(() => {
    const tick = setInterval(() => {
      setCurrentTime(new Date())
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000)
      const h = Math.floor(elapsed / 3600)
      const m = Math.floor((elapsed % 3600) / 60)
      const s = elapsed % 60
      setSessionElapsed(h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(tick)
  }, [sessionStart])

  useEffect(() => {
    setMounted(true)
    setTasks(loadJson(STORAGE_KEY, []))
    setClients(loadJson(CLIENTS_KEY, []))
    setProjects(loadJson(PROJECTS_KEY, []))
    setEmails(loadJson(EMAILS_KEY, []))
    setEvents(loadJson(EVENTS_KEY, []))
  }, [])

  useEffect(() => { if (mounted) saveJson(STORAGE_KEY, tasks) }, [tasks, mounted])
  useEffect(() => { if (mounted) saveJson(CLIENTS_KEY, clients) }, [clients, mounted])
  useEffect(() => { if (mounted) saveJson(PROJECTS_KEY, projects) }, [projects, mounted])
  useEffect(() => { if (mounted) saveJson(EMAILS_KEY, emails) }, [emails, mounted])
  useEffect(() => { if (mounted) saveJson(EVENTS_KEY, events) }, [events, mounted])

  // Task handlers
  const handleAddTask = useCallback((partial: Partial<Task>) => {
    const task: Task = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      title: partial.title || 'Untitled',
      description: partial.description,
      status: partial.status || 'todo',
      priority: partial.priority || 'medium',
      dueDate: partial.dueDate,
      subtasks: partial.subtasks,
    }
    setTasks(prev => [task, ...prev])
  }, [])

  const handleToggleTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const nextStatus: Record<string, Task['status']> = {
        'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo',
      }
      return { ...t, status: nextStatus[t.status] || 'todo' }
    }))
  }, [])

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }, [])

  const handleUpdateTask = useCallback((updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }, [])

  const handleCompleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' as const } : t))
  }, [])

  // Chat
  const handleSendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setIsThinking(true)
    setSuggestedReplies([])

    try {
      const res = await fetch('/api/tasks/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate })),
        }),
      })
      if (!res.ok) throw new Error('AI request failed')
      const data = await res.json()

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'bot',
        text: data.reply || 'Sorry, I could not generate a response.', timestamp: new Date(),
      }])
      if (data.suggestedReplies?.length) setSuggestedReplies(data.suggestedReplies)
      if (data.taskActions?.length) {
        for (const action of data.taskActions) {
          if (action.type === 'create' && action.title) {
            handleAddTask({ title: action.title, priority: action.priority || 'medium', description: action.description, status: 'todo' })
          } else if (action.type === 'complete' && action.taskId) {
            handleCompleteTask(action.taskId)
          } else if (action.type === 'update' && action.taskId) {
            setTasks(prev => prev.map(t =>
              t.id === action.taskId ? { ...t, ...(action.status && { status: action.status }), ...(action.priority && { priority: action.priority }) } : t
            ))
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'bot',
        text: 'Sorry, I ran into an error. Make sure the GROQ_API_KEY is configured.', timestamp: new Date(),
      }])
      setSuggestedReplies(['Try again', 'Create a task manually'])
    } finally {
      setIsThinking(false)
    }
  }, [tasks, handleAddTask, handleCompleteTask])

  // AutoPlan handler
  const handleAutoPlan = async (text: string) => {
    setModalProcessing(true)
    try {
      const res = await fetch('/api/tasks/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, action: 'plan_day', tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority })) }),
      })
      if (!res.ok) throw new Error('Plan failed')
      const data = await res.json()
      if (data.taskActions?.length) {
        for (const action of data.taskActions) {
          if (action.type === 'create' && action.title) {
            handleAddTask({ title: action.title, priority: action.priority || 'medium', description: action.description, status: 'todo' })
          }
        }
      }
      setShowAutoPlan(false)
    } catch {
      alert('Auto-plan failed. Check API config.')
    } finally {
      setModalProcessing(false)
    }
  }

  // Optimization handler
  const handleOptimize = async (image: { data: string; mimeType: string }) => {
    setModalProcessing(true)
    try {
      const res = await fetch('/api/tasks/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Analyze this report screenshot and suggest task optimizations', action: 'optimize', image }),
      })
      if (!res.ok) throw new Error('Optimize failed')
      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: data.reply, timestamp: new Date() }])
      }
      setShowOptimize(false)
    } catch {
      alert('Optimization failed. Check API config.')
    } finally {
      setModalProcessing(false)
    }
  }

  // Social trends handler
  const handleSocialTrends = async (topics: string[]) => {
    if (topics.length === 0) { setSocialContent(undefined); return }
    setModalProcessing(true)
    try {
      const res = await fetch('/api/tasks/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Generate social media posts for topics: ${topics.join(', ')}`, action: 'social_trends', topics }),
      })
      if (!res.ok) throw new Error('Social trends failed')
      const data = await res.json()
      setSocialContent(data.reply || 'No content generated.')
    } catch {
      alert('Social trends failed. Check API config.')
    } finally {
      setModalProcessing(false)
    }
  }

  // Focus mode
  if (focusTask) {
    const currentTask = tasks.find(t => t.id === focusTask.id) || focusTask
    return (
      <FocusMode task={currentTask} onExit={() => setFocusTask(null)} onUpdateTask={handleUpdateTask} onComplete={handleCompleteTask} />
    )
  }

  // Project canvas view
  if (selectedProjectId) {
    const project = projects.find(p => p.id === selectedProjectId)
    if (project) {
      return (
        <ProjectCanvas
          project={project}
          onUpdateProject={updated => setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))}
          onBack={() => setSelectedProjectId(null)}
        />
      )
    }
  }

  if (!mounted) return null

  const todoCount = tasks.filter(t => t.status === 'todo').length
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length

  const VIEW_TABS: { key: ViewTab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'clients', label: 'Clients' },
    { key: 'projects', label: 'Projects' },
    { key: 'inbox', label: 'Inbox' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'recurring', label: 'Recurring' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#f0f4f8' }}>
      {/* Header */}
      <div style={{
        padding: '12px 24px', borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Task Manager</h1>
          <span style={{
            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5,
            padding: '3px 8px', borderRadius: 6, background: 'rgba(126,217,87,0.15)', color: '#7ed957',
          }}>UNLIMITED</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Clock + Session Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 8 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#f0f4f8', letterSpacing: '0.03em', lineHeight: 1 }}>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div style={{ fontSize: 10, color: '#4b5563', lineHeight: 1, marginTop: 2 }}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: '#1e293b' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#7ed957', lineHeight: 1 }}>
                {sessionElapsed}
              </div>
              <div style={{ fontSize: 9, color: '#4b5563', lineHeight: 1, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                session
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: '#1e293b' }} />
          </div>
          {/* Toolbar buttons */}
          <button
            onClick={() => setShowAutoPlan(true)}
            style={{ padding: '5px 10px', background: 'rgba(126,217,87,0.1)', color: '#7ed957', border: '1px solid rgba(126,217,87,0.2)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >AutoPlan</button>
          <button
            onClick={() => setShowOptimize(true)}
            style={{ padding: '5px 10px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >Optimize</button>
          <button
            onClick={() => { setShowSocial(true); setSocialContent(undefined) }}
            style={{ padding: '5px 10px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >Social</button>
          <div style={{ width: 1, height: 20, background: '#1e293b', margin: '0 4px' }} />
          {todoCount > 0 && <span style={{ fontSize: 12, color: '#8b95a5' }}><strong style={{ color: '#f59e0b' }}>{todoCount}</strong> to do</span>}
          {inProgressCount > 0 && <span style={{ fontSize: 12, color: '#8b95a5' }}><strong style={{ color: '#00d4ff' }}>{inProgressCount}</strong> in progress</span>}
          <span style={{ fontSize: 11, color: '#3d4654' }}>
            <kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, border: '1px solid #1e293b', fontSize: 10, fontWeight: 700 }}>Cmd+K</kbd>
          </span>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', padding: '0 24px', flexShrink: 0 }}>
        {VIEW_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            style={{
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, color: activeView === tab.key ? '#7ed957' : '#3d4654',
              borderBottom: activeView === tab.key ? '2px solid #7ed957' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Mobile Tab Switcher (dashboard only) */}
      {activeView === 'dashboard' && (
        <div style={{ display: 'none', borderBottom: '1px solid #1e293b', padding: '0 16px' }} className="mobile-tabs">
          {(['board', 'chat'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              style={{
                flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 1,
                background: 'none', border: 'none', cursor: 'pointer',
                color: mobileTab === tab ? '#7ed957' : '#3d4654',
                borderBottom: mobileTab === tab ? '2px solid #7ed957' : '2px solid transparent',
              }}
            >{tab === 'board' ? 'Tasks' : 'AI Chat'}</button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {activeView === 'dashboard' && (
          <>
            {/* Task Board */}
            <div style={{ flex: 1, overflow: 'hidden', borderRight: '1px solid #1e293b' }} className="task-board-panel">
              <TaskBoard
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onStartFocus={setFocusTask}
              />
            </div>
            {/* Chat Sidebar */}
            <div style={{ width: 380, flexShrink: 0, overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }} className="chat-panel">
              <ChatWindow
                messages={messages}
                onSendMessage={handleSendMessage}
                isThinking={isThinking}
                suggestedReplies={suggestedReplies}
              />
            </div>
          </>
        )}

        {activeView === 'clients' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ClientManager
              clients={clients}
              projects={projects}
              tasks={tasks}
              onAddClient={c => setClients(prev => [...prev, c])}
              onUpdateClient={c => setClients(prev => prev.map(x => x.id === c.id ? c : x))}
              onDeleteClient={id => setClients(prev => prev.filter(x => x.id !== id))}
              onAddProject={p => setProjects(prev => [...prev, p])}
            />
          </div>
        )}

        {activeView === 'projects' && (
          <div style={{ flex: 1, overflow: 'auto', background: '#0d1117', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Projects</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7ed957', opacity: 0.8 }}>Visual node-based project planning.</p>
              </div>
              <button
                onClick={() => {
                  const title = prompt('Project title:')
                  if (!title?.trim()) return
                  const p: Project = {
                    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
                    title: title.trim(), status: 'planning', canvasNodes: [], canvasLinks: [],
                  }
                  setProjects(prev => [...prev, p])
                }}
                style={{ width: 36, height: 36, borderRadius: 8, background: '#7ed957', color: '#0d1117', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >+</button>
            </div>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#3d4654' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{'\uD83D\uDCCB'}</div>
                <p>No projects yet. Create one to start planning.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {projects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    style={{
                      background: '#161b22', border: '1px solid #1e293b', borderRadius: 12, padding: 18, cursor: 'pointer',
                      transition: 'border-color 0.2s, transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#7ed957'; e.currentTarget.style.transform = 'scale(1.02)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>{p.title}</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 6, background: p.status === 'active' ? 'rgba(126,217,87,0.15)' : 'rgba(139,149,165,0.15)', color: p.status === 'active' ? '#7ed957' : '#8b95a5' }}>{p.status}</span>
                      <span style={{ fontSize: 11, color: '#3d4654' }}>{p.canvasNodes.length} nodes</span>
                    </div>
                    {p.description && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#8b95a5' }}>{p.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'inbox' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Inbox
              emails={emails}
              onRefresh={() => {/* CRM conversations API will be wired later */}}
              onMarkRead={id => setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e))}
              onMarkUnread={id => setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: false } : e))}
            />
          </div>
        )}

        {activeView === 'calendar' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CalendarView
              events={events}
              onAddEvent={ev => setEvents(prev => [...prev, ev])}
              onDeleteEvent={id => setEvents(prev => prev.filter(e => e.id !== id))}
            />
          </div>
        )}

        {activeView === 'recurring' && (
          <RecurringTasksPanel />
        )}
      </div>

      {/* Command Center (Cmd+K) */}
      <CommandCenter
        tasks={tasks}
        onCreateTask={() => handleAddTask({ title: 'New Task', priority: 'medium', status: 'todo' })}
        onFocusTask={setFocusTask}
        onSendChat={handleSendMessage}
      />

      {/* Modals */}
      <AutoPlanModal isOpen={showAutoPlan} onClose={() => setShowAutoPlan(false)} onSubmit={handleAutoPlan} isProcessing={modalProcessing} />
      <OptimizationModal isOpen={showOptimize} onClose={() => setShowOptimize(false)} onSubmit={handleOptimize} isProcessing={modalProcessing} />
      <SocialTrendsModal isOpen={showSocial} onClose={() => setShowSocial(false)} onSubmit={handleSocialTrends} isProcessing={modalProcessing} generatedContent={socialContent} />

      {/* Responsive styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @media (max-width: 768px) {
          .mobile-tabs { display: flex !important; }
          .task-board-panel { display: ${mobileTab === 'board' ? 'block' : 'none'} !important; border-right: none !important; }
          .chat-panel { display: ${mobileTab === 'chat' ? 'block' : 'none'} !important; width: 100% !important; }
        }
      `}</style>
    </div>
  )
}
