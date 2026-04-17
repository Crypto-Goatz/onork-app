import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const agencyPit = process.env.CRM_AGENCY_PIT_NEW || process.env.CRM_AGENCY_PIT || ''
  const companyId = 'bknfhTkdDLapbwfZqQNi'

  // Get locations via agency search
  const res = await fetch(`${CRM_API}/locations/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${agencyPit}`, Version: CRM_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, skip: 0, limit: 100 }),
  })

  if (!res.ok) {
    // Fallback: try listing via SaaS API
    const saasRes = await fetch(`${CRM_API}/saas-api/public-api/locations?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${agencyPit}`, Version: CRM_VERSION },
    })
    if (saasRes.ok) {
      const data = await saasRes.json()
      return NextResponse.json({ locations: data.locations || data || [] })
    }
    return NextResponse.json({ locations: [] })
  }

  const data = await res.json()

  // Get product keys for each location
  const locationIds = (data.locations || []).map((l: { id: string }) => l.id)
  const { data: allKeys } = await supabase
    .from('product_keys')
    .select('location_id, product_slug, status')
    .in('location_id', locationIds.length > 0 ? locationIds : ['none'])

  const keysByLocation: Record<string, string[]> = {}
  for (const key of (allKeys || [])) {
    if (key.status === 'active') {
      if (!keysByLocation[key.location_id]) keysByLocation[key.location_id] = []
      keysByLocation[key.location_id].push(key.product_slug)
    }
  }

  const locations = (data.locations || []).map((l: Record<string, unknown>) => ({
    ...l,
    addons: keysByLocation[l.id as string] || [],
  }))

  return NextResponse.json({ locations, companyId })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()

  // Grant/revoke add-on for a location
  if (body.action === 'grant_addon') {
    const { location_id, product_slug, product_name } = body
    await supabase.from('product_keys').upsert({
      user_id: user.id,
      location_id,
      product_slug,
      product_name: product_name || product_slug,
      status: 'active',
      capabilities: [],
      price_cents: 0,
      activated_at: new Date().toISOString(),
      metadata: { granted_by: 'admin', granted_at: new Date().toISOString() },
    }, { onConflict: 'user_id,location_id,product_slug' })
    return NextResponse.json({ granted: true })
  }

  if (body.action === 'revoke_addon') {
    const { location_id, product_slug } = body
    await supabase.from('product_keys')
      .update({ status: 'revoked' })
      .eq('location_id', location_id)
      .eq('product_slug', product_slug)
    return NextResponse.json({ revoked: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
