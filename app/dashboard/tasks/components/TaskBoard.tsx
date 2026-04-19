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

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#7ed957',
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f4f8', margin: 0 }}>Task Board</h2>
          <p style={{ fontSize: 12, color: '#7ed957', marginTop: 4 }}>
            {tasks.filter(t => t.status === 'done').length} / {tasks.length} completed
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setSortByPriority(!sortByPriority)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: sortByPriority ? 'rgba(126,217,87,0.15)' : 'rgba(255,255,255,0.05)',
              color: sortByPriority ? '#7ed957' : '#8b95a5',
              border: '1px solid ' + (sortByPriority ? 'rgba(126,217,87,0.3)' : '#1e293b'),
              cursor: 'pointer',
            }}
          >
            <ArrowUpDown size={12} />
            {sortByPriority ? 'Priority' : 'Default'}
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: '#7ed957', color: '#0d1117',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div style={{
        flex: 1, overflow: 'auto', padding: 16,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
      }}>
        {columns.map(col => {
          const colTasks = sortTasks(tasks.filter(t => t.status === col.key))
          return (
            <div key={col.key} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid #1e293b',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 200,
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {col.label}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: 'rgba(255,255,255,0.05)',
                  color: '#8b95a5',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}>
                  {colTasks.length}
                </span>
              </div>
              <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
                {colTasks.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3d4654', fontSize: 13 }}>
                    No tasks
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => setEditingTask(task)}
                      style={{
                        background: '#161b22',
                        border: '1px solid #1e293b',
                        borderRadius: 10,
                        padding: 12,
                        cursor: 'pointer',
                        borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || '#f59e0b'}`,
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#7ed957')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <button
                          onClick={e => { e.stopPropagation(); onToggleTask(task.id) }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2,
                            color: task.status === 'done' ? '#7ed957' : '#3d4654',
                          }}
                        >
                          {task.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: 13, fontWeight: 600, margin: 0,
                            color: task.status === 'done' ? '#3d4654' : '#f0f4f8',
                            textDecoration: task.status === 'done' ? 'line-through' : 'none',
                          }}>
                            {task.title}
                          </p>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                              padding: '2px 6px', borderRadius: 6,
                              display: 'flex', alignItems: 'center', gap: 3,
                              background: task.priority === 'high' ? 'rgba(239,68,68,0.15)' :
                                task.priority === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(126,217,87,0.15)',
                              color: PRIORITY_COLORS[task.priority],
                            }}>
                              {task.priority === 'high' && <AlertCircle size={9} />}
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6,
                                display: 'flex', alignItems: 'center', gap: 3,
                                background: 'rgba(0,212,255,0.1)', color: '#00d4ff',
                              }}>
                                <Clock size={9} /> {task.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
                        <button
                          onClick={e => { e.stopPropagation(); onStartFocus(task) }}
                          style={{
                            background: 'rgba(126,217,87,0.15)', border: 'none', borderRadius: 6,
                            padding: '4px 8px', cursor: 'pointer', color: '#7ed957',
                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
                          }}
                          title="Focus Mode"
                        >
                          <Play size={10} fill="currentColor" /> Focus
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); onDeleteTask(task.id) }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                            color: '#3d4654',
                          }}
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
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#161b22', border: '1px solid #1e293b', borderRadius: 16,
            width: '100%', maxWidth: 520, maxHeight: '80vh', overflow: 'auto',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #1e293b',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', margin: 0 }}>Edit Task</h3>
              <button onClick={() => setEditingTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b95a5' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: 1 }}>Title</label>
                <input
                  value={editingTask.title}
                  onChange={e => handleUpdateField({ title: e.target.value })}
                  style={{
                    width: '100%', marginTop: 6, padding: '8px 12px',
                    background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8,
                    color: '#f0f4f8', fontSize: 14, outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: 1 }}>Status</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {(['todo', 'in-progress', 'done'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdateField({ status: s })}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        textTransform: 'uppercase', cursor: 'pointer',
                        background: editingTask.status === s
                          ? (s === 'done' ? 'rgba(126,217,87,0.2)' : 'rgba(0,212,255,0.15)')
                          : 'rgba(255,255,255,0.03)',
                        color: editingTask.status === s
                          ? (s === 'done' ? '#7ed957' : '#00d4ff')
                          : '#3d4654',
                        border: '1px solid ' + (editingTask.status === s ? (s === 'done' ? 'rgba(126,217,87,0.3)' : 'rgba(0,212,255,0.3)') : '#1e293b'),
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: 1 }}>Priority</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => handleUpdateField({ priority: p })}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        textTransform: 'uppercase', cursor: 'pointer',
                        background: editingTask.priority === p ? `${PRIORITY_COLORS[p]}20` : 'rgba(255,255,255,0.03)',
                        color: editingTask.priority === p ? PRIORITY_COLORS[p] : '#3d4654',
                        border: '1px solid ' + (editingTask.priority === p ? `${PRIORITY_COLORS[p]}40` : '#1e293b'),
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: 1 }}>Due Date</label>
                <input
                  type="date"
                  value={editingTask.dueDate || ''}
                  onChange={e => handleUpdateField({ dueDate: e.target.value })}
                  style={{
                    width: '100%', marginTop: 6, padding: '8px 12px',
                    background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8,
                    color: '#f0f4f8', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: 1 }}>Description</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={e => handleUpdateField({ description: e.target.value })}
                  placeholder="Add notes or context..."
                  rows={3}
                  style={{
                    width: '100%', marginTop: 6, padding: '8px 12px',
                    background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8,
                    color: '#f0f4f8', fontSize: 13, outline: 'none', resize: 'vertical',
                  }}
                />
              </div>
            </div>
            <div style={{
              padding: '12px 20px', borderTop: '1px solid #1e293b',
              display: 'flex', justifyContent: 'flex-end', gap: 8,
            }}>
              <button
                onClick={() => setEditingTask(null)}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'rgba(255,255,255,0.05)', color: '#8b95a5',
                  border: '1px solid #1e293b', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => { onStartFocus(editingTask); setEditingTask(null) }}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: '#7ed957', color: '#0d1117',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Play size={14} fill="currentColor" /> Focus Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#161b22', border: '1px solid #1e293b', borderRadius: 16,
            width: '100%', maxWidth: 400,
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #1e293b',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', margin: 0 }}>New Task</h3>
              <button onClick={() => setIsCreateOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b95a5' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: 20 }}>
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="What needs to be done?"
                style={{
                  width: '100%', padding: '10px 14px',
                  background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8,
                  color: '#f0f4f8', fontSize: 14, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: 'rgba(255,255,255,0.05)', color: '#8b95a5',
                    border: '1px solid #1e293b', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    background: newTitle.trim() ? '#7ed957' : '#1e293b',
                    color: newTitle.trim() ? '#0d1117' : '#3d4654',
                    border: 'none', cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                  }}
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
