import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet, crmPost } from '@/lib/crm'

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
  if (!locationId) {
    return NextResponse.json({ error: 'CRM not configured. Complete onboarding first.' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const query = searchParams.get('query') || ''

    const path = query
      ? `/contacts/?limit=${limit}&query=${encodeURIComponent(query)}`
      : `/contacts/?limit=${limit}`

    const res = await crmGet(path, locationId)

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({
      contacts: data.contacts || [],
      total: data.total || data.contacts?.length || 0,
      locationId,
    })
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
  if (!locationId) {
    return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })
  }

  const body = await request.json()
  const { firstName, lastName, email, phone, tags, source } = body

  if (!firstName && !email && !phone) {
    return NextResponse.json({ error: 'At least firstName, email, or phone is required' }, { status: 400 })
  }

  try {
    const res = await crmPost('/contacts/', locationId, {
      firstName: firstName || '',
      lastName: lastName || '',
      email: email || undefined,
      phone: phone || undefined,
      tags: tags || ['0ncore-contact'],
      source: source || '0ncore',
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({
      contact: data.contact || null,
      created: true,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}
