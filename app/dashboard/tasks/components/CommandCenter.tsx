'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, ChevronRight, CheckSquare, Plus, Play, ListTodo, Command } from 'lucide-react'

interface Task {
  id: string
  title: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
}

interface CommandCenterProps {
  tasks: Task[]
  onCreateTask: () => void
  onFocusTask: (task: Task) => void
  onSendChat: (message: string) => void
}

export default function CommandCenter({ tasks, onCreateTask, onFocusTask, onSendChat }: CommandCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  const quickActions = [
    { id: 'new-task', label: 'Create New Task', icon: <Plus size={16} />, category: 'Actions', action: () => { onCreateTask(); setIsOpen(false) } },
    { id: 'plan-day', label: 'Plan My Day', icon: <ListTodo size={16} />, category: 'AI', action: () => { onSendChat('Help me plan my day based on my current tasks'); setIsOpen(false) } },
    { id: 'prioritize', label: 'Prioritize Tasks', icon: <CheckSquare size={16} />, category: 'AI', action: () => { onSendChat('Look at my tasks and suggest what I should focus on first'); setIsOpen(false) } },
  ]

  const taskItems = tasks
    .filter(t => t.status !== 'done')
    .map(t => ({
      id: `task-${t.id}`,
      label: t.title,
      icon: <Play size={16} />,
      category: 'Tasks',
      action: () => { onFocusTask(t); setIsOpen(false) },
    }))

  const allItems = [...quickActions, ...taskItems]
  const filtered = allItems.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  )
  const categories = Array.from(new Set(filtered.map(i => i.category)))

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}>
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      />

      {/* Palette */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 520,
        background: '#161b22', border: '1px solid #1e293b', borderRadius: 16,
        overflow: 'hidden', margin: '0 16px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: 16, borderBottom: '1px solid #1e293b',
        }}>
          <Search size={18} style={{ color: '#7ed957' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks or commands..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#f0f4f8', fontSize: 15,
            }}
          />
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d4654', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: 8 }}>
          {categories.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#3d4654', fontSize: 13, fontStyle: 'italic' }}>
              No results for &quot;{query}&quot;
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{
                  padding: '4px 12px', fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 1.5, color: '#3d4654',
                }}>
                  {cat}
                </div>
                {filtered.filter(i => i.category === cat).map(item => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 10,
                      background: 'transparent', border: 'none',
                      color: '#8b95a5', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(126,217,87,0.08)'
                      e.currentTarget.style.color = '#7ed957'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#8b95a5'
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.icon}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                    <ChevronRight size={14} style={{ opacity: 0.3 }} />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid #1e293b',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 10, color: '#3d4654', fontWeight: 600,
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <span>
              <kbd style={{ padding: '2px 4px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, border: '1px solid #1e293b', marginRight: 4 }}>Esc</kbd>
              close
            </span>
            <span>
              <kbd style={{ padding: '2px 4px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, border: '1px solid #1e293b', marginRight: 4 }}>Enter</kbd>
              select
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Command size={10} /> Navigator
          </div>
        </div>
      </div>
    </div>
  )
}
