import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function GET(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const locationId = searchParams.get('locationId') || ''

  // Get location from profile if not provided
  let locId = locationId
  if (!locId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('crm_location_id')
      .eq('id', user.id)
      .single()
    locId = profile?.crm_location_id || ''
  }

  if (!locId) {
    return Response.json({ error: 'No location ID' }, { status: 400 })
  }

  const pit = process.env.CRM_PIT || process.env.CRM_AGENCY_PIT || ''
  if (!pit) {
    return Response.json({ error: 'CRM credentials not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${CRM_API}/knowledge-base/?locationId=${locId}`, {
      headers: {
        'Authorization': `Bearer ${pit}`,
        'Version': CRM_VERSION,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: `CRM API error: ${res.status}`, detail: text }, { status: 502 })
    }

    const data = await res.json()
    return Response.json({ knowledgeBases: data.knowledgeBases || data.data || [] })
  } catch (err) {
    return Response.json({ error: 'Failed to fetch knowledge bases', detail: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, locationId } = body

  // Get location from profile if not provided
  let locId = locationId || ''
  if (!locId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('crm_location_id')
      .eq('id', user.id)
      .single()
    locId = profile?.crm_location_id || ''
  }

  if (!locId) {
    return Response.json({ error: 'No location ID' }, { status: 400 })
  }

  const pit = process.env.CRM_PIT || process.env.CRM_AGENCY_PIT || ''
  if (!pit) {
    return Response.json({ error: 'CRM credentials not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${CRM_API}/knowledge-base/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pit}`,
        'Version': CRM_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name || 'Untitled KB',
        description: description || '',
        locationId: locId,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: `CRM API error: ${res.status}`, detail: text }, { status: 502 })
    }

    const data = await res.json()
    return Response.json({ knowledgeBase: data })
  } catch (err) {
    return Response.json({ error: 'Failed to create knowledge base', detail: String(err) }, { status: 500 })
  }
}
