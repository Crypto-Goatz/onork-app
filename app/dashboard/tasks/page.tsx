'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
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

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-core-border bg-core-bg text-core-text text-sm outline-none box-border font-sans'

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-core-surface border border-core-border rounded-2xl p-7 max-w-[460px] w-full"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-core-text mb-5">New Recurring Task</h2>
            <label className="block mb-3">
              <span className="block text-[11px] text-core-text-muted font-semibold mb-1 uppercase tracking-wider">Title *</span>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Weekly report"
                className={inputClass}
              />
            </label>
            <label className="block mb-3">
              <span className="block text-[11px] text-core-text-muted font-semibold mb-1 uppercase tracking-wider">Description</span>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional details..."
                rows={2}
                className={`${inputClass} resize-y`}
              />
            </label>
            <label className="block mb-5">
              <span className="block text-[11px] text-core-text-muted font-semibold mb-1 uppercase tracking-wider">Frequency</span>
              <select
                value={form.frequency}
                onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                className={inputClass}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </label>
            <div className="flex gap-2.5">
              <button
                onClick={createTask}
                disabled={creating || !form.title.trim()}
                className="flex-1 py-3 bg-core-green text-core-bg font-bold text-sm rounded-xl border-none cursor-pointer disabled:opacity-50 disabled:cursor-wait font-sans"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-3 rounded-xl border border-core-border bg-transparent text-core-text-muted text-sm cursor-pointer font-sans"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="m-0 text-[22px] font-extrabold text-core-text">Recurring Tasks</h2>
          <p className="mt-1 mb-0 text-[13px] text-core-green opacity-80">CRM recurring task automation</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-9 h-9 rounded-lg bg-core-green text-core-bg border-none cursor-pointer text-xl font-bold flex items-center justify-center"
        >
          <Plus size={18} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-core-text-muted">Loading recurring tasks...</div>
      ) : recurringTasks.length === 0 ? (
        <div className="text-center py-16 text-core-text-muted">
          <p>No recurring tasks. Create one to automate repetitive work.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 px-5 py-2.5 bg-core-green text-core-bg font-bold text-[13px] rounded-xl border-none cursor-pointer"
          >
            + New Recurring Task
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recurringTasks.map(t => (
            <div
              key={t.id}
              className="bg-core-surface border border-core-border rounded-xl px-[18px] py-3.5 flex justify-between items-center"
            >
              <div>
                <div className="text-sm font-semibold text-core-text">{t.title}</div>
                <div className="text-[11px] text-core-text-muted mt-0.5">
                  {t.frequency && (
                    <span className="px-1.5 py-px rounded text-[10px] font-bold bg-core-green/10 text-core-green mr-2">
                      {t.frequency}
                    </span>
                  )}
                  {t.description && <span>{t.description}</span>}
                </div>
              </div>
              <button
                onClick={() => deleteTask(t.id)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-core-red/10 text-core-red border border-core-red/20 cursor-pointer"
              >
                Delete
              </button>
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
      <FocusMode
        task={currentTask}
        allTasks={tasks}
        onExit={() => setFocusTask(null)}
        onUpdateTask={handleUpdateTask}
        onComplete={handleCompleteTask}
        onSwitchTask={setFocusTask}
      />
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
    <div className="h-full flex flex-col bg-core-bg text-core-text">
      {/* Header */}
      <div className="px-6 py-3 border-b border-core-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold m-0">Task Manager</h1>
          <span className="text-[10px] font-extrabold uppercase tracking-[1.5px] px-2 py-0.5 rounded-md bg-core-green/15 text-core-green">
            UNLIMITED
          </span>
        </div>
        <div className="flex gap-2 items-center">
          {/* Clock + Session Timer */}
          <div className="flex items-center gap-3 mr-2">
            <div className="text-right">
              <div className="text-base font-bold font-mono text-core-text tracking-[0.03em] leading-none">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-[10px] text-core-text-muted leading-none mt-0.5">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="w-px h-7 bg-core-border" />
            <div className="text-center">
              <div className="text-[13px] font-bold font-mono text-core-green leading-none">
                {sessionElapsed}
              </div>
              <div className="text-[9px] text-core-text-muted leading-none mt-0.5 uppercase tracking-[0.08em]">
                session
              </div>
            </div>
            <div className="w-px h-7 bg-core-border" />
          </div>
          {/* Toolbar buttons */}
          <button
            onClick={() => setShowAutoPlan(true)}
            className="px-2.5 py-1.5 bg-core-green/10 text-core-green border border-core-green/20 rounded-md text-[11px] font-bold cursor-pointer"
          >
            AutoPlan
          </button>
          <button
            onClick={() => setShowOptimize(true)}
            className="px-2.5 py-1.5 bg-core-purple/10 text-core-purple border border-core-purple/20 rounded-md text-[11px] font-bold cursor-pointer"
          >
            Optimize
          </button>
          <button
            onClick={() => { setShowSocial(true); setSocialContent(undefined) }}
            className="px-2.5 py-1.5 bg-core-cyan/10 text-core-cyan border border-core-cyan/20 rounded-md text-[11px] font-bold cursor-pointer"
          >
            Social
          </button>
          <div className="w-px h-5 bg-core-border mx-1" />
          {todoCount > 0 && (
            <span className="text-xs text-core-text-dim">
              <strong className="text-core-amber">{todoCount}</strong> to do
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="text-xs text-core-text-dim">
              <strong className="text-core-cyan">{inProgressCount}</strong> in progress
            </span>
          )}
          <span className="text-[11px] text-core-text-muted">
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-core-border text-[10px] font-bold">
              Cmd+K
            </kbd>
          </span>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-core-border px-6 shrink-0">
        {VIEW_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={[
              'px-[18px] py-2.5 bg-transparent border-none cursor-pointer text-[13px] font-bold transition-all duration-150',
              activeView === tab.key
                ? 'text-core-green border-b-2 border-core-green'
                : 'text-core-text-muted border-b-2 border-transparent',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile Tab Switcher (dashboard only) */}
      {activeView === 'dashboard' && (
        <div className="hidden mobile-tabs border-b border-core-border px-4">
          {(['board', 'chat'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={[
                'flex-1 py-2.5 text-[13px] font-bold uppercase tracking-[1px] bg-transparent border-none cursor-pointer transition-all duration-150',
                mobileTab === tab
                  ? 'text-core-green border-b-2 border-core-green'
                  : 'text-core-text-muted border-b-2 border-transparent',
              ].join(' ')}
            >
              {tab === 'board' ? 'Tasks' : 'AI Chat'}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {activeView === 'dashboard' && (
          <>
            {/* Task Board */}
            <div className="flex-1 overflow-hidden border-r border-core-border task-board-panel">
              <TaskBoard
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onStartFocus={setFocusTask}
              />
            </div>
            {/* Chat sidebar removed — use dashboard AI chat instead */}
          </>
        )}

        {activeView === 'clients' && (
          <div className="flex-1 overflow-hidden">
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
          <div className="flex-1 overflow-auto bg-core-bg p-6">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="m-0 text-[22px] font-extrabold text-core-text">Projects</h2>
                <p className="mt-1 mb-0 text-[13px] text-core-green opacity-80">Visual node-based project planning.</p>
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
                className="w-9 h-9 rounded-lg bg-core-green text-core-bg border-none cursor-pointer text-xl font-bold flex items-center justify-center"
              >
                <Plus size={18} />
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="text-center py-16 text-core-text-muted">
                <p>No projects yet. Create one to start planning.</p>
              </div>
            ) : (
              <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {projects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className="bg-core-surface border border-core-border rounded-xl p-[18px] cursor-pointer transition-all duration-200 hover:border-core-green hover:scale-[1.02]"
                  >
                    <h3 className="m-0 mb-1.5 text-base font-bold text-core-text">{p.title}</h3>
                    <div className="flex gap-2 items-center">
                      <span className={[
                        'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md',
                        p.status === 'active'
                          ? 'bg-core-green/15 text-core-green'
                          : 'bg-core-text-dim/15 text-core-text-dim',
                      ].join(' ')}>
                        {p.status}
                      </span>
                      <span className="text-[11px] text-core-text-muted">{p.canvasNodes.length} nodes</span>
                    </div>
                    {p.description && (
                      <p className="mt-2 mb-0 text-xs text-core-text-dim">{p.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'inbox' && (
          <div className="flex-1 overflow-hidden">
            <Inbox
              emails={emails}
              onRefresh={() => {/* CRM conversations API will be wired later */}}
              onMarkRead={id => setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e))}
              onMarkUnread={id => setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: false } : e))}
            />
          </div>
        )}

        {activeView === 'calendar' && (
          <div className="flex-1 overflow-hidden">
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
