import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

async function crmFetch(path: string) {
  const res = await fetch(`${CRM_API}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.CRM_PIT}`,
      'Content-Type': 'application/json',
      Version: CRM_VERSION,
    },
  })
  return res
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pit = process.env.CRM_PIT

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || process.env.CRM_LOCATION_ID
  if (!pit || !locationId) {
    return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)

    // Get date range from params, default to current month
    const now = new Date()
    const startTime = searchParams.get('startTime') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endTime = searchParams.get('endTime') || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    // Fetch calendars
    const calendarsRes = await crmFetch(`/calendars/?locationId=${locationId}`)
    let calendars: unknown[] = []
    if (calendarsRes.ok) {
      const calendarsData = await calendarsRes.json()
      calendars = calendarsData.calendars || []
    }

    // Fetch events for the date range
    const eventsRes = await crmFetch(
      `/calendars/events?locationId=${locationId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
    )
    let events: unknown[] = []
    if (eventsRes.ok) {
      const eventsData = await eventsRes.json()
      events = eventsData.events || []
    }

    return NextResponse.json({ calendars, events })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CRM request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
