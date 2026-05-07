import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

// GET /api/social/categories — List social categories
export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id
  if (!locationId) return NextResponse.json({ categories: [] })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''

  try {
    const res = await fetch(`${CRM_API}/social-media-posting/category/?locationId=${locationId}`, {
      headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
    })

    if (!res.ok) return NextResponse.json({ categories: [] })
    const data = await res.json()
    return NextResponse.json({ categories: data.categories || data || [] })
  } catch {
    return NextResponse.json({ categories: [] })
  }
}

// POST /api/social/categories — Create a category
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id
  if (!locationId) return NextResponse.json({ error: 'No CRM location' }, { status: 400 })

  const { name, color } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''

  try {
    const res = await fetch(`${CRM_API}/social-media-posting/category/?locationId=${locationId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, color: color || '#7ed957' }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Create failed: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ category: data })
  } catch {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 })
  }
}
