import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet, crmPost, crmPut, crmDelete } from '@/lib/crm'

export const dynamic = 'force-dynamic'

async function getLocationId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || process.env.CRM_LOCATION_ID
  if (!locationId) return { error: 'CRM not configured', status: 500 }
  return { locationId }
}

export async function GET(request: NextRequest) {
  const loc = await getLocationId()
  if ('error' in loc) return NextResponse.json({ error: loc.error }, { status: loc.status })

  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '50'

    const res = await crmGet(`/funnels/redirect?locationId=${loc.locationId}&limit=${limit}`, loc.locationId)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ redirects: data.redirects || data.data || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const loc = await getLocationId()
  if ('error' in loc) return NextResponse.json({ error: loc.error }, { status: loc.status })

  try {
    const body = await request.json()
    const { source, target, type } = body

    if (!source || !target) {
      return NextResponse.json({ error: 'source and target are required' }, { status: 400 })
    }

    const res = await crmPost('/funnels/redirect', loc.locationId, {
      locationId: loc.locationId,
      source,
      target,
      type: type || '301',
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, redirect: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}

export async function PUT(request: NextRequest) {
  const loc = await getLocationId()
  if ('error' in loc) return NextResponse.json({ error: loc.error }, { status: loc.status })

  try {
    const body = await request.json()
    const { id, source, target, type, status } = body

    if (!id) {
      return NextResponse.json({ error: 'redirect id is required' }, { status: 400 })
    }

    const payload: Record<string, unknown> = { locationId: loc.locationId }
    if (source) payload.source = source
    if (target) payload.target = target
    if (type) payload.type = type
    if (status) payload.status = status

    const res = await crmPut(`/funnels/redirect/${id}`, loc.locationId, payload)

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, redirect: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}

export async function DELETE(request: NextRequest) {
  const loc = await getLocationId()
  if ('error' in loc) return NextResponse.json({ error: loc.error }, { status: loc.status })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'redirect id is required' }, { status: 400 })
    }

    const res = await crmDelete(`/funnels/redirect/${id}?locationId=${loc.locationId}`, loc.locationId)

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}
