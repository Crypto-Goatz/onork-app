'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Play, Pause, CheckCircle2, Circle, StickyNote, Timer, ChevronRight, ChevronLeft, SkipForward, X } from 'lucide-react'

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
  allTasks?: Task[]
  onExit: () => void
  onUpdateTask: (task: Task) => void
  onComplete: (taskId: string) => void
  onSwitchTask?: (task: Task) => void
}

const PRIORITY_CLASSES: Record<string, { bg: string; text: string; glow: string }> = {
  high: { bg: 'bg-core-red/10', text: 'text-core-red', glow: 'shadow-core-red/20' },
  medium: { bg: 'bg-core-amber/10', text: 'text-core-amber', glow: 'shadow-core-amber/20' },
  low: { bg: 'bg-core-green/10', text: 'text-core-green', glow: 'shadow-core-green/20' },
}

export default function FocusMode({ task, allTasks, onExit, onUpdateTask, onComplete, onSwitchTask }: FocusModeProps) {
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [notes, setNotes] = useState(task.description || '')
  const [fadeIn, setFadeIn] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [showTaskPicker, setShowTaskPicker] = useState(false)

  // Focus tasks = all non-done tasks
  const focusTasks = (allTasks || []).filter(t => t.status !== 'done')
  const currentIndex = focusTasks.findIndex(t => t.id === task.id)

  useEffect(() => {
    // Fade in animation
    const t = setTimeout(() => setFadeIn(false), 600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [paused])

  // Reset notes when task changes
  useEffect(() => {
    setNotes(task.description || '')
    setElapsed(0)
  }, [task.id, task.description])

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleToggleSubtask = (idx: number) => {
    if (!task.subtasks) return
    const updated = [...task.subtasks]
    updated[idx] = { ...updated[idx], done: !updated[idx].done }
    onUpdateTask({ ...task, subtasks: updated })
  }

  const handleExit = useCallback(() => {
    setFadeOut(true)
    if (notes !== (task.description || '')) {
      onUpdateTask({ ...task, description: notes })
    }
    setTimeout(() => onExit(), 400)
  }, [notes, task, onUpdateTask, onExit])

  const handleDone = () => {
    if (notes !== (task.description || '')) {
      onUpdateTask({ ...task, description: notes })
    }
    onComplete(task.id)

    // Auto-advance to next task
    if (focusTasks.length > 1 && currentIndex < focusTasks.length - 1) {
      onSwitchTask?.(focusTasks[currentIndex + 1])
    } else {
      handleExit()
    }
  }

  const handleNext = () => {
    if (currentIndex < focusTasks.length - 1) onSwitchTask?.(focusTasks[currentIndex + 1])
  }

  const handlePrev = () => {
    if (currentIndex > 0) onSwitchTask?.(focusTasks[currentIndex - 1])
  }

  const priority = PRIORITY_CLASSES[task.priority] || PRIORITY_CLASSES.low
  const completedSubtasks = task.subtasks?.filter(s => s.done).length || 0
  const totalSubtasks = task.subtasks?.length || 0
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0

  return (
    <div className={`fixed inset-0 z-[200] bg-[#020810] flex flex-col transition-all duration-500 ${fadeIn ? 'opacity-0 scale-[1.02]' : fadeOut ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>

      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[200px] opacity-[0.04] ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      </div>

      {/* Header */}
      <div className="h-14 border-b border-white/[0.04] flex items-center justify-between px-6 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-white/30 text-[13px] font-medium hover:text-white/60 transition-colors"
          >
            <X size={16} /> Exit Focus
          </button>

          <div className="w-px h-6 bg-white/[0.06]" />

          {/* Task switcher */}
          {focusTasks.length > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={handlePrev} disabled={currentIndex <= 0}
                className="w-7 h-7 rounded-md flex items-center justify-center bg-transparent border border-white/[0.06] text-white/30 hover:text-white/60 disabled:opacity-20 cursor-pointer transition-colors disabled:cursor-default">
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setShowTaskPicker(!showTaskPicker)}
                className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/40 font-mono cursor-pointer hover:text-white/60 transition-colors"
              >
                {currentIndex + 1} / {focusTasks.length}
              </button>
              <button onClick={handleNext} disabled={currentIndex >= focusTasks.length - 1}
                className="w-7 h-7 rounded-md flex items-center justify-center bg-transparent border border-white/[0.06] text-white/30 hover:text-white/60 disabled:opacity-20 cursor-pointer transition-colors disabled:cursor-default">
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${priority.bg} ${priority.text}`}>
            {task.priority}
          </span>
          <div className="flex items-center gap-1.5 text-white/20">
            <Timer size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Focus Mode</span>
          </div>
        </div>
      </div>

      {/* Task Picker Dropdown */}
      {showTaskPicker && (
        <>
          <div className="fixed inset-0 z-[201]" onClick={() => setShowTaskPicker(false)} />
          <div className="absolute top-14 left-24 z-[202] w-80 max-h-[400px] overflow-y-auto bg-[#161b22] border border-white/[0.08] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-1.5">
            <div className="px-3 py-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">Select Task</div>
            {focusTasks.map((t, i) => (
              <button
                key={t.id}
                onClick={() => { onSwitchTask?.(t); setShowTaskPicker(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left cursor-pointer transition-colors border-none ${t.id === task.id ? 'bg-core-green/[0.08] text-core-green' : 'bg-transparent text-white/60 hover:bg-white/[0.03]'}`}
              >
                <span className={`text-[10px] font-mono w-5 text-center ${t.id === task.id ? 'text-core-green' : 'text-white/20'}`}>{i + 1}</span>
                <span className="text-[13px] font-medium flex-1 truncate">{t.title}</span>
                <span className={`w-2 h-2 rounded-full ${t.priority === 'high' ? 'bg-core-red' : t.priority === 'medium' ? 'bg-core-amber' : 'bg-core-green'}`} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 overflow-hidden">

        {/* Giant Clock */}
        <div className="mb-8 text-center">
          <div className="text-[72px] font-extralight text-white/90 tabular-nums tracking-tight leading-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {formatTime(elapsed)}
          </div>
          <button
            onClick={() => setPaused(!paused)}
            className="mt-3 flex items-center gap-1.5 mx-auto px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/40 cursor-pointer hover:text-white/60 hover:bg-white/[0.06] transition-all"
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>

        {/* Task Title */}
        <h1 className="text-[28px] font-bold text-white text-center mb-2 max-w-xl">{task.title}</h1>

        {task.dueDate && (
          <p className="text-[12px] text-white/25 mb-8">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
        )}

        {/* Two-column: Subtasks + Notes */}
        <div className="w-full max-w-[800px] flex gap-6 flex-1 min-h-0 pb-6">
          {/* Subtasks */}
          <div className="flex-1 flex flex-col gap-3 overflow-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[11px] font-bold text-white/20 uppercase tracking-widest m-0">Checklist</h3>
              {totalSubtasks > 0 && (
                <span className="text-[11px] text-core-green font-mono">{completedSubtasks}/{totalSubtasks}</span>
              )}
            </div>

            {/* Progress bar */}
            {totalSubtasks > 0 && (
              <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mb-2">
                <div className="h-full bg-core-green rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            )}

            {task.subtasks && task.subtasks.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {task.subtasks.map((sub, idx) => (
                  <button
                    key={sub.id}
                    onClick={() => handleToggleSubtask(idx)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer text-left transition-all ${sub.done ? 'bg-white/[0.01] border-white/[0.03] opacity-40' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'}`}
                  >
                    {sub.done
                      ? <CheckCircle2 size={18} className="text-core-green shrink-0" />
                      : <Circle size={18} className="text-white/20 shrink-0" />
                    }
                    <span className={`text-[13px] ${sub.done ? 'text-white/30 line-through' : 'text-white/80'}`}>
                      {sub.title}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-white/15 gap-2">
                <CheckCircle2 size={28} />
                <p className="text-[12px]">No subtasks</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <StickyNote size={12} className="text-core-amber" />
              <h3 className="text-[11px] font-bold text-white/20 uppercase tracking-widest m-0">Notes</h3>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Jot down thoughts, progress, blockers..."
              className="flex-1 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-white/70 text-[13px] leading-relaxed outline-none resize-none placeholder:text-white/15 focus:border-white/[0.1] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.04] px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex gap-2">
          {currentIndex < focusTasks.length - 1 && (
            <button
              onClick={() => { onSwitchTask?.(focusTasks[currentIndex + 1]) }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 text-[13px] font-medium cursor-pointer hover:text-white/60 hover:bg-white/[0.05] transition-colors"
            >
              <SkipForward size={14} /> Skip to Next
            </button>
          )}
        </div>

        <button
          onClick={handleDone}
          className="px-8 py-3 rounded-xl text-[15px] font-bold bg-core-green text-[#020810] border-none cursor-pointer flex items-center gap-2 active:scale-[0.97] transition-transform hover:shadow-lg hover:shadow-core-green/20"
        >
          <CheckCircle2 size={18} /> Complete Task
        </button>
      </div>
    </div>
  )
}
