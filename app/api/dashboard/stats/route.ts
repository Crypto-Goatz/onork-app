import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPitForLocation } from '@/lib/crm'

export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's CRM location from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id, business_name, tier_level')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || ''
  const pit = locationId ? getPitForLocation(locationId) : ''

  const stats = {
    contacts: 0,
    opportunities: 0,
    conversations: 0,
    pipelines: 0,
    businessName: profile?.business_name || '',
    tierLevel: profile?.tier_level ?? 0,
  }

  if (!pit || !locationId) {
    return NextResponse.json({ stats, debug: { userEmail: user.email, hasProfile: !!profile, locationId: locationId || 'none' } })
  }

  async function crmFetch(path: string) {
    return fetch(`${CRM_API}${path}`, {
      headers: {
        Authorization: `Bearer ${pit}`,
        'Content-Type': 'application/json',
        Version: CRM_VERSION,
      },
      cache: 'no-store',
    })
  }

  try {
    // Fetch contacts count
    const contactsRes = await crmFetch(`/contacts/?locationId=${locationId}&limit=1`)
    if (contactsRes.ok) {
      const contactsData = await contactsRes.json()
      stats.contacts = contactsData.meta?.total || contactsData.total || contactsData.contacts?.length || 0
    }

    // Fetch pipelines + opportunities
    const pipelinesRes = await crmFetch(`/opportunities/pipelines?locationId=${locationId}`)
    if (pipelinesRes.ok) {
      const pipelinesData = await pipelinesRes.json()
      const pipelines = pipelinesData.pipelines || []
      stats.pipelines = pipelines.length

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

    return NextResponse.json({ stats, locationId, pitAvailable: !!pit })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stats fetch failed'
    return NextResponse.json({ stats, error: message, locationId, pitAvailable: !!pit })
  }
}
