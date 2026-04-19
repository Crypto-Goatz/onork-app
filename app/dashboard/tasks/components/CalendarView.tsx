'use client'

import { useState } from 'react'
import type { CalendarEvent } from '../types'

const uid = () => Math.random().toString(36).substr(2, 9)

const TYPE_COLORS: Record<string, string> = {
  meeting: '#3b82f6',
  deadline: '#ef4444',
  reminder: '#f59e0b',
  personal: '#a855f7',
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#f0f4f8' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#7ed957' }}>{'\uD83D\uDCC5'}</span> Calendar
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7ed957', opacity: 0.8 }}>Your scheduled events and meetings.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: '#161b22', borderRadius: 8, overflow: 'hidden', border: '1px solid #1e293b' }}>
            {(['month', 'week'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  padding: '6px 14px', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: viewMode === m ? '#7ed957' : 'transparent',
                  color: viewMode === m ? '#0d1117' : '#8b95a5',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}
              >{m}</button>
            ))}
          </div>
          <button
            onClick={() => { setShowAddModal(true); setNewDate(todayStr) }}
            style={{ padding: '6px 14px', background: '#7ed957', color: '#0d1117', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >+ Event</button>
        </div>
      </div>

      {/* Month nav */}
      <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 18 }}>&lsaquo;</button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{MONTHS[month]} {year}</h3>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 18 }}>&rsaquo;</button>
      </div>

      {/* Calendar Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#3d4654', textTransform: 'uppercase', letterSpacing: 1 }}>{d}</div>
          ))}
        </div>
        {/* Date cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {cells.map((cell, i) => {
            const dayEvents = getEventsForDate(cell.dateStr)
            const isToday = cell.dateStr === todayStr
            const isSelected = cell.dateStr === selectedDate
            return (
              <div
                key={i}
                onClick={() => setSelectedDate(cell.dateStr === selectedDate ? null : cell.dateStr)}
                style={{
                  minHeight: 80, padding: 6, background: isSelected ? 'rgba(126,217,87,0.08)' : '#161b22',
                  border: `1px solid ${isSelected ? '#7ed957' : '#1e293b'}`,
                  borderRadius: 6, cursor: 'pointer', opacity: cell.isCurrentMonth ? 1 : 0.35,
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? '#7ed957' : '#8b95a5', marginBottom: 4 }}>
                  {cell.date}
                </div>
                {dayEvents.slice(0, 3).map(ev => (
                  <div key={ev.id} style={{
                    fontSize: 9, padding: '2px 4px', borderRadius: 3, marginBottom: 2,
                    background: TYPE_COLORS[ev.type] + '22', color: TYPE_COLORS[ev.type],
                    fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ev.summary}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div style={{ fontSize: 9, color: '#3d4654' }}>+{dayEvents.length - 3} more</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Date detail panel */}
      {selectedDate && (
        <div style={{ borderTop: '1px solid #1e293b', background: '#161b22', padding: 16, maxHeight: 220, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{selectedDate}</h4>
            <button
              onClick={() => { setShowAddModal(true); setNewDate(selectedDate) }}
              style={{ background: 'rgba(126,217,87,0.15)', color: '#7ed957', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >+ Add</button>
          </div>
          {dateDetail.length === 0 ? (
            <div style={{ color: '#3d4654', fontSize: 12 }}>No events.</div>
          ) : dateDetail.map(ev => (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: TYPE_COLORS[ev.type] }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.summary}</div>
                <div style={{ fontSize: 11, color: '#8b95a5' }}>
                  {ev.startTime} - {ev.endTime} {ev.description ? ` | ${ev.description}` : ''}
                </div>
              </div>
              <button onClick={() => onDeleteEvent(ev.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>x</button>
            </div>
          ))}
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#161b22', border: '1px solid #1e293b', borderRadius: 14, padding: 24, width: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>New Event</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#8b95a5', cursor: 'pointer', fontSize: 18 }}>x</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8b95a5', marginBottom: 4 }}>Event Name</label>
              <input value={newSummary} onChange={e => setNewSummary(e.target.value)} placeholder="Meeting with team" style={{ width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, color: '#f0f4f8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8b95a5', marginBottom: 4 }}>Date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ width: '100%', padding: '8px 8px', background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, color: '#f0f4f8', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8b95a5', marginBottom: 4 }}>Start</label>
                <input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} style={{ width: '100%', padding: '8px 8px', background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, color: '#f0f4f8', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8b95a5', marginBottom: 4 }}>End</label>
                <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} style={{ width: '100%', padding: '8px 8px', background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, color: '#f0f4f8', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8b95a5', marginBottom: 4 }}>Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['meeting', 'deadline', 'reminder', 'personal'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewType(t)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                      background: newType === t ? TYPE_COLORS[t] : 'rgba(255,255,255,0.05)',
                      color: newType === t ? '#fff' : '#8b95a5',
                    }}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8b95a5', marginBottom: 4 }}>Description (optional)</label>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Notes..." style={{ width: '100%', padding: '8px 12px', background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8, color: '#f0f4f8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#8b95a5', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              <button onClick={handleAdd} disabled={!newSummary.trim() || !newDate} style={{ padding: '8px 16px', background: newSummary.trim() && newDate ? '#7ed957' : '#1e293b', color: '#0d1117', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: newSummary.trim() && newDate ? 'pointer' : 'not-allowed' }}>Create Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
