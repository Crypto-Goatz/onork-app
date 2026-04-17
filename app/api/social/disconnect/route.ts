import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('crm_location_id').eq('id', user.id).single()
  const locationId = profile?.crm_location_id
  if (!locationId) return NextResponse.json({ error: 'No CRM location' }, { status: 400 })

  const { accountId } = await req.json()
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''

  const res = await fetch(`${CRM_API}/social-media-posting/${locationId}/accounts/${accountId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
  })

  if (!res.ok) return NextResponse.json({ error: 'Disconnect failed' }, { status: 502 })
  return NextResponse.json({ disconnected: true })
}
