import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet } from '@/lib/crm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || process.env.CRM_LOCATION_ID
  if (!locationId) return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })

  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'

    const res = await crmGet(`/users/?limit=${limit}`, locationId)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ users: data.users || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}
