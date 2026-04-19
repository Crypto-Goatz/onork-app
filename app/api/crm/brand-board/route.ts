import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet, crmPut } from '@/lib/crm'

/**
 * Brand Board API — CRM Brand Kit sync
 * GET  /api/crm/brand-board — get brand kit from CRM
 * PUT  (via POST)           — update brand kit in CRM
 */

async function resolveLocation(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', userId)
    .single()
  return profile?.crm_location_id || process.env.CRM_LOCATION_ID || ''
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locationId = await resolveLocation(supabase, user.id)
  if (!locationId) return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })

  try {
    const res = await crmGet('/brand-boards/design-kit', locationId)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ brandKit: data, locationId })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locationId = await resolveLocation(supabase, user.id)
  if (!locationId) return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })

  try {
    const body = await request.json()
    const { colors, fonts, logos, name } = body

    const brandKit: Record<string, unknown> = { locationId }
    if (colors) brandKit.colors = colors
    if (fonts) brandKit.fonts = fonts
    if (logos) brandKit.logos = logos
    if (name) brandKit.name = name

    const res = await crmPut('/brand-boards/design-kit', locationId, brandKit)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ brandKit: data, synced: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}
