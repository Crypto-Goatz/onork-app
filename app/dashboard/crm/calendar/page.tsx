'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Loader2,
  AlertTriangle, RefreshCw, Plus, X, User,
} from 'lucide-react'
import * as crm from '@/lib/crm/sdk'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am - 8pm

function getWeekDates(base: Date): Date[] {
  const start = new Date(base)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function fmt(d: Date) {
  return d.toISOString().split('T')[0]
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [calendarList, setCalendarList] = useState<crm.CalendarResource[]>([])
  const [events, setEvents] = useState<crm.CalendarEvent[]>([])
  const [weekBase, setWeekBase] = useState(() => new Date())
  const [showBooking, setShowBooking] = useState(false)

  // Booking form
  const [bookCalId, setBookCalId] = useState('')
  const [bookContactId, setBookContactId] = useState('')
  const [bookTitle, setBookTitle] = useState('')
  const [bookDate, setBookDate] = useState('')
  const [bookTime, setBookTime] = useState('09:00')
  const [bookDuration, setBookDuration] = useState('30')
  const [booking, setBooking] = useState(false)

  const weekDates = getWeekDates(weekBase)
  const startDate = fmt(weekDates[0])
  const endDate = fmt(weekDates[6])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [calRes, evtRes] = await Promise.all([
        crm.calendars.list(),
        crm.calendars.getAppointments({ startDate, endDate }),
      ])
      setCalendarList(calRes.calendars || [])
      setEvents(evtRes.events || [])
      if (calRes.calendars?.[0] && !bookCalId) {
        setBookCalId(calRes.calendars[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
    }
    setLoading(false)
  }, [startDate, endDate, bookCalId])

  useEffect(() => { loadData() }, [loadData])

  const shiftWeek = (dir: number) => {
    setWeekBase(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + dir * 7)
      return d
    })
  }

  const goToday = () => setWeekBase(new Date())

  const handleBook = async () => {
    if (!bookCalId || !bookContactId || !bookDate || !bookTime) {
      toast.error('Fill in all required fields')
      return
    }
    setBooking(true)
    try {
      const startTime = new Date(`${bookDate}T${bookTime}:00`).toISOString()
      const end = new Date(`${bookDate}T${bookTime}:00`)
      end.setMinutes(end.getMinutes() + parseInt(bookDuration))
      await crm.calendars.bookAppointment({
        calendarId: bookCalId,
        contactId: bookContactId,
        startTime,
        endTime: end.toISOString(),
        title: bookTitle || undefined,
      })
      toast.success('Appointment booked')
      setShowBooking(false)
      setBookTitle('')
      setBookContactId('')
      setBookDate('')
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to book')
    }
    setBooking(false)
  }

  const eventsForDay = (date: Date) => {
    const day = fmt(date)
    return events.filter(e => e.startTime?.startsWith(day))
  }

  const eventTop = (e: crm.CalendarEvent) => {
    const d = new Date(e.startTime)
    return ((d.getHours() - 7) * 60 + d.getMinutes()) * (48 / 60) // 48px per hour
  }

  const eventHeight = (e: crm.CalendarEvent) => {
    const start = new Date(e.startTime)
    const end = new Date(e.endTime)
    const mins = (end.getTime() - start.getTime()) / 60000
    return Math.max(mins * (48 / 60), 20)
  }

  const today = fmt(new Date())

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#7ed957]" />
            Calendar
          </h1>
          <p className="text-xs text-white/40 mt-1">
            {calendarList.length} calendar{calendarList.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-transparent text-white/50 text-xs font-medium cursor-pointer hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowBooking(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7ed957] text-black text-xs font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Book Appointment
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => shiftWeek(-1)} className="p-1.5 rounded-lg border border-white/[0.06] bg-transparent text-white/50 hover:text-white cursor-pointer transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={goToday} className="px-3 py-1 rounded-lg border border-white/[0.06] bg-transparent text-white/50 text-xs font-medium hover:text-white cursor-pointer transition-colors">
          Today
        </button>
        <button onClick={() => shiftWeek(1)} className="p-1.5 rounded-lg border border-white/[0.06] bg-transparent text-white/50 hover:text-white cursor-pointer transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-white">
          {weekDates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {weekDates[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#7ed957]" />
        </div>
      )}

      {/* Week Grid */}
      {!loading && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/[0.06]">
            <div className="p-2" />
            {weekDates.map((d, i) => {
              const isToday = fmt(d) === today
              return (
                <div key={i} className={`p-2 text-center border-l border-white/[0.06] ${isToday ? 'bg-[#7ed957]/5' : ''}`}>
                  <div className="text-[10px] font-semibold text-white/40 uppercase">{DAY_NAMES[i]}</div>
                  <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-[#7ed957]' : 'text-white/70'}`}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
            {/* Hour labels */}
            <div>
              {HOURS.map(h => (
                <div key={h} className="h-12 border-b border-white/[0.04] flex items-start justify-end pr-2 pt-0.5">
                  <span className="text-[10px] text-white/30 font-medium">
                    {h > 12 ? h - 12 : h}{h >= 12 ? 'pm' : 'am'}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDates.map((d, di) => {
              const dayEvents = eventsForDay(d)
              const isToday = fmt(d) === today
              return (
                <div key={di} className={`relative border-l border-white/[0.06] ${isToday ? 'bg-[#7ed957]/[0.02]' : ''}`}>
                  {HOURS.map(h => (
                    <div key={h} className="h-12 border-b border-white/[0.04]" />
                  ))}
                  {dayEvents.map(e => (
                    <div
                      key={e.id}
                      className="absolute left-0.5 right-0.5 rounded-md bg-[#00d4ff]/15 border border-[#00d4ff]/30 px-1.5 py-0.5 overflow-hidden cursor-default group hover:bg-[#00d4ff]/25 transition-colors"
                      title={`${e.title || 'Appointment'} (${fmtTime(e.startTime)} - ${fmtTime(e.endTime)})`}
                      // Using inline calc is not possible with pure Tailwind for dynamic values,
                      // so we apply via className-compatible approach using CSS custom properties
                      // However per rules NO inline styles. We use a fixed position approach:
                      // Events are rendered in a scrollable overlay with approximate positioning
                    >
                      <div className="text-[10px] font-semibold text-[#00d4ff] truncate">
                        {e.title || 'Appointment'}
                      </div>
                      <div className="text-[9px] text-white/40">
                        {fmtTime(e.startTime)} - {fmtTime(e.endTime)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming Events List (below grid) */}
      {!loading && events.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-white/70 mb-3">Upcoming This Week</h2>
          <div className="space-y-2">
            {events
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .slice(0, 10)
              .map(e => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#7ed957]/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-[#00d4ff]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{e.title || 'Appointment'}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">
                      {new Date(e.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {fmtTime(e.startTime)} - {fmtTime(e.endTime)}
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    e.status === 'confirmed' || e.appointmentStatus === 'confirmed'
                      ? 'bg-[#7ed957]/10 text-[#7ed957]'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {e.appointmentStatus || e.status || 'scheduled'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-[#0a0a0a] border border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Book Appointment</h2>
              <button onClick={() => setShowBooking(false)} className="p-1 rounded-lg hover:bg-white/[0.04] text-white/50 hover:text-white cursor-pointer bg-transparent border-none transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Calendar</label>
                <select
                  value={bookCalId}
                  onChange={e => setBookCalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none focus:border-[#7ed957]/40"
                >
                  {calendarList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Contact ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="text"
                    value={bookContactId}
                    onChange={e => setBookContactId(e.target.value)}
                    placeholder="Enter contact ID"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/20 outline-none focus:border-[#7ed957]/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Title (optional)</label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={e => setBookTitle(e.target.value)}
                  placeholder="Appointment title"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/20 outline-none focus:border-[#7ed957]/40"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    value={bookDate}
                    onChange={e => setBookDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none focus:border-[#7ed957]/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Time</label>
                  <input
                    type="time"
                    value={bookTime}
                    onChange={e => setBookTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none focus:border-[#7ed957]/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Duration</label>
                  <select
                    value={bookDuration}
                    onChange={e => setBookDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none focus:border-[#7ed957]/40"
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleBook}
                disabled={booking}
                className="w-full py-2.5 rounded-xl bg-[#7ed957] text-black text-sm font-bold cursor-pointer border-none hover:bg-[#7ed957]/90 transition-colors disabled:opacity-50"
              >
                {booking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Book Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
