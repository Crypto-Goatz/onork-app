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

function getPITs(): string[] {
  // Return ALL valid PITs — proxy will try each until one works
  // Agency PIT first (has access to all sub-locations), then location-specific ones
  return [
    process.env.CRM_AGENCY_PIT_NEW,
    process.env.CRM_AGENCY_PIT,
    process.env.CRM_PIT_ROCKETOPP,
    process.env.CRM_PIT_RAW,
    process.env.CRM_PIT,
    process.env.CRM_PIT_TOKEN,
  ].filter(Boolean).filter(p => (p as string).startsWith('pit-')) as string[]
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

  const pits = getPITs()
  if (pits.length === 0) return NextResponse.json({ error: 'CRM not configured — no valid PIT tokens' }, { status: 500 })

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

  // Try each PIT token until one works
  let lastError = ''
  for (const pit of pits) {
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

      if (crmRes.ok) {
        return NextResponse.json(data)
      }

      // If 401/403 with "token does not have access", try next PIT
      const errMsg = data.message || data.error || ''
      if (crmRes.status === 401 || crmRes.status === 403 || errMsg.includes('access') || errMsg.includes('token') || errMsg.includes('unauthorized')) {
        lastError = `PIT ${pit.slice(0, 12)}... → ${crmRes.status}: ${errMsg}`
        continue
      }

      // Other errors (400, 404, 422, 500) — return immediately, don't try more PITs
      return NextResponse.json(
        { error: errMsg || `CRM ${crmRes.status}`, status: crmRes.status, data },
        { status: crmRes.status }
      )
    } catch (err) {
      lastError = `PIT ${pit.slice(0, 12)}... → ${(err as Error).message}`
      continue
    }
  }

  // All PITs failed
  return NextResponse.json({ error: `All CRM tokens failed. Last: ${lastError}` }, { status: 502 })
}
