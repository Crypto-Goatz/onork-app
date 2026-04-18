import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet, crmPost } from '@/lib/crm'

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
    const limit = searchParams.get('limit') || '50'

    const res = await crmGet(`/products/?limit=${limit}`, locationId)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ products: data.products || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { name, description, price, currency } = body

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const res = await crmPost('/products/', locationId, {
      name,
      description: description || '',
      prices: [{ amount: price || 0, currency: currency || 'USD', type: 'one_time' }],
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ product: data, created: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}
