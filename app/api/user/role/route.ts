import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, hidden_features, sidebar_order, crm_location_id').eq('id', user.id).single()
  const { data: keys } = await supabase.from('product_keys').select('product_slug, capabilities, status').eq('user_id', user.id).eq('status', 'active')

  const role = profile?.role || 'standard'
  const isAdmin = role === 'admin'
  const isVip = role === 'vip' || role === 'admin'

  return NextResponse.json({
    role,
    isAdmin,
    isVip,
    hiddenFeatures: profile?.hidden_features || [],
    sidebarOrder: profile?.sidebar_order || [],
    locationId: profile?.crm_location_id || '',
    installedAddons: (keys || []).map(k => k.product_slug),
    capabilities: [...new Set((keys || []).flatMap(k => k.capabilities || []))],
  })
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.hidden_features) updates.hidden_features = body.hidden_features
  if (body.sidebar_order) updates.sidebar_order = body.sidebar_order

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  await supabase.from('profiles').update(updates).eq('id', user.id)
  return NextResponse.json({ updated: true })
}
