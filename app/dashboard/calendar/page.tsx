'use client'

import { useState, useEffect, useCallback } from 'react'

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

const fallbackEvents: CalendarEvent[] = [
  { day: 22, label: 'Team standup', color: 'green' },
  { day: 24, label: 'Client call', color: 'cyan' },
  { day: 27, label: 'Deploy v2.6', color: 'purple' },
  { day: 19, label: 'Sprint review', color: 'green' },
  { day: 29, label: 'Billing cycle', color: 'cyan' },
]

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
        // Keep fallback events for current month if CRM returns empty
        setEvents(fallbackEvents)
      } else {
        setEvents([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
      if (isCurrentMonth) {
        setEvents(fallbackEvents)
      }
    } finally {
      setLoading(false)
    }
  }, [currentMonth, currentYear, isCurrentMonth])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const displayEvents = events.filter((e) => e.day > 0 && e.day <= daysInMonth)

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Build calendar grid
  const cells: { day: number; dimmed: boolean; isToday: boolean }[] = []

  // Previous month overflow
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, dimmed: true, isToday: false })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dimmed: false, isToday: isCurrentMonth && d === today })
  }

  // Next month overflow
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, dimmed: true, isToday: false })
  }

  return (
    <div>
      <div className="jp-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="jp-page-title">Calendar</h1>
          <p className="jp-page-subtitle">
            {loading ? 'Loading events...' : error ? 'Using sample data' : 'Manage your schedule and upcoming events'}
          </p>
        </div>
        <button className="jp-btn jp-btn-primary">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Event
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '8px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', fontSize: '0.8125rem', color: 'var(--jp-red)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={fetchEvents} style={{ background: 'none', border: 'none', color: 'var(--jp-cyan)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      <div className="jp-card">
        {/* Calendar Header */}
        <div className="jp-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="jp-header-btn" onClick={prevMonth}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h6 style={{ minWidth: 180, textAlign: 'center' }}>
              {MONTHS[currentMonth]} {currentYear}
            </h6>
            <button className="jp-header-btn" onClick={nextMonth}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {loading && (
              <div style={{ width: 16, height: 16, border: '2px solid var(--jp-green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            )}
            <button className="jp-btn-outline" onClick={() => { setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()); }}>
              Today
            </button>
          </div>
        </div>

        <div className="jp-card-body" style={{ padding: 0 }}>
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
                  className={`jp-calendar-cell ${cell.isToday ? 'today' : ''} ${cell.dimmed ? 'dimmed' : ''}`}
                >
                  <div className="jp-calendar-day">{cell.day}</div>
                  {cellEvents.map((ev, ei) => (
                    <div key={ei} className={`jp-calendar-event ${ev.color}`} title={ev.time ? `${ev.time} — ${ev.label}` : ev.label}>
                      {ev.label}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="jp-card" style={{ marginTop: 16 }}>
        <div className="jp-card-header">
          <h6>Upcoming Events</h6>
        </div>
        <ul className="jp-activity-list">
          {displayEvents
            .filter((e) => isCurrentMonth ? e.day >= today : true)
            .sort((a, b) => a.day - b.day)
            .map((ev, i) => (
              <li key={i} className="jp-activity-item">
                <span className={`jp-activity-dot ${ev.color}`} />
                <div className="jp-activity-content">
                  <div className="jp-activity-text">{ev.label}</div>
                  <div className="jp-activity-meta">
                    {MONTHS[currentMonth]} {ev.day}, {currentYear}
                    {ev.time ? ` at ${ev.time}` : ''}
                    {ev.calendarName ? ` — ${ev.calendarName}` : ''}
                  </div>
                </div>
                <span className="jp-activity-time">
                  {isCurrentMonth && ev.day === today ? 'Today' : isCurrentMonth && ev.day > today ? `In ${ev.day - today}d` : `${MONTHS[currentMonth].substring(0, 3)} ${ev.day}`}
                </span>
              </li>
            ))}
          {displayEvents.filter((e) => isCurrentMonth ? e.day >= today : true).length === 0 && (
            <div className="jp-empty-state">
              <div className="jp-empty-state-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
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
