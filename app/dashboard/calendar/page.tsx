'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface CalendarEvent {
  day: number
  label: string
  color: 'green' | 'cyan' | 'purple'
  id?: string
  time?: string
  calendarName?: string
}

const fallbackEvents: CalendarEvent[] = []

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const EVENT_COLORS: Array<'green' | 'cyan' | 'purple'> = ['green', 'cyan', 'purple']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCrmEvents(crmEvents: any[]): CalendarEvent[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return crmEvents.map((ev: any, idx: number) => {
    const startDate = ev.startTime || ev.start || ev.appointmentStartTime
    const date = startDate ? new Date(startDate) : new Date()
    const title = ev.title || ev.name || ev.appointmentTitle || 'Appointment'
    return {
      day: date.getDate(),
      label: title,
      color: EVENT_COLORS[idx % EVENT_COLORS.length],
      id: ev.id,
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      calendarName: ev.calendarName || ev.calendar?.name,
    }
  })
}

export default function CalendarPage() {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [events, setEvents] = useState<CalendarEvent[]>(fallbackEvents)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1)
  const today = now.getDate()
  const isCurrentMonth = now.getMonth() === currentMonth && now.getFullYear() === currentYear

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const startTime = new Date(currentYear, currentMonth, 1).toISOString()
      const endTime = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString()
      const res = await fetch(`/api/crm/calendar?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch calendar')
      const mapped = mapCrmEvents(data.events || [])
      if (mapped.length > 0) {
        setEvents(mapped)
      } else if (isCurrentMonth) {
        setEvents(fallbackEvents)
      } else {
        setEvents([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
      if (isCurrentMonth) setEvents(fallbackEvents)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, currentYear, isCurrentMonth])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const displayEvents = events.filter((e) => e.day > 0 && e.day <= daysInMonth)

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  const cells: { day: number; dimmed: boolean; isToday: boolean }[] = []
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, dimmed: true, isToday: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dimmed: false, isToday: isCurrentMonth && d === today })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, dimmed: true, isToday: false })
  }

  const eventDotClass: Record<'green' | 'cyan' | 'purple', string> = {
    green: 'bg-core-green',
    cyan: 'bg-core-cyan',
    purple: 'bg-core-purple',
  }
  const eventBadgeClass: Record<'green' | 'cyan' | 'purple', string> = {
    green: 'jp-calendar-event green',
    cyan: 'jp-calendar-event cyan',
    purple: 'jp-calendar-event purple',
  }

  return (
    <div>
      {/* Page header */}
      <div className="jp-page-header flex items-center justify-between">
        <div>
          <h1 className="jp-page-title">Calendar</h1>
          <p className="jp-page-subtitle">
            {loading ? 'Loading events...' : error ? 'No events scheduled' : 'Manage your schedule and upcoming events'}
          </p>
        </div>
        <button className="jp-btn jp-btn-primary flex items-center gap-2">
          <Plus className="size-4" />
          New Event
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-3.5 py-2 rounded-lg bg-core-red/[0.08] border border-core-red/20 text-[0.8125rem] text-core-red flex justify-between items-center">
          <span>{error}</span>
          <button onClick={fetchEvents} className="bg-transparent border-0 text-core-cyan cursor-pointer text-[0.8125rem] font-semibold">
            Retry
          </button>
        </div>
      )}

      <div className="jp-card">
        {/* Calendar header */}
        <div className="jp-card-header">
          <div className="flex items-center gap-4">
            <button className="jp-header-btn" onClick={prevMonth}>
              <ChevronLeft className="size-4" />
            </button>
            <h6 className="min-w-[180px] text-center">
              {MONTHS[currentMonth]} {currentYear}
            </h6>
            <button className="jp-header-btn" onClick={nextMonth}>
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="flex gap-2 items-center">
            {loading && (
              <div className="size-4 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
            )}
            <button
              className="jp-btn-outline"
              onClick={() => { setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()) }}
            >
              Today
            </button>
          </div>
        </div>

        <div className="jp-card-body p-0">
          <div className="jp-calendar-grid">
            {/* Day headers */}
            {DAYS.map((d) => (
              <div key={d} className="jp-calendar-header-cell">{d}</div>
            ))}

            {/* Day cells */}
            {cells.map((cell, i) => {
              const cellEvents = cell.dimmed ? [] : displayEvents.filter((e) => e.day === cell.day)
              return (
                <div
                  key={i}
                  className={`jp-calendar-cell${cell.isToday ? ' today' : ''}${cell.dimmed ? ' dimmed' : ''}`}
                >
                  <div className="jp-calendar-day">{cell.day}</div>
                  {cellEvents.map((ev, ei) => (
                    <div
                      key={ei}
                      className={eventBadgeClass[ev.color]}
                      title={ev.time ? `${ev.time} — ${ev.label}` : ev.label}
                    >
                      {ev.label}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Upcoming events */}
      <div className="jp-card mt-4">
        <div className="jp-card-header">
          <h6>Upcoming Events</h6>
        </div>
        <ul className="jp-activity-list">
          {displayEvents
            .filter((e) => isCurrentMonth ? e.day >= today : true)
            .sort((a, b) => a.day - b.day)
            .map((ev, i) => (
              <li key={i} className="jp-activity-item">
                <span className={`jp-activity-dot ${eventDotClass[ev.color]}`} />
                <div className="jp-activity-content">
                  <div className="jp-activity-text">{ev.label}</div>
                  <div className="jp-activity-meta">
                    {MONTHS[currentMonth]} {ev.day}, {currentYear}
                    {ev.time ? ` at ${ev.time}` : ''}
                    {ev.calendarName ? ` — ${ev.calendarName}` : ''}
                  </div>
                </div>
                <span className="jp-activity-time">
                  {isCurrentMonth && ev.day === today
                    ? 'Today'
                    : isCurrentMonth && ev.day > today
                    ? `In ${ev.day - today}d`
                    : `${MONTHS[currentMonth].substring(0, 3)} ${ev.day}`}
                </span>
              </li>
            ))}
          {displayEvents.filter((e) => isCurrentMonth ? e.day >= today : true).length === 0 && (
            <div className="jp-empty-state">
              <div className="jp-empty-state-icon">
                <CalendarDays className="size-6" />
              </div>
              <div className="jp-empty-state-title">No upcoming events</div>
              <div className="jp-empty-state-text">Create an event to get started</div>
            </div>
          )}
        </ul>
      </div>
    </div>
  )
}
