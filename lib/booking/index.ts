import { crmGet, crmPostRaw } from '@/lib/crm'

/**
 * Booking, for a page that is not inside the CRM.
 *
 * A booking element on a published site has to work for a stranger on their
 * phone — no login, no session, no CRM access. So the page asks OUR server for
 * slots and OUR server holds the credentials. Two calls, both narrow: read the
 * free slots for one calendar, and create one appointment.
 *
 * WHY THIS IS NOT A CAPABILITY LEG. Everything an agency does TO a client
 * account goes through plan → approve → run. This is the opposite direction: a
 * customer booking their own appointment on a page the agency published. The
 * approval already happened when the agency put the element on the page, and
 * asking them to approve each booking would mean nobody could ever book.
 */

export interface Slot {
  /** ISO string as the CRM returns it. */
  start: string
}

async function json(res: Response): Promise<Record<string, unknown>> {
  const t = await res.text()
  try {
    return JSON.parse(t)
  } catch {
    return { _raw: t.slice(0, 200) }
  }
}

/** Calendars an agency can point a booking element at. */
export async function listCalendars(locationId: string) {
  const res = await crmGet('/calendars/', locationId)
  if (!res.ok) return { calendars: [], error: `Calendar list returned ${res.status}.` }
  const d = await json(res)
  const list = Array.isArray(d.calendars) ? (d.calendars as Record<string, unknown>[]) : []
  return {
    calendars: list.map((c) => ({
      id: String(c.id || ''),
      name: String(c.name || 'Calendar'),
      slotDuration: Number(c.slotDuration || 30),
    })),
  }
}

/**
 * Free slots for one calendar over a date range.
 *
 * The CRM answers grouped BY DATE rather than as a flat list, with metadata
 * mixed into the same object: `{ "2026-08-07": { slots: [...] }, "_dates_": …,
 * "traceId": … }`. Flattening it here means the element never has to know that,
 * and a new metadata key appearing does not become a rendering bug.
 */
export async function freeSlots(
  locationId: string,
  calendarId: string,
  startDate: Date,
  days = 14,
  timezone?: string,
): Promise<{ slots: Slot[]; error?: string }> {
  const start = startDate.getTime()
  const end = start + days * 24 * 60 * 60 * 1000
  const tz = timezone ? `&timezone=${encodeURIComponent(timezone)}` : ''
  const res = await crmGet(
    `/calendars/${calendarId}/free-slots?startDate=${start}&endDate=${end}${tz}`,
    locationId,
  )
  if (!res.ok) {
    const d = await json(res)
    return { slots: [], error: `${res.status}: ${d?.message || 'Could not read free slots.'}` }
  }
  const d = await json(res)

  const slots: Slot[] = []
  for (const [key, value] of Object.entries(d)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    const raw = (value as Record<string, unknown>)?.slots
    if (Array.isArray(raw)) for (const s of raw) slots.push({ start: String(s) })
  }
  return { slots: slots.sort((a, b) => (a.start < b.start ? -1 : 1)) }
}

export interface BookingInput {
  locationId: string
  calendarId: string
  startTime: string
  name: string
  email: string
  phone?: string
  notes?: string
  timezone?: string
}

export async function bookAppointment(i: BookingInput) {
  const body: Record<string, unknown> = {
    calendarId: i.calendarId,
    locationId: i.locationId,
    startTime: i.startTime,
    title: `Booking — ${i.name}`.slice(0, 120),
    appointmentStatus: 'confirmed',
    // A booking with no contact is an appointment nobody can follow up on.
    contact: {
      name: i.name,
      email: i.email,
      ...(i.phone ? { phone: i.phone } : {}),
    },
    ...(i.timezone ? { timezone: i.timezone } : {}),
    ...(i.notes ? { notes: i.notes.slice(0, 500) } : {}),
  }

  const res = await crmPostRaw('/calendars/events/appointments', i.locationId, body)
  const d = await json(res)
  if (!res.ok) {
    return { ok: false as const, error: `${res.status}: ${d?.message || d?._raw || 'Booking rejected.'}` }
  }
  return {
    ok: true as const,
    appointmentId: String(d.id || d.appointmentId || ''),
    startTime: i.startTime,
  }
}
