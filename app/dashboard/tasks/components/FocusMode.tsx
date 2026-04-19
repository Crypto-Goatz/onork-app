'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Play, CheckCircle2, Circle, StickyNote } from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  subtasks?: { id: string; title: string; done: boolean }[]
}

interface FocusModeProps {
  task: Task
  onExit: () => void
  onUpdateTask: (task: Task) => void
  onComplete: (taskId: string) => void
}

export default function FocusMode({ task, onExit, onUpdateTask, onComplete }: FocusModeProps) {
  const [elapsed, setElapsed] = useState(0)
  const [notes, setNotes] = useState(task.description || '')

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleToggleSubtask = (idx: number) => {
    if (!task.subtasks) return
    const updated = [...task.subtasks]
    updated[idx] = { ...updated[idx], done: !updated[idx].done }
    onUpdateTask({ ...task, subtasks: updated })
  }

  const handleDone = () => {
    if (notes !== (task.description || '')) {
      onUpdateTask({ ...task, description: notes })
    }
    onComplete(task.id)
    onExit()
  }

  const PRIORITY_COLORS: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#7ed957',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#0d1117',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        height: 56, borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onExit}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#8b95a5', fontSize: 13, fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} /> Exit
          </button>
          <div style={{ width: 1, height: 24, background: '#1e293b' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(126,217,87,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Play size={14} fill="#7ed957" style={{ color: '#7ed957' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8', margin: 0 }}>{task.title}</p>
              <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#7ed957', margin: 0 }}>{formatTime(elapsed)}</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
            padding: '4px 10px', borderRadius: 6,
            background: `${PRIORITY_COLORS[task.priority]}20`,
            color: PRIORITY_COLORS[task.priority],
          }}>
            {task.priority}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#8b95a5' }}>FOCUS MODE</span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, display: 'flex', overflow: 'hidden',
        maxWidth: 900, width: '100%', margin: '0 auto',
        padding: '32px 24px',
        gap: 32,
      }}>
        {/* Left: Subtasks / Checklist */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
            Checklist
          </h3>
          {task.subtasks && task.subtasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {task.subtasks.map((sub, idx) => (
                <button
                  key={sub.id}
                  onClick={() => handleToggleSubtask(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 10,
                    background: sub.done ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid ' + (sub.done ? '#1e293b' : '#1e293b'),
                    cursor: 'pointer', textAlign: 'left',
                    opacity: sub.done ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {sub.done
                    ? <CheckCircle2 size={18} style={{ color: '#7ed957', flexShrink: 0 }} />
                    : <Circle size={18} style={{ color: '#3d4654', flexShrink: 0 }} />
                  }
                  <span style={{
                    fontSize: 13, color: sub.done ? '#3d4654' : '#f0f4f8',
                    textDecoration: sub.done ? 'line-through' : 'none',
                  }}>
                    {sub.title}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: '#3d4654', gap: 8,
            }}>
              <CheckCircle2 size={32} />
              <p style={{ fontSize: 13 }}>No subtasks yet. Use the AI chat to auto-plan.</p>
            </div>
          )}
        </div>

        {/* Right: Notes */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StickyNote size={14} style={{ color: '#f59e0b' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
              Notes
            </h3>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Jot down thoughts, context, or progress..."
            style={{
              flex: 1, padding: 16,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid #1e293b', borderRadius: 12,
              color: '#f0f4f8', fontSize: 13, lineHeight: 1.6,
              outline: 'none', resize: 'none',
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #1e293b',
        padding: '16px 24px',
        display: 'flex', justifyContent: 'center',
      }}>
        <button
          onClick={handleDone}
          style={{
            padding: '12px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700,
            background: '#7ed957', color: '#0d1117',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <CheckCircle2 size={18} /> I am Done
        </button>
      </div>
    </div>
  )
}
