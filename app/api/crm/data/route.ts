/**
 * GET /api/crm/data?type=contacts&query=Sarah&limit=50
 *
 * Simplified CRM data endpoint using the SDK wrapper helpers.
 * Handles the method name mapping so the frontend doesn't need to know SDK internals.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCrmClient } from '@/lib/crm-sdk'
import { getAuthContext } from '@/lib/auth-context'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locationId = ctx.locationId
  if (!locationId) {
    return NextResponse.json({ error: 'CRM not connected. Go to Settings to connect your CRM location.' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const query = searchParams.get('query') || ''
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  try {
    const client = await getCrmClient(locationId)

    switch (type) {
      case 'contacts': {
        const data = await (client.contacts as any).getContacts({ locationId, query, limit })
        return NextResponse.json({
          contacts: data?.contacts || [],
          meta: data?.meta || { total: data?.contacts?.length || 0 },
        })
      }

      case 'pipelines': {
        const data = await (client.opportunities as any).getPipelines({ locationId })
        return NextResponse.json({ pipelines: data?.pipelines || [] })
      }

      case 'opportunities': {
        const pipelineId = searchParams.get('pipeline_id')
        const data = await (client.opportunities as any).searchOpportunity({
          locationId,
          pipeline_id: pipelineId,
          limit,
        })
        return NextResponse.json({ opportunities: data?.opportunities || [] })
      }

      case 'conversations': {
        const data = await (client.conversations as any).searchConversation({ locationId, limit })
        return NextResponse.json({
          conversations: data?.conversations || [],
          total: data?.total || 0,
        })
      }

      case 'calendars': {
        const data = await (client.calendars as any).getCalendars({ locationId })
        return NextResponse.json({ calendars: data?.calendars || [] })
      }

      case 'users': {
        const data = await (client.users as any).getUsers({ locationId })
        return NextResponse.json({ users: data?.users || [] })
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${type}. Available: contacts, pipelines, opportunities, conversations, calendars, users` }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CRM request failed'
    console.error(`[crm/data] type=${type} error:`, message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
