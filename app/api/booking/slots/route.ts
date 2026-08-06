import { NextResponse } from 'next/server'
import { freeSlots, listCalendars } from '@/lib/booking'

/**
 * Free slots for a published booking element.
 *
 * PUBLIC AND CORS-OPEN, deliberately — a booking element runs on the agency's
 * own domain, wherever they host it, so an origin allow-list would break the
 * feature the moment a client points a new domain at their page.
 *
 * Safe because it is READ-ONLY and returns nothing private: availability is
 * what the business publishes anyway. The calendarId is the only key, and
 * knowing one lets you see the same times a visitor would.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const locationId = q.get('locationId') || ''
  const calendarId = q.get('calendarId') || ''
  const timezone = q.get('timezone') || undefined
  const days = Math.min(30, Math.max(1, Number(q.get('days') || 14)))

  if (!locationId) {
    return NextResponse.json({ error: 'locationId is required.' }, { status: 400, headers: CORS })
  }

  // No calendarId: list what is available so the builder can offer a picker.
  if (!calendarId) {
    const { calendars, error } = await listCalendars(locationId)
    return NextResponse.json({ calendars, error }, { headers: CORS })
  }

  const { slots, error } = await freeSlots(locationId, calendarId, new Date(), days, timezone)
  return NextResponse.json({ slots, error, days }, { headers: CORS })
}
