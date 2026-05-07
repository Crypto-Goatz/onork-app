import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet, crmPost, crmPut, crmDelete } from '@/lib/crm'

/**
 * Voice AI API — CRM Voice Agent management
 * GET  /api/crm/voice-ai           — list voice agents
 * GET  /api/crm/voice-ai?id=xxx    — get agent details
 * POST /api/crm/voice-ai           — create voice agent
 * PUT  (via POST action=update)     — update agent
 * DELETE (via POST action=delete)   — delete agent
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
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('id')

    if (agentId) {
      const res = await crmGet(`/voice-ai/agents/${agentId}`, locationId)
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ agent: data })
    }

    const res = await crmGet('/voice-ai/agents', locationId)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ agents: data.agents || data || [], locationId })
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

    if (action === 'delete' && body.agentId) {
      const res = await crmDelete(`/voice-ai/agents/${body.agentId}`, locationId)
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
      }
      return NextResponse.json({ success: true, deleted: body.agentId })
    }

    if (action === 'update' && body.agentId) {
      const { agentId, action: _, ...updateBody } = body
      const res = await crmPut(`/voice-ai/agents/${agentId}`, locationId, updateBody)
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ agent: data, updated: true })
    }

    // Create new agent
    const { name, greeting, prompt, voiceId, transferNumber, knowledgeBaseId } = body
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const createBody: Record<string, unknown> = { name, locationId }
    if (greeting) createBody.greeting = greeting
    if (prompt) createBody.prompt = prompt
    if (voiceId) createBody.voiceId = voiceId
    if (transferNumber) createBody.transferNumber = transferNumber
    if (knowledgeBaseId) createBody.knowledgeBaseId = knowledgeBaseId

    const res = await crmPost('/voice-ai/agents', locationId, createBody)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ agent: data, created: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}
