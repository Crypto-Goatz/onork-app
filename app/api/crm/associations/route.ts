import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet, crmPost } from '@/lib/crm'

/**
 * Associations/Relations API — CRM object linking
 * GET  /api/crm/associations                           — list associations
 * GET  /api/crm/associations?type=relations             — list relations
 * POST /api/crm/associations { action: 'associate' }    — create association
 * POST /api/crm/associations { action: 'relate' }       — create relation
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
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'relations') {
      const res = await crmGet('/associations/relation', locationId)
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ relations: data.relations || data || [], locationId })
    }

    const res = await crmGet('/associations', locationId)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ associations: data.associations || data || [], locationId })
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
    const action = body.action || 'associate'

    if (action === 'relate') {
      const { sourceObjectId, targetObjectId, relationType } = body
      if (!sourceObjectId || !targetObjectId) {
        return NextResponse.json({ error: 'sourceObjectId and targetObjectId required' }, { status: 400 })
      }

      const res = await crmPost('/associations/relation', locationId, {
        sourceObjectId,
        targetObjectId,
        relationType: relationType || 'related',
      })
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ relation: data, created: true })
    }

    // Create association
    const { sourceObjectId, targetObjectId, associationType } = body
    if (!sourceObjectId || !targetObjectId) {
      return NextResponse.json({ error: 'sourceObjectId and targetObjectId required' }, { status: 400 })
    }

    const res = await crmPost('/associations', locationId, {
      sourceObjectId,
      targetObjectId,
      associationType: associationType || 'contact_to_contact',
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ association: data, created: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}
