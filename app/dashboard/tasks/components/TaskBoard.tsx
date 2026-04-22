'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Clock, Trash2, ArrowUpDown, AlertCircle, Plus, X, Play } from 'lucide-react'

export interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  subtasks?: { id: string; title: string; done: boolean }[]
}

interface TaskBoardProps {
  tasks: Task[]
  onToggleTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onAddTask: (task: Partial<Task>) => void
  onUpdateTask: (task: Task) => void
  onStartFocus: (task: Task) => void
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-core-red/15 text-core-red',
  medium: 'bg-core-amber/15 text-core-amber',
  low: 'bg-core-green/15 text-core-green',
}

const PRIORITY_BORDER: Record<string, string> = {
  high: 'border-l-core-red',
  medium: 'border-l-core-amber',
  low: 'border-l-core-green',
}

const STATUS_ACTIVE: Record<string, string> = {
  done: 'bg-core-green/20 text-core-green border border-core-green/30',
  'in-progress': 'bg-core-cyan/15 text-core-cyan border border-core-cyan/30',
  todo: 'bg-core-cyan/15 text-core-cyan border border-core-cyan/30',
}

const PRIORITY_ACTIVE: Record<string, string> = {
  high: 'bg-core-red/20 text-core-red border border-core-red/40',
  medium: 'bg-core-amber/20 text-core-amber border border-core-amber/40',
  low: 'bg-core-green/20 text-core-green border border-core-green/40',
}

export default function TaskBoard({
  tasks, onToggleTask, onDeleteTask, onAddTask, onUpdateTask, onStartFocus
}: TaskBoardProps) {
  const [sortByPriority, setSortByPriority] = useState(true)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const columns: { key: Task['status']; label: string }[] = [
    { key: 'todo', label: 'To Do' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'done', label: 'Done' },
  ]

  const sortTasks = (list: Task[]) => {
    return [...list].sort((a, b) => {
      if (sortByPriority) {
        const w: Record<string, number> = { high: 3, medium: 2, low: 1 }
        const diff = (w[b.priority] || 2) - (w[a.priority] || 2)
        if (diff !== 0) return diff
      }
      return 0
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    onAddTask({ title: newTitle, priority: 'medium', status: 'todo' })
    setNewTitle('')
    setIsCreateOpen(false)
  }

  const handleUpdateField = (updates: Partial<Task>) => {
    if (!editingTask) return
    const updated = { ...editingTask, ...updates }
    setEditingTask(updated)
    onUpdateTask(updated)
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="px-5 py-4 border-b border-core-border flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-core-text m-0">Task Board</h2>
          <p className="text-xs text-core-green mt-1">
            {tasks.filter(t => t.status === 'done').length} / {tasks.length} completed
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setSortByPriority(!sortByPriority)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
              sortByPriority
                ? 'bg-core-green/15 text-core-green border-core-green/30'
                : 'bg-white/5 text-core-text-dim border-core-border'
            }`}
          >
            <ArrowUpDown size={12} />
            {sortByPriority ? 'Priority' : 'Default'}
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-core-green text-core-bg border-0 cursor-pointer"
          >
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-auto p-4 grid grid-cols-3 gap-4">
        {columns.map(col => {
          const colTasks = sortTasks(tasks.filter(t => t.status === col.key))
          return (
            <div
              key={col.key}
              className="bg-white/[0.02] border border-core-border rounded-xl flex flex-col min-h-[200px]"
            >
              <div className="px-4 py-3 border-b border-core-border flex justify-between items-center">
                <span className="text-xs font-bold text-core-text-dim uppercase tracking-widest">
                  {col.label}
                </span>
                <span className="text-[11px] font-bold bg-white/5 text-core-text-dim px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>
              <div className="flex-1 p-2 flex flex-col gap-2 overflow-auto">
                {colTasks.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-core-text-muted text-[13px]">
                    No tasks
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => setEditingTask(task)}
                      className={`bg-core-card border border-l-[3px] border-core-border rounded-[10px] p-3 cursor-pointer transition-colors hover:border-core-green ${PRIORITY_BORDER[task.priority]}`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); onToggleTask(task.id) }}
                          className={`bg-transparent border-0 cursor-pointer p-0 mt-0.5 ${task.status === 'done' ? 'text-core-green' : 'text-core-text-muted'}`}
                        >
                          {task.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                        <div className="flex-1">
                          <p className={`text-[13px] font-semibold m-0 ${task.status === 'done' ? 'text-core-text-muted line-through' : 'text-core-text'}`}>
                            {task.title}
                          </p>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[6px] flex items-center gap-0.5 ${PRIORITY_BADGE[task.priority]}`}>
                              {task.priority === 'high' && <AlertCircle size={9} />}
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px] flex items-center gap-0.5 bg-core-cyan/10 text-core-cyan">
                                <Clock size={9} /> {task.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 mt-2 justify-end">
                        <button
                          onClick={e => { e.stopPropagation(); onStartFocus(task) }}
                          className="bg-core-green/15 border-0 rounded-[6px] px-2 py-1 cursor-pointer text-core-green flex items-center gap-1 text-[10px] font-bold"
                          title="Focus Mode"
                        >
                          <Play size={10} fill="currentColor" /> Focus
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); onDeleteTask(task.id) }}
                          className="bg-transparent border-0 cursor-pointer p-1 text-core-text-muted hover:text-core-red transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-core-card border border-core-border rounded-2xl w-full max-w-[520px] max-h-[80vh] overflow-auto">
            <div className="px-5 py-4 border-b border-core-border flex justify-between items-center">
              <h3 className="text-base font-bold text-core-text m-0">Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="bg-transparent border-0 cursor-pointer text-core-text-dim hover:text-core-text">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold text-core-text-dim uppercase tracking-widest block mb-1.5">Title</label>
                <input
                  value={editingTask.title}
                  onChange={e => handleUpdateField({ title: e.target.value })}
                  className="w-full mt-0 px-3 py-2 bg-core-bg border border-core-border rounded-lg text-core-text text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-core-text-dim uppercase tracking-widest block mb-1.5">Status</label>
                <div className="flex gap-2 mt-0">
                  {(['todo', 'in-progress', 'done'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdateField({ status: s })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase cursor-pointer transition-colors ${
                        editingTask.status === s
                          ? STATUS_ACTIVE[s]
                          : 'bg-white/[0.03] text-core-text-muted border border-core-border'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-core-text-dim uppercase tracking-widest block mb-1.5">Priority</label>
                <div className="flex gap-2 mt-0">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => handleUpdateField({ priority: p })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase cursor-pointer transition-colors ${
                        editingTask.priority === p
                          ? PRIORITY_ACTIVE[p]
                          : 'bg-white/[0.03] text-core-text-muted border border-core-border'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-core-text-dim uppercase tracking-widest block mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={editingTask.dueDate || ''}
                  onChange={e => handleUpdateField({ dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-core-bg border border-core-border rounded-lg text-core-text text-[13px] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-core-text-dim uppercase tracking-widest block mb-1.5">Description</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={e => handleUpdateField({ description: e.target.value })}
                  placeholder="Add notes or context..."
                  rows={3}
                  className="w-full px-3 py-2 bg-core-bg border border-core-border rounded-lg text-core-text text-[13px] outline-none resize-y"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-core-border flex justify-end gap-2">
              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-white/5 text-core-text-dim border border-core-border cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => { onStartFocus(editingTask); setEditingTask(null) }}
                className="px-4 py-2 rounded-lg text-[13px] font-bold bg-core-green text-core-bg border-0 cursor-pointer flex items-center gap-1.5"
              >
                <Play size={14} fill="currentColor" /> Focus Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-core-card border border-core-border rounded-2xl w-full max-w-[400px]">
            <div className="px-5 py-4 border-b border-core-border flex justify-between items-center">
              <h3 className="text-base font-bold text-core-text m-0">New Task</h3>
              <button onClick={() => setIsCreateOpen(false)} className="bg-transparent border-0 cursor-pointer text-core-text-dim hover:text-core-text">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5">
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-3.5 py-2.5 bg-core-bg border border-core-border rounded-lg text-core-text text-sm outline-none"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-white/5 text-core-text-dim border border-core-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className={`px-4 py-2 rounded-lg text-[13px] font-bold border-0 transition-colors ${
                    newTitle.trim()
                      ? 'bg-core-green text-core-bg cursor-pointer'
                      : 'bg-core-border text-core-text-muted cursor-not-allowed'
                  }`}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
