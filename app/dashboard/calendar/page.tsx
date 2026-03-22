'use client'

import { useState } from 'react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface CalendarEvent {
  day: number
  label: string
  color: 'green' | 'cyan' | 'purple'
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPage() {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1)
  const today = now.getDate()
  const isCurrentMonth = now.getMonth() === currentMonth && now.getFullYear() === currentYear

  // Sample events
  const allEvents: CalendarEvent[] = [
    { day: today, label: 'Team standup', color: 'green' },
    { day: today + 2, label: 'Client call', color: 'cyan' },
    { day: today + 5, label: 'Deploy v2.6', color: 'purple' },
    { day: today - 3, label: 'Sprint review', color: 'green' },
    { day: today + 7, label: 'Billing cycle', color: 'cyan' },
  ]
  const events = allEvents.filter((e) => e.day > 0 && e.day <= daysInMonth)

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
          <p className="jp-page-subtitle">Manage your schedule and upcoming events</p>
        </div>
        <button className="jp-btn jp-btn-primary">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Event
        </button>
      </div>

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
          <button className="jp-btn-outline" onClick={() => { setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()); }}>
            Today
          </button>
        </div>

        <div className="jp-card-body" style={{ padding: 0 }}>
          <div className="jp-calendar-grid">
            {/* Day headers */}
            {DAYS.map((d) => (
              <div key={d} className="jp-calendar-header-cell">{d}</div>
            ))}

            {/* Day cells */}
            {cells.map((cell, i) => {
              const cellEvents = cell.dimmed ? [] : events.filter((e) => e.day === cell.day)
              return (
                <div
                  key={i}
                  className={`jp-calendar-cell ${cell.isToday ? 'today' : ''} ${cell.dimmed ? 'dimmed' : ''}`}
                >
                  <div className="jp-calendar-day">{cell.day}</div>
                  {cellEvents.map((ev, ei) => (
                    <div key={ei} className={`jp-calendar-event ${ev.color}`}>
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
          {events
            .filter((e) => e.day >= today)
            .sort((a, b) => a.day - b.day)
            .map((ev, i) => (
              <li key={i} className="jp-activity-item">
                <span className={`jp-activity-dot ${ev.color}`} />
                <div className="jp-activity-content">
                  <div className="jp-activity-text">{ev.label}</div>
                  <div className="jp-activity-meta">
                    {MONTHS[currentMonth]} {ev.day}, {currentYear}
                  </div>
                </div>
                <span className="jp-activity-time">
                  {ev.day === today ? 'Today' : `In ${ev.day - today}d`}
                </span>
              </li>
            ))}
          {events.filter((e) => e.day >= today).length === 0 && (
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
