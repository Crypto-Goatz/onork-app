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

/**
 * THE KEY COMES FROM ONE RESOLVER. This route used to carry its own picker
 * (active install → the 0nCore location's env PIT → the agency PIT) that never
 * looked at the key the agency PASTED for a client and never minted one. So
 * "Test this key" for In2sight ran the 0nCore location's key against In2sight
 * and printed ten 401s — while the pasted key answered 200 directly and a
 * freshly minted token answered 200 too (measured 2026-09-14). A second
 * resolver is a second source of truth, and this one lied to the repair
 * surface. lib/crm.getAuthForLocation is the only picker now: pasted key →
 * OAuth install (refreshed) → minted location token → env PIT.
 */
import { getAuthForLocation, fallbackCredentials } from '@/lib/crm'

export async function POST(req: NextRequest) {
  // Auth — get user from session
  const serverSupabase = await createServerClient()
  const { data: { session } } = await serverSupabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { method = 'GET', path, body: reqBody, locationId: overrideLocationId } = await req.json()

  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  // Resolve location — NEVER fall back to another user's location
  let locationId = overrideLocationId?.trim() || ''
  if (!locationId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('crm_location_id, is_admin, is_vip')
      .eq('id', user.id)
      .single()
    locationId = profile?.crm_location_id?.trim() || ''

    // Failsafe: if admin/VIP has empty location, auto-fix it
    if (!locationId && (profile?.is_admin || profile?.is_vip)) {
      // Set a default location for admin users and persist it
      const defaultLoc = process.env.CRM_LOCATION_ID || ''
      if (defaultLoc) {
        locationId = defaultLoc
        // Persist so this doesn't happen again
        await supabase.from('profiles').update({ crm_location_id: defaultLoc }).eq('id', user.id)
      }
    }
  }

  if (!locationId) {
    return NextResponse.json({
      error: 'No CRM location provisioned for your account. Go to Settings to provision your CRM.',
      needs_provision: true,
    }, { status: 403 })
  }

  // Get the right token for this location — the shared resolver, never a local pick.
  const auth = await getAuthForLocation(locationId)
  const token = auth.token
  if (!token) {
    return NextResponse.json({ error: auth.unresolved || 'No CRM credential for this location. Paste that account\'s key at /connect.', status: 500, source: 'none' }, { status: 500 })
  }
  // Which credential answered, so the repair surface can say "tested with the pasted key".
  const sourceLabel0 = auth.source === 'pit' && !auth.installId && !process.env[`CRM_PIT_${locationId}`] ? 'pasted key' : auth.source === 'oauth' ? (auth.installId ? 'app install' : 'minted token') : 'env key'

  // Build the CRM request URL
  // `/locations/` takes the id as a PATH segment, not a query param.
  //
  // The SDK cannot know the location id client-side, so it sends the bare
  // path and this proxy appends `?locationId=…` to every GET. For most CRM
  // routes that is right; for the single-location read it produced
  // `/locations/?locationId=…`, which the CRM answers with a bare
  // `Cannot GET` — the red banner on the CRM Settings page.
  //
  // Rewritten here rather than in the SDK because this is the only place that
  // knows the id, and doing it in both is how the two would drift apart.
  const isBareLocations = /^\/locations\/?$/.test(path)
  let url = isBareLocations ? `${CRM_API}/locations/${locationId}` : `${CRM_API}${path}`

  // Auto-append locationId to GET queries if not already present. Skipped for
  // the path-param form above, where appending it would duplicate the id — and
  // a duplicated locationId is what returns a bogus 403 rather than an error
  // that names the problem.
  if (method === 'GET' && !isBareLocations && !url.includes('locationId')) {
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
    const send = (bearer: string) => fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${bearer}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
      ...(finalBody && method !== 'GET' && method !== 'DELETE' ? { body: JSON.stringify(finalBody) } : {}),
      cache: 'no-store',
    })
    let crmRes = await send(token)
    let sourceLabel = sourceLabel0
    // A pasted key can be scoped narrower than the endpoint needs (tags,
    // invoices, users, custom fields 401/403 on a limited private integration
    // while contacts answer 200). Try the other credentials this location has —
    // the app install and a minted location token — and say which one answered.
    if (crmRes.status === 401 || crmRes.status === 403) {
      for (const next of await fallbackCredentials(auth)) {
        const retry = await send(next.token)
        if (retry.ok) { crmRes = retry; sourceLabel = next.label === 'the client key' ? 'pasted key' : `minted token (${next.label})`; break }
      }
    }

    const data = await crmRes.json().catch(() => ({}))

    if (!crmRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || `CRM ${crmRes.status}`, status: crmRes.status, source: sourceLabel },
        { status: crmRes.status, headers: { 'x-0n-crm-source': sourceLabel } }
      )
    }

    return NextResponse.json(data, { headers: { 'x-0n-crm-source': sourceLabel } })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
