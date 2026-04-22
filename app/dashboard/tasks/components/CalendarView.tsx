'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, CalendarDays } from 'lucide-react'
import type { CalendarEvent } from '../types'

const uid = () => Math.random().toString(36).substr(2, 9)

const TYPE_BADGE: Record<string, string> = {
  meeting: 'bg-blue-500/20 text-blue-400',
  deadline: 'bg-core-red/20 text-core-red',
  reminder: 'bg-core-amber/20 text-core-amber',
  personal: 'bg-core-purple/20 text-core-purple',
}

const TYPE_BAR: Record<string, string> = {
  meeting: 'bg-blue-500',
  deadline: 'bg-core-red',
  reminder: 'bg-core-amber',
  personal: 'bg-core-purple',
}

const TYPE_ACTIVE: Record<string, string> = {
  meeting: 'bg-blue-500 text-white',
  deadline: 'bg-core-red text-white',
  reminder: 'bg-core-amber text-white',
  personal: 'bg-core-purple text-white',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface CalendarViewProps {
  events: CalendarEvent[]
  onAddEvent: (event: CalendarEvent) => void
  onDeleteEvent: (id: string) => void
}

export default function CalendarView({ events, onAddEvent, onDeleteEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSummary, setNewSummary] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('09:00')
  const [newEndTime, setNewEndTime] = useState('10:00')
  const [newType, setNewType] = useState<CalendarEvent['type']>('meeting')
  const [newDesc, setNewDesc] = useState('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const getEventsForDate = (dateStr: string) => events.filter(e => e.date === dateStr)

  const handleAdd = () => {
    if (!newSummary.trim() || !newDate) return
    onAddEvent({
      id: uid(),
      summary: newSummary.trim(),
      description: newDesc.trim() || undefined,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      type: newType,
    })
    setNewSummary('')
    setNewDate('')
    setNewStartTime('09:00')
    setNewEndTime('10:00')
    setNewType('meeting')
    setNewDesc('')
    setShowAddModal(false)
  }

  const dateDetail = selectedDate ? getEventsForDate(selectedDate) : []

  // Build calendar grid
  const cells: { date: number; dateStr: string; isCurrentMonth: boolean }[] = []
  for (let i = 0; i < firstDay; i++) {
    const d = new Date(year, month, -firstDay + i + 1)
    cells.push({ date: d.getDate(), dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: d, dateStr, isCurrentMonth: true })
  }
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      cells.push({ date: d.getDate(), dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, isCurrentMonth: false })
    }
  }

  return (
    <div className="h-full flex flex-col bg-core-bg text-core-text">
      {/* Header */}
      <div className="px-6 py-5 border-b border-core-border flex justify-between items-center">
        <div>
          <h2 className="m-0 text-[22px] font-extrabold flex items-center gap-2.5">
            <CalendarDays size={22} className="text-core-green" />
            Calendar
          </h2>
          <p className="m-0 mt-1 text-[13px] text-core-green opacity-80">Your scheduled events and meetings.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-core-card rounded-lg overflow-hidden border border-core-border">
            {(['month', 'week'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3.5 py-1.5 border-0 text-xs font-bold cursor-pointer uppercase tracking-[0.5px] transition-colors ${
                  viewMode === m ? 'bg-core-green text-core-bg' : 'bg-transparent text-core-text-dim'
                }`}
              >{m}</button>
            ))}
          </div>
          <button
            onClick={() => { setShowAddModal(true); setNewDate(todayStr) }}
            className="flex items-center gap-1 px-3.5 py-1.5 bg-core-green text-core-bg border-0 rounded-lg text-xs font-bold cursor-pointer"
          >
            <Plus size={14} /> Event
          </button>
        </div>
      </div>

      {/* Month nav */}
      <div className="px-6 py-3 flex items-center justify-between">
        <button onClick={prevMonth} className="bg-transparent border-0 text-core-text-dim cursor-pointer p-1 hover:text-core-text transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h3 className="m-0 text-base font-bold">{MONTHS[month]} {year}</h3>
        <button onClick={nextMonth} className="bg-transparent border-0 text-core-text-dim cursor-pointer p-1 hover:text-core-text transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-bold text-core-text-muted uppercase tracking-widest">{d}</div>
          ))}
        </div>
        {/* Date cells */}
        <div className="grid grid-cols-7 gap-px">
          {cells.map((cell, i) => {
            const dayEvents = getEventsForDate(cell.dateStr)
            const isToday = cell.dateStr === todayStr
            const isSelected = cell.dateStr === selectedDate
            return (
              <div
                key={i}
                onClick={() => setSelectedDate(cell.dateStr === selectedDate ? null : cell.dateStr)}
                className={`min-h-[80px] p-1.5 rounded-[6px] cursor-pointer transition-colors border ${
                  isSelected
                    ? 'bg-core-green/8 border-core-green'
                    : 'bg-core-card border-core-border'
                } ${!cell.isCurrentMonth ? 'opacity-35' : ''}`}
              >
                <div className={`text-xs mb-1 ${isToday ? 'font-extrabold text-core-green' : 'font-medium text-core-text-dim'}`}>
                  {cell.date}
                </div>
                {dayEvents.slice(0, 3).map(ev => (
                  <div key={ev.id} className={`text-[9px] px-1 py-0.5 rounded-[3px] mb-0.5 font-semibold overflow-hidden text-ellipsis whitespace-nowrap ${TYPE_BADGE[ev.type]}`}>
                    {ev.summary}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-core-text-muted">+{dayEvents.length - 3} more</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Date detail panel */}
      {selectedDate && (
        <div className="border-t border-core-border bg-core-card p-4 max-h-[220px] overflow-auto">
          <div className="flex justify-between items-center mb-2.5">
            <h4 className="m-0 text-sm font-bold">{selectedDate}</h4>
            <button
              onClick={() => { setShowAddModal(true); setNewDate(selectedDate) }}
              className="flex items-center gap-1 bg-core-green/15 text-core-green border-0 rounded-[6px] px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
            >
              <Plus size={11} /> Add
            </button>
          </div>
          {dateDetail.length === 0 ? (
            <div className="text-core-text-muted text-xs">No events.</div>
          ) : dateDetail.map(ev => (
            <div key={ev.id} className="flex items-center gap-2.5 py-2 border-b border-core-border">
              <div className={`w-1 h-7 rounded-sm ${TYPE_BAR[ev.type]}`} />
              <div className="flex-1">
                <div className="text-[13px] font-semibold">{ev.summary}</div>
                <div className="text-[11px] text-core-text-dim">
                  {ev.startTime} - {ev.endTime}{ev.description ? ` | ${ev.description}` : ''}
                </div>
              </div>
              <button onClick={() => onDeleteEvent(ev.id)} className="bg-transparent border-0 text-core-red cursor-pointer p-1 hover:opacity-80 transition-opacity">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
          <div className="bg-core-card border border-core-border rounded-2xl p-6 w-[400px]">
            <div className="flex justify-between mb-4">
              <h3 className="m-0 text-base font-extrabold">New Event</h3>
              <button onClick={() => setShowAddModal(false)} className="bg-transparent border-0 text-core-text-dim cursor-pointer hover:text-core-text">
                <X size={20} />
              </button>
            </div>
            <div className="mb-3.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-[1.2px] text-core-text-dim mb-1">Event Name</label>
              <input
                value={newSummary}
                onChange={e => setNewSummary(e.target.value)}
                placeholder="Meeting with team"
                className="w-full px-3 py-2 bg-core-bg border border-core-border rounded-lg text-core-text text-[13px] outline-none box-border"
              />
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-3.5">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[1.2px] text-core-text-dim mb-1">Date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full px-2 py-2 bg-core-bg border border-core-border rounded-lg text-core-text text-xs outline-none box-border" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[1.2px] text-core-text-dim mb-1">Start</label>
                <input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="w-full px-2 py-2 bg-core-bg border border-core-border rounded-lg text-core-text text-xs outline-none box-border" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[1.2px] text-core-text-dim mb-1">End</label>
                <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="w-full px-2 py-2 bg-core-bg border border-core-border rounded-lg text-core-text text-xs outline-none box-border" />
              </div>
            </div>
            <div className="mb-3.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-[1.2px] text-core-text-dim mb-1">Type</label>
              <div className="flex gap-1.5">
                {(['meeting', 'deadline', 'reminder', 'personal'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewType(t)}
                    className={`px-3 py-1 rounded-[6px] border-0 text-[11px] font-bold cursor-pointer capitalize transition-colors ${
                      newType === t ? TYPE_ACTIVE[t] : 'bg-white/5 text-core-text-dim'
                    }`}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div className="mb-3.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-[1.2px] text-core-text-dim mb-1">Description (optional)</label>
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Notes..."
                className="w-full px-3 py-2 bg-core-bg border border-core-border rounded-lg text-core-text text-[13px] outline-none box-border"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-transparent border border-core-border rounded-lg text-core-text-dim cursor-pointer text-xs">Cancel</button>
              <button
                onClick={handleAdd}
                disabled={!newSummary.trim() || !newDate}
                className={`px-4 py-2 border-0 rounded-lg text-xs font-bold transition-colors ${
                  newSummary.trim() && newDate
                    ? 'bg-core-green text-core-bg cursor-pointer'
                    : 'bg-core-border text-core-text-muted cursor-not-allowed'
                }`}
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
