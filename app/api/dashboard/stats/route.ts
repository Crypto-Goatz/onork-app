import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet, getAuthForLocation } from '@/lib/crm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id, business_name, tier_level')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || ''

  const stats = {
    contacts: 0,
    opportunities: 0,
    conversations: 0,
    pipelines: 0,
    businessName: profile?.business_name || '',
    tierLevel: profile?.tier_level ?? 0,
  }

  if (!locationId) {
    return NextResponse.json({ stats, debug: { userEmail: user.email, hasProfile: !!profile, locationId: 'none' } })
  }

  const auth = await getAuthForLocation(locationId)
  if (!auth.token) {
    return NextResponse.json({ stats, debug: { userEmail: user.email, locationId, authSource: 'none' } })
  }

  try {
    const contactsRes = await crmGet(`/contacts/?limit=1`, locationId)
    if (contactsRes.ok) {
      const contactsData = await contactsRes.json()
      stats.contacts = contactsData.meta?.total || contactsData.total || contactsData.contacts?.length || 0
    }

    const pipelinesRes = await crmGet(`/opportunities/pipelines`, locationId)
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

    const convoRes = await crmGet(`/conversations/search?limit=1`, locationId)
    if (convoRes.ok) {
      const convoData = await convoRes.json()
      stats.conversations = convoData.total || convoData.conversations?.length || 0
    }

    return NextResponse.json({ stats, locationId, authSource: auth.source })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stats fetch failed'
    return NextResponse.json({ stats, error: message, locationId, authSource: auth.source })
  }
}
