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

const PRIORITY_CLASSES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-core-red/10', text: 'text-core-red' },
  medium: { bg: 'bg-core-amber/10', text: 'text-core-amber' },
  low: { bg: 'bg-core-green/10', text: 'text-core-green' },
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

  const priority = PRIORITY_CLASSES[task.priority] || PRIORITY_CLASSES.low

  return (
    <div className="fixed inset-0 z-[100] bg-core-bg flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-core-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-core-text-muted text-[13px] font-semibold hover:text-core-text transition-colors"
          >
            <ArrowLeft size={16} /> Exit
          </button>
          <div className="w-px h-6 bg-core-border" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-core-green/20 flex items-center justify-center">
              <Play size={14} fill="currentColor" className="text-core-green" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-core-text m-0">{task.title}</p>
              <p className="text-[11px] font-mono text-core-green m-0">{formatTime(elapsed)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${priority.bg} ${priority.text}`}>
            {task.priority}
          </span>
          <span className="text-[12px] font-semibold text-core-text-muted">FOCUS MODE</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden max-w-[900px] w-full mx-auto px-6 py-8 gap-8">
        {/* Left: Subtasks / Checklist */}
        <div className="flex-1 flex flex-col gap-4 overflow-auto">
          <h3 className="text-[13px] font-bold text-core-text-muted uppercase tracking-widest m-0">
            Checklist
          </h3>
          {task.subtasks && task.subtasks.length > 0 ? (
            <div className="flex flex-col gap-2">
              {task.subtasks.map((sub, idx) => (
                <button
                  key={sub.id}
                  onClick={() => handleToggleSubtask(idx)}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-[10px] border border-core-border cursor-pointer text-left transition-all ${sub.done ? 'bg-white/[0.02] opacity-50' : 'bg-white/[0.04]'}`}
                >
                  {sub.done
                    ? <CheckCircle2 size={18} className="text-core-green shrink-0" />
                    : <Circle size={18} className="text-core-text-muted shrink-0" />
                  }
                  <span className={`text-[13px] ${sub.done ? 'text-core-text-muted line-through' : 'text-core-text'}`}>
                    {sub.title}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-core-text-muted gap-2">
              <CheckCircle2 size={32} />
              <p className="text-[13px]">No subtasks yet. Use the AI chat to auto-plan.</p>
            </div>
          )}
        </div>

        {/* Right: Notes */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <StickyNote size={14} className="text-core-amber" />
            <h3 className="text-[13px] font-bold text-core-text-muted uppercase tracking-widest m-0">
              Notes
            </h3>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Jot down thoughts, context, or progress..."
            className="flex-1 p-4 bg-white/[0.02] border border-core-border rounded-xl text-core-text text-[13px] leading-relaxed outline-none resize-none placeholder:text-core-text-muted"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-core-border px-6 py-4 flex justify-center">
        <button
          onClick={handleDone}
          className="px-8 py-3 rounded-xl text-[15px] font-bold bg-core-green text-core-bg border-none cursor-pointer flex items-center gap-2 active:scale-[0.97] transition-transform"
        >
          <CheckCircle2 size={18} /> I am Done
        </button>
      </div>
    </div>
  )
}
