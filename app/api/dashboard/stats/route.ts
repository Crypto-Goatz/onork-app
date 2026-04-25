import { NextRequest, NextResponse } from 'next/server'
import { crmGet, getAuthForLocation } from '@/lib/crm'
import { getAuthContext } from '@/lib/auth-context'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { locationId, businessName, tierLevel, email } = ctx

  const stats = {
    contacts: 0,
    opportunities: 0,
    conversations: 0,
    pipelines: 0,
    businessName,
    tierLevel,
  }

  if (!locationId) {
    return NextResponse.json({ stats, locationId: '', debug: { userEmail: email, locationId: 'none' } })
  }

  const auth = await getAuthForLocation(locationId)
  if (!auth.token) {
    return NextResponse.json({ stats, locationId, debug: { userEmail: email, authSource: 'none' } })
  }

  try {
    const contactsRes = await crmGet('/contacts/?limit=1', locationId)
    if (contactsRes.ok) {
      const contactsData = await contactsRes.json()
      stats.contacts = contactsData.meta?.total || contactsData.total || contactsData.contacts?.length || 0
    }

    const pipelinesRes = await crmGet('/opportunities/pipelines', locationId)
    if (pipelinesRes.ok) {
      const pipelinesData = await pipelinesRes.json()
      const pipelines = pipelinesData.pipelines || []
      stats.pipelines = pipelines.length

      if (pipelines.length > 0) {
        const oppsRes = await crmGet(`/opportunities/search?pipeline_id=${pipelines[0].id}`, locationId)
        if (oppsRes.ok) {
          const oppsData = await oppsRes.json()
          stats.opportunities = oppsData.meta?.total || oppsData.opportunities?.length || 0
        }
      }
    }

    const convoRes = await crmGet('/conversations/search?limit=1', locationId)
    if (convoRes.ok) {
      const convoData = await convoRes.json()
      stats.conversations = convoData.total || convoData.conversations?.length || 0
    }

    return NextResponse.json({ stats, locationId, pitAvailable: true, authSource: auth.source })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stats fetch failed'
    return NextResponse.json({ stats, error: message, locationId, authSource: auth.source })
  }
}
