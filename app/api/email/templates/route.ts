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

  const { data: profile } = await supabase.from('profiles').select('crm_location_id').eq('id', user.id).single()
  const locationId = profile?.crm_location_id
  if (!locationId) return NextResponse.json({ templates: [] })

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''

  const res = await fetch(`${CRM_API}/emails/builder?locationId=${locationId}&templatesOnly=true&limit=50`, {
    headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
  })

  if (!res.ok) return NextResponse.json({ templates: [] })
  const data = await res.json()
  return NextResponse.json({ templates: data.templates || data.data || [] })
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('crm_location_id').eq('id', user.id).single()
    const locationId = profile?.crm_location_id
    if (!locationId) return NextResponse.json({ error: 'No CRM location configured' }, { status: 400 })

    const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
    const body = await req.json()

    const res = await fetch(`${CRM_API}/emails/builder`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId,
        name: body.name || 'Untitled Template',
        type: 'html',
        subject: body.subject || '',
        preheader: body.preheader || '',
        html: body.html || '',
        design: body.design || null,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('CRM template save error:', err)
      return NextResponse.json({ error: 'Failed to save template to CRM' }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, template: data })
  } catch (err) {
    console.error('Template save error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
