import { NextResponse } from 'next/server'
import { bookAppointment } from '@/lib/booking'

/**
 * Create an appointment from a published page.
 *
 * WRITES, so it is narrow by construction rather than by token: it can only
 * create one appointment on the calendar named in the request, with the contact
 * details given. There is no path here to read, list, or modify anything.
 *
 * Not behind the approval gate — see lib/booking. This is a customer booking
 * their own slot, not an agency acting on a client account.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400, headers: CORS })
  }

  const locationId = str(body.locationId, 60)
  const calendarId = str(body.calendarId, 60)
  const startTime = str(body.startTime, 40)
  const name = str(body.name, 80)
  const email = str(body.email, 160)

  const missing = Object.entries({ locationId, calendarId, startTime, name, email })
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length) {
    // Name the fields. "Invalid request" makes someone guess at their own form.
    return NextResponse.json({ error: `Missing: ${missing.join(', ')}.` }, { status: 400, headers: CORS })
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400, headers: CORS })
  }

  const result = await bookAppointment({
    locationId, calendarId, startTime, name, email,
    phone: str(body.phone, 40) || undefined,
    notes: str(body.notes, 500) || undefined,
    timezone: str(body.timezone, 60) || undefined,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502, headers: CORS })
  }
  return NextResponse.json(result, { headers: CORS })
}
