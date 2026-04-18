import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

// GET /api/social/posts — List posts from CRM social planner
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id
  if (!locationId) return NextResponse.json({ posts: [] })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
  const { searchParams } = new URL(req.url)

  const params = new URLSearchParams()
  params.set('locationId', locationId)
  if (searchParams.get('status')) params.set('status', searchParams.get('status')!)
  if (searchParams.get('type')) params.set('type', searchParams.get('type')!)
  if (searchParams.get('fromDate')) params.set('fromDate', searchParams.get('fromDate')!)
  if (searchParams.get('toDate')) params.set('toDate', searchParams.get('toDate')!)
  if (searchParams.get('limit')) params.set('limit', searchParams.get('limit')!)
  if (searchParams.get('offset')) params.set('offset', searchParams.get('offset')!)
  params.set('includeUsers', 'true')

  try {
    const res = await fetch(`${CRM_API}/social-media-posting/?${params.toString()}`, {
      headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[social/posts] CRM error:', res.status, err)
      return NextResponse.json({ posts: [], error: `CRM error: ${res.status}` })
    }

    const data = await res.json()
    return NextResponse.json({
      posts: data.posts || data || [],
      total: data.total || 0,
    })
  } catch (err) {
    console.error('[social/posts] Error:', err)
    return NextResponse.json({ posts: [], error: 'Failed to fetch posts' })
  }
}

// DELETE /api/social/posts — Delete a post
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id
  if (!locationId) return NextResponse.json({ error: 'No CRM location' }, { status: 400 })

  const { postId } = await req.json()
  if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''

  try {
    const res = await fetch(`${CRM_API}/social-media-posting/${postId}?locationId=${locationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Delete failed: ${res.status}` }, { status: res.status })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
