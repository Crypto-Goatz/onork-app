import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use user's active location, fall back to env var
  const locationId = user.user_metadata?.active_location_id || process.env.CRM_LOCATION_ID
  // Use agency PIT for multi-location access, fall back to location PIT
  const pit = process.env.CRM_AGENCY_PIT || process.env.CRM_PIT

  if (!pit || !locationId) {
    return NextResponse.json({ error: 'CRM not configured. Go to Settings to connect your CRM.' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const query = searchParams.get('query') || ''

    const url = query
      ? `${CRM_API}/contacts/?locationId=${locationId}&limit=${limit}&query=${encodeURIComponent(query)}`
      : `${CRM_API}/contacts/?locationId=${locationId}&limit=${limit}`

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `CRM error: ${res.status}`, details: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({
      contacts: data.contacts || [],
      total: data.total || data.contacts?.length || 0,
      locationId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CRM request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
