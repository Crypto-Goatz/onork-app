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
  const [hoveredId, setHoveredId] = useState<string | null>(null)
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
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-[4px]"
      />

      {/* Palette */}
      <div className="relative z-10 w-full max-w-[520px] bg-core-surface border border-core-border rounded-2xl overflow-hidden mx-4 shadow-[0_25px_50px_rgba(0,0,0,0.5)]">

        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-core-border">
          <Search size={18} className="text-core-green shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks or commands..."
            className="flex-1 bg-transparent border-none outline-none text-core-text text-[15px]"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="bg-transparent border-none cursor-pointer text-core-text-muted p-1 hover:text-core-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {categories.length === 0 ? (
            <div className="py-8 text-center text-core-text-muted text-[13px] italic">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat} className="mb-2">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-[1.5px] text-core-text-muted">
                  {cat}
                </div>
                {filtered.filter(i => i.category === cat).map(item => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={[
                      'w-full flex items-center gap-3 px-3 py-[10px] rounded-[10px] border-none text-left cursor-pointer transition-all duration-100',
                      hoveredId === item.id
                        ? 'bg-core-green/[0.08] text-core-green'
                        : 'bg-transparent text-core-text-dim',
                    ].join(' ')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <span className="flex-1 text-[13px] font-semibold">{item.label}</span>
                    <ChevronRight size={14} className="opacity-30" />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-[10px] border-t border-core-border flex justify-between items-center text-[10px] text-core-text-muted font-semibold">
          <div className="flex gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-white/5 rounded border border-core-border mr-1">Esc</kbd>
              close
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-white/5 rounded border border-core-border mr-1">Enter</kbd>
              select
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command size={10} /> Navigator
          </div>
        </div>
      </div>
    </div>
  )
}
