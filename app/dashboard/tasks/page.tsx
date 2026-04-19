'use client'

import { useState, useEffect, useCallback } from 'react'
import TaskBoard from './components/TaskBoard'
import type { Task } from './components/TaskBoard'
import ChatWindow from './components/ChatWindow'
import FocusMode from './components/FocusMode'
import CommandCenter from './components/CommandCenter'

const STORAGE_KEY = '0ncore_tasks'

interface ChatMessage {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
}

function loadTasks(): Task[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTasks(tasks: Task[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
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

  useEffect(() => {
    setMounted(true)
    setTasks(loadTasks())
  }, [])

  useEffect(() => {
    if (mounted) saveTasks(tasks)
  }, [tasks, mounted])

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
        'todo': 'in-progress',
        'in-progress': 'done',
        'done': 'todo',
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

  const handleSendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    }
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

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.reply || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, botMsg])

      if (data.suggestedReplies?.length) {
        setSuggestedReplies(data.suggestedReplies)
      }

      // Process task actions
      if (data.taskActions?.length) {
        for (const action of data.taskActions) {
          if (action.type === 'create' && action.title) {
            handleAddTask({
              title: action.title,
              priority: action.priority || 'medium',
              description: action.description,
              status: 'todo',
            })
          } else if (action.type === 'complete' && action.taskId) {
            handleCompleteTask(action.taskId)
          } else if (action.type === 'update' && action.taskId) {
            setTasks(prev => prev.map(t =>
              t.id === action.taskId
                ? { ...t, ...(action.status && { status: action.status }), ...(action.priority && { priority: action.priority }) }
                : t
            ))
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err)
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Sorry, I ran into an error. Make sure the GROQ_API_KEY is configured in your environment.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errMsg])
      setSuggestedReplies(['Try again', 'Create a task manually'])
    } finally {
      setIsThinking(false)
    }
  }, [tasks, handleAddTask, handleCompleteTask])

  // Focus mode
  if (focusTask) {
    const currentTask = tasks.find(t => t.id === focusTask.id) || focusTask
    return (
      <FocusMode
        task={currentTask}
        onExit={() => setFocusTask(null)}
        onUpdateTask={handleUpdateTask}
        onComplete={handleCompleteTask}
      />
    )
  }

  if (!mounted) return null

  const todoCount = tasks.filter(t => t.status === 'todo').length
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#0d1117', color: '#f0f4f8',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Task Manager</h1>
          <span style={{
            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5,
            padding: '3px 8px', borderRadius: 6,
            background: 'rgba(126,217,87,0.15)', color: '#7ed957',
          }}>
            UNLIMITED
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {todoCount > 0 && (
            <span style={{ fontSize: 12, color: '#8b95a5' }}>
              <strong style={{ color: '#f59e0b' }}>{todoCount}</strong> to do
            </span>
          )}
          {inProgressCount > 0 && (
            <span style={{ fontSize: 12, color: '#8b95a5' }}>
              <strong style={{ color: '#00d4ff' }}>{inProgressCount}</strong> in progress
            </span>
          )}
          <span style={{ fontSize: 11, color: '#3d4654' }}>
            <kbd style={{
              padding: '2px 6px', background: 'rgba(255,255,255,0.05)',
              borderRadius: 4, border: '1px solid #1e293b',
              fontSize: 10, fontWeight: 700,
            }}>
              Cmd+K
            </kbd>
          </span>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div style={{
        display: 'none',
        borderBottom: '1px solid #1e293b',
        padding: '0 16px',
      }}
        className="mobile-tabs"
      >
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
          >
            {tab === 'board' ? 'Tasks' : 'AI Chat'}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Task Board */}
        <div style={{
          flex: 1, overflow: 'hidden',
          borderRight: '1px solid #1e293b',
        }}
          className="task-board-panel"
        >
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
        <div style={{
          width: 380, flexShrink: 0, overflow: 'hidden',
          background: 'rgba(255,255,255,0.01)',
        }}
          className="chat-panel"
        >
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isThinking={isThinking}
            suggestedReplies={suggestedReplies}
          />
        </div>
      </div>

      {/* Command Center (Cmd+K) */}
      <CommandCenter
        tasks={tasks}
        onCreateTask={() => {
          handleAddTask({ title: 'New Task', priority: 'medium', status: 'todo' })
        }}
        onFocusTask={setFocusTask}
        onSendChat={handleSendMessage}
      />

      {/* Responsive styles injected inline via style tag */}
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
