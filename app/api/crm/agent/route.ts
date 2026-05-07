import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_BASE = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || process.env.CRM_LOCATION_ID
  const pit = process.env.CRM_PIT_RAW || process.env.CRM_AGENT_STUDIO_PIT || process.env.CRM_AGENCY_PIT

  if (!pit || !locationId) {
    return NextResponse.json({ agentId: null })
  }

  try {
    const res = await fetch(`${CRM_BASE}/agent-studio/agents?locationId=${locationId}`, {
      headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
    })

    if (!res.ok) return NextResponse.json({ agentId: null })

    const data = await res.json()
    const agent = data.agents?.[0]

    return NextResponse.json({
      agentId: agent?.agentId || null,
      agentName: agent?.name || null,
      status: agent?.status || null,
    })
  } catch {
    return NextResponse.json({ agentId: null })
  }
}
