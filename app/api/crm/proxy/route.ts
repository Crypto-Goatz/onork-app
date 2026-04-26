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

// Get the correct token for a location:
// 1. Marketplace app OAuth token (has ALL scopes for the location)
// 2. Agency PIT (fallback — has sub-location access)
async function getTokenForLocation(locationId: string): Promise<string | null> {
  // Check for installed marketplace app OAuth token
  const { data: installation } = await supabase
    .from('crm_installations')
    .select('access_token, expires_at')
    .eq('location_id', locationId)
    .eq('status', 'active')
    .single()

  if (installation?.access_token) {
    // TODO: check expires_at and refresh if needed
    return installation.access_token
  }

  // Fallback: agency PIT (has access to all sub-locations)
  const agencyPit = process.env.CRM_AGENCY_PIT_NEW || process.env.CRM_AGENCY_PIT
  if (agencyPit?.startsWith('pit-')) return agencyPit

  // Last resort: any valid PIT
  const anyPit = process.env.CRM_PIT_ROCKETOPP || process.env.CRM_PIT_RAW || process.env.CRM_PIT
  if (anyPit?.startsWith('pit-')) return anyPit

  return null
}

export async function POST(req: NextRequest) {
  // Auth — get user from session
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { method = 'GET', path, body: reqBody, locationId: overrideLocationId } = await req.json()

  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  // Resolve location — NEVER fall back to another user's location
  let locationId = overrideLocationId
  if (!locationId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('crm_location_id')
      .eq('id', user.id)
      .single()
    locationId = profile?.crm_location_id
  }

  if (!locationId) {
    return NextResponse.json({
      error: 'No CRM location provisioned for your account. Go to Settings to provision your CRM.',
      needs_provision: true,
    }, { status: 403 })
  }

  // Get the right token for this location
  const token = await getTokenForLocation(locationId)
  if (!token) {
    return NextResponse.json({ error: 'No CRM token available for this location. Install the 0nCore marketplace app in your CRM.' }, { status: 500 })
  }

  // Build the CRM request URL
  let url = `${CRM_API}${path}`

  // Auto-append locationId to GET queries if not already present
  if (method === 'GET' && !url.includes('locationId')) {
    const sep = url.includes('?') ? '&' : '?'
    url = `${url}${sep}locationId=${locationId}`
  }

  // Social OAuth start endpoints also need userId
  if (method === 'GET' && url.includes('/social-media-posting/oauth/') && url.includes('/start') && !url.includes('userId')) {
    url = `${url}&userId=${user.id}`
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
        Authorization: `Bearer ${token}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
      ...(finalBody && method !== 'GET' && method !== 'DELETE' ? { body: JSON.stringify(finalBody) } : {}),
    })

    const data = await crmRes.json().catch(() => ({}))

    if (!crmRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || `CRM ${crmRes.status}`, status: crmRes.status },
        { status: crmRes.status }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
