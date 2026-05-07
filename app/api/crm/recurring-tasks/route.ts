import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet, crmPost, crmPut, crmDelete } from '@/lib/crm'

/**
 * Recurring Tasks API — CRM recurring task management
 * GET    /api/crm/recurring-tasks              — list recurring tasks
 * POST   /api/crm/recurring-tasks              — create recurring task
 * POST   /api/crm/recurring-tasks { action: 'update', id } — update
 * POST   /api/crm/recurring-tasks { action: 'delete', id } — delete
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
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locationId = await resolveLocation(supabase, user.id)
  if (!locationId) return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })

  try {
    const res = await crmGet('/recurring-tasks', locationId)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ tasks: data.tasks || data || [], locationId })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locationId = await resolveLocation(supabase, user.id)
  if (!locationId) return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })

  try {
    const body = await request.json()
    const action = body.action || 'create'

    if (action === 'delete' && body.id) {
      const res = await crmDelete(`/recurring-tasks/${body.id}`, locationId)
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
      }
      return NextResponse.json({ success: true, deleted: body.id })
    }

    if (action === 'update' && body.id) {
      const { id, action: _, ...updateBody } = body
      const res = await crmPut(`/recurring-tasks/${id}`, locationId, updateBody)
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ task: data, updated: true })
    }

    // Create
    const { title, description, frequency, assignedTo, dueDate } = body
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

    const createBody: Record<string, unknown> = { title, locationId }
    if (description) createBody.description = description
    if (frequency) createBody.frequency = frequency
    if (assignedTo) createBody.assignedTo = assignedTo
    if (dueDate) createBody.dueDate = dueDate

    const res = await crmPost('/recurring-tasks', locationId, createBody)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ task: data, created: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}
