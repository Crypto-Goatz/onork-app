// POST /api/crm/proxy — Universal CRM API proxy
// Every CRM call from the frontend goes through here.
// Handles auth, location resolution, error handling.
// Body: { method, path, body?, locationId? }

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function getPIT(): string {
  // Try PITs in order — raw first (plain text, works), then others
  const pits = [
    process.env.CRM_PIT_RAW,
    process.env.CRM_PIT_ROCKETOPP,
    process.env.CRM_PIT,
  ].filter(Boolean) as string[]

  for (const pit of pits) {
    if (pit.startsWith('pit-')) return pit
  }
  return pits[0] || ''
}

export async function POST(req: NextRequest) {
  // Auth — get user from session
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { method = 'GET', path, body: reqBody, locationId: overrideLocationId } = await req.json()

  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  // Resolve location
  let locationId = overrideLocationId
  if (!locationId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('crm_location_id')
      .eq('id', user.id)
      .single()
    locationId = profile?.crm_location_id || process.env.CRM_LOCATION_ID || 'nphConTwfHcVE1oA0uep'
  }

  const pit = getPIT()
  if (!pit) return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })

  // Build the CRM request
  let url = `${CRM_API}${path}`

  // Auto-append locationId to GET queries if not already present
  if (method === 'GET' && !url.includes('locationId')) {
    const sep = url.includes('?') ? '&' : '?'
    url = `${url}${sep}locationId=${locationId}`
  }

  // For POST/PUT/PATCH, inject locationId into body if not present
  let finalBody = reqBody
  if (['POST', 'PUT', 'PATCH'].includes(method) && reqBody && typeof reqBody === 'object' && !reqBody.locationId) {
    finalBody = { ...reqBody, locationId }
  }

  try {
    const crmRes = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
      ...(finalBody && method !== 'GET' && method !== 'DELETE' ? { body: JSON.stringify(finalBody) } : {}),
    })

    const data = await crmRes.json().catch(() => ({}))

    if (!crmRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || `CRM ${crmRes.status}`, status: crmRes.status, data },
        { status: crmRes.status }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
