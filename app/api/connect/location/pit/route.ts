/**
 * GET /api/connect/location/pit?locationId=… — hand back one client's key, once,
 * for a copy button.
 *
 * WHY THIS IS NOT ON THE LIST ENDPOINT. A key that ships with every page load
 * ends up in screenshots, in a shared screen, and in whatever logs the browser
 * or an extension keeps. Fetching it only when someone presses Copy means the
 * value crosses the wire on a deliberate act, and never renders.
 *
 * It is the agency's OWN credential, so returning it to them is right — but it
 * is scoped hard: the row must belong to the agency this signed-in user owns.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const locationId = req.nextUrl.searchParams.get('locationId') || ''
  if (!locationId) return NextResponse.json({ error: 'Which account?' }, { status: 400 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage is not configured.' }, { status: 500 })

  const { data: agency } = await db
    .from('agency_connections')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!agency) return NextResponse.json({ error: 'No agency connection.' }, { status: 403 })

  // Scoped to THIS agency's company_id — a valid location id belonging to
  // someone else must not return their key.
  const { data: conn } = await db
    .from('location_connections')
    .select('location_pit')
    .eq('company_id', agency.company_id)
    .eq('location_id', locationId)
    .eq('status', 'active')
    .maybeSingle()

  if (!conn?.location_pit) {
    return NextResponse.json({ error: 'No key stored for that account.' }, { status: 404 })
  }

  return NextResponse.json({ pit: conn.location_pit })
}
