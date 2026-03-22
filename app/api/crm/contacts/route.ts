import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function GET(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pit = process.env.CRM_PIT
  const locationId = process.env.CRM_LOCATION_ID
  if (!pit || !locationId) {
    return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'

    const res = await fetch(
      `${CRM_API}/contacts/?locationId=${locationId}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${pit}`,
          Version: CRM_VERSION,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `CRM API error: ${res.status}`, details: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({ contacts: data.contacts || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CRM request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
