import { NextResponse } from 'next/server'
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

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pit = process.env.CRM_PIT
  const locationId = process.env.CRM_LOCATION_ID

  const stats = {
    contacts: 0,
    opportunities: 0,
    conversations: 0,
    pipelines: 0,
  }

  if (!pit || !locationId) {
    return NextResponse.json({ stats })
  }

  try {
    // Fetch contacts count (limit=1 to get meta.total)
    const contactsRes = await crmFetch(`/contacts/?locationId=${locationId}&limit=1`)
    if (contactsRes.ok) {
      const contactsData = await contactsRes.json()
      stats.contacts = contactsData.meta?.total || contactsData.contacts?.length || 0
    }

    // Fetch pipelines + opportunities count
    const pipelinesRes = await crmFetch(`/opportunities/pipelines?locationId=${locationId}`)
    if (pipelinesRes.ok) {
      const pipelinesData = await pipelinesRes.json()
      const pipelines = pipelinesData.pipelines || []
      stats.pipelines = pipelines.length

      // Get opportunity count from first pipeline
      if (pipelines.length > 0) {
        const oppsRes = await crmFetch(
          `/opportunities/search?locationId=${locationId}&pipeline_id=${pipelines[0].id}`
        )
        if (oppsRes.ok) {
          const oppsData = await oppsRes.json()
          stats.opportunities = oppsData.meta?.total || oppsData.opportunities?.length || 0
        }
      }
    }

    // Fetch conversations count
    const convoRes = await crmFetch(`/conversations/search?locationId=${locationId}&limit=1`)
    if (convoRes.ok) {
      const convoData = await convoRes.json()
      stats.conversations = convoData.total || convoData.conversations?.length || 0
    }

    return NextResponse.json({ stats })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stats fetch failed'
    return NextResponse.json({ stats, error: message })
  }
}
