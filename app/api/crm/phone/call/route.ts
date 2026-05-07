import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmPost } from '@/lib/crm'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || process.env.CRM_LOCATION_ID
  if (!locationId) return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })

  try {
    const body = await request.json()
    const { to } = body

    if (!to) {
      return NextResponse.json({ error: 'Phone number (to) is required' }, { status: 400 })
    }

    // Initiate outbound call via CRM conversations API
    const res = await crmPost('/conversations/messages', locationId, {
      type: 'Call',
      contactId: undefined,
      phone: to,
      locationId,
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, call: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Call initiation failed' }, { status: 502 })
  }
}
