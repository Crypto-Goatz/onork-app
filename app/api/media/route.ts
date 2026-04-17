import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function getAuth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('crm_location_id').eq('id', user.id).single()
  return { user, locationId: profile?.crm_location_id || '' }
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req)
  if (!auth || !auth.locationId) return NextResponse.json({ files: [] })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
  const params = new URL(req.url).searchParams
  const parentId = params.get('parentId') || ''
  const query = params.get('q') || ''
  const type = params.get('type') || ''

  const qs = new URLSearchParams({
    altType: 'location', altId: auth.locationId,
    sortBy: 'createdAt', sortOrder: 'desc',
    type: type || 'all', limit: '50', offset: '0',
  })
  if (parentId) qs.set('parentId', parentId)
  if (query) qs.set('query', query)

  const res = await fetch(`${CRM_API}/medias?${qs}`, {
    headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
  })

  if (!res.ok) return NextResponse.json({ files: [] })
  const data = await res.json()
  return NextResponse.json({ files: data.files || data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req)
  if (!auth || !auth.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
  const body = await req.json()

  if (body.action === 'create_folder') {
    const res = await fetch(`${CRM_API}/medias/folder`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify({ altType: 'location', altId: auth.locationId, name: body.name, parentId: body.parentId || undefined }),
    })
    const data = await res.json()
    return NextResponse.json(data)
  }

  if (body.action === 'upload') {
    const res = await fetch(`${CRM_API}/medias/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hosted: true, fileUrl: body.fileUrl, name: body.name, altType: 'location', altId: auth.locationId, parentId: body.parentId || undefined }),
    })
    const data = await res.json()
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req)
  if (!auth || !auth.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await fetch(`${CRM_API}/medias/${id}?altType=location&altId=${auth.locationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
  })
  return NextResponse.json({ deleted: true })
}
