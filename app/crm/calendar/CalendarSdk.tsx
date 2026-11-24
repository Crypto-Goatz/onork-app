'use client'

/** Calendar — the account's calendars, what is booked on them, and book a new appointment. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'
import Workspace, { Btn, Card, ContactPicker, Field, Modal, Notice, errText, inputCls } from '../sdk/Workspace'
import { sdk, type CalendarEvent, type CalendarResource } from '@/lib/crm/sdk'

const DAY = 86_400_000
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)

function Body({ openNew, setOpenNew }: { openNew: boolean; setOpenNew: (v: boolean) => void }) {
  const [cals, setCals] = useState<CalendarResource[] | null>(null)
  const [cal, setCal] = useState('')
  const [from, setFrom] = useState(() => startOfDay(new Date()))
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [err, setErr] = useState('')
  const [form, setForm] = useState<{ calendarId: string; title: string; when: string; minutes: number; contact: { id: string; label: string } | null } | null>(null)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const to = useMemo(() => new Date(from.getTime() + 14 * DAY), [from])

  useEffect(() => {
    sdk.calendars().then((d) => { const l = d.calendars || []; setCals(l); setCal(l[0]?.id || '') }).catch((e) => { setErr(errText(e)); setCals([]) })
  }, [])

  const load = useCallback(async () => {
    if (!cal) return
    setEvents(null); setErr('')
    try {
      const d = await sdk.events(cal, from, to)
      setEvents((d.events || []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime)))
    } catch (e) { setErr(errText(e)); setEvents([]) }
  }, [cal, from, to])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!openNew) return
    const t = new Date(Date.now() + DAY); t.setHours(10, 0, 0, 0)
    setForm({ calendarId: cal, title: '', when: toLocalInput(t), minutes: 30, contact: null }); setMsg(''); setOpenNew(false)
  }, [openNew, setOpenNew, cal])

  const save = async () => {
    if (!form) return
    if (!form.calendarId) { setMsg('Pick a calendar.'); return }
    if (!form.contact) { setMsg('Pick who the appointment is with.'); return }
    setSaving(true); setMsg('')
    const start = new Date(form.when)
    const end = new Date(start.getTime() + form.minutes * 60_000)
    try {
      await sdk.bookAppointment({ calendarId: form.calendarId, contactId: form.contact.id, startTime: start.toISOString(), endTime: end.toISOString(), ...(form.title.trim() ? { title: form.title.trim() } : {}) })
      setForm(null); if (form.calendarId !== cal) setCal(form.calendarId); else await load()
    } catch (e) { setMsg(errText(e)) }
    setSaving(false)
  }

  // Group by day for a readable agenda.
  const days = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>()
    for (const e of events || []) {
      const k = new Date(e.startTime).toDateString()
      m.set(k, [...(m.get(k) || []), e])
    }
    return [...m.entries()]
  }, [events])

  if (cals && cals.length === 0) return (
    <Notice>{err || 'This CRM account has no calendars yet. Create one in the CRM under Calendars, then it shows up here.'}</Notice>
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={cal} onChange={(e) => setCal(e.target.value)} className="rounded-lg border border-[color:var(--oc-border)] bg-white px-2.5 py-1.5 text-[13px] text-[color:var(--oc-ink)]">
          {(cals || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <button aria-label="Earlier" onClick={() => setFrom(new Date(from.getTime() - 14 * DAY))} className="rounded-full p-1.5 hover:bg-[color:var(--oc-hover)]"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-[13px] text-[color:var(--oc-text)]">{from.toLocaleDateString([], { month: 'short', day: 'numeric' })} – {new Date(to.getTime() - DAY).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          <button aria-label="Later" onClick={() => setFrom(new Date(from.getTime() + 14 * DAY))} className="rounded-full p-1.5 hover:bg-[color:var(--oc-hover)]"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      {err && <div className="mb-4"><Notice tone="red">{err}</Notice></div>}
      <Card>
        {!events ? (
          <div className="flex items-center gap-2 p-5 text-[13px] text-[color:var(--oc-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading appointments…</div>
        ) : days.length === 0 ? (
          <div className="p-5 text-[13px] text-[color:var(--oc-muted)]">Nothing booked in these two weeks.</div>
        ) : days.map(([day, list]) => (
          <div key={day} className="border-b border-[color:var(--oc-border)] px-4 py-3 last:border-0">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--oc-faint)]">{new Date(day).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</div>
            {list.map((e) => (
              <div key={e.id} className="flex items-baseline gap-3 py-1 text-[13.5px]">
                <span className="w-32 shrink-0 font-mono text-[12.5px] text-[color:var(--oc-muted)]">
                  {new Date(e.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}–{new Date(e.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-[color:var(--oc-ink)]">{e.title || 'Appointment'}</span>
                <span className="shrink-0 text-[12px] text-[color:var(--oc-muted)]">{e.appointmentStatus || e.status}</span>
              </div>
            ))}
          </div>
        ))}
      </Card>

      {form && (
        <Modal title="Book an appointment" onClose={() => setForm(null)}>
          <div className="space-y-3">
            <Field label="Calendar">
              <select className={inputCls} value={form.calendarId} onChange={(e) => setForm({ ...form, calendarId: e.target.value })}>
                {(cals || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="With"><ContactPicker value={form.contact} onChange={(c) => setForm({ ...form, contact: c })} /></Field>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label="Starts"><input className={inputCls} type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} /></Field>
              <Field label="Length">
                <select className={inputCls} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}>
                  {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </Field>
            </div>
            <Field label="Title (optional)"><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          </div>
          {msg && <div className="mt-3"><Notice tone="red">{msg}</Notice></div>}
          <div className="mt-5 flex justify-end gap-2">
            <Btn kind="ghost" onClick={() => setForm(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Book it</Btn>
          </div>
        </Modal>
      )}
    </>
  )
}

export default function CalendarSdk() {
  const [openNew, setOpenNew] = useState(false)
  return (
    <Workspace nav="calendar" title="Calendar" blurb="What is booked on your CRM calendars, and book a new appointment in seconds."
      actions={<Btn onClick={() => setOpenNew(true)}><Plus className="h-3.5 w-3.5" /> Book appointment</Btn>}>
      {() => <Body openNew={openNew} setOpenNew={setOpenNew} />}
    </Workspace>
  )
}
