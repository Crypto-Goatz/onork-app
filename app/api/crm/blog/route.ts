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
    const type = searchParams.get('type') || 'blogs'
    const limit = searchParams.get('limit') || '50'

    if (type === 'posts') {
      const blogId = searchParams.get('blogId') || ''
      const path = blogId ? `/blogs/${blogId}/posts?limit=${limit}` : `/blogs/posts?limit=${limit}`
      const res = await crmGet(path, locationId)
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ posts: data.posts || data.data || [] })
    }

    const res = await crmGet(`/blogs/?limit=${limit}`, locationId)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ blogs: data.blogs || data.data || [] })
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
    const { blogId, title, content, status } = body

    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const path = blogId ? `/blogs/${blogId}/posts` : '/blogs/posts'
    const res = await crmPost(path, locationId, {
      title,
      content: content || '',
      status: status || 'draft',
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ post: data, created: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}
