/**
 * GET /api/onboarding/crm/verify
 *
 * Live verifies the authenticated user's CRM sub-location is reachable with
 * their PIT and returns counts + a sample of current data. This is the
 * onboarding "is the brain connected to the CRM?" probe.
 *
 * Reads:
 *   - profiles.crm_location_id (set by family auto-link or sub-location provisioning)
 *   - getPitForLocation(locationId) (env-mapped PIT for that sub-account)
 *
 * Hits CRM:
 *   - GET /locations/{id}                         → confirm location exists
 *   - GET /contacts/search?locationId={id}&limit=1 → count
 *   - GET /opportunities/pipelines?locationId={id} → list pipelines
 */
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getPitForLocation } from '@/lib/crm'
import { FAMILY_LOCATIONS } from '@/lib/family-locations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = admin()
  const { data: profile } = await sb
    .from('profiles')
    .select('crm_location_id, business_name, plan')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || ''
  if (!locationId) {
    return NextResponse.json({
      ok: false,
      stage: 'no_location',
      message: 'No CRM sub-location linked to this profile yet.',
    })
  }

  const pit = getPitForLocation(locationId)
  if (!pit) {
    return NextResponse.json({
      ok: false,
      stage: 'no_pit',
      message: `No PIT configured for location ${locationId}. Set CRM_PIT_<LOCATION_ID> on Vercel.`,
      locationId,
    })
  }

  const headers = {
    Authorization: `Bearer ${pit}`,
    Version: CRM_VERSION,
  }

  // 1. Location info
  let locationName = ''
  let locationOk = false
  let locationEmail: string | null = null
  try {
    const r = await fetch(`${CRM_API}/locations/${locationId}`, { headers })
    if (r.ok) {
      const data = await r.json()
      const loc = data.location || data
      locationName = loc.name || ''
      locationEmail = loc.email || null
      locationOk = true
    } else {
      const text = await r.text()
      return NextResponse.json({
        ok: false,
        stage: 'location_failed',
        message: `Location read failed (${r.status}): ${text.slice(0, 200)}`,
        locationId,
      })
    }
  } catch (err) {
    return NextResponse.json({
      ok: false,
      stage: 'location_threw',
      message: err instanceof Error ? err.message : 'unknown',
      locationId,
    })
  }

  // 2. Contact count + sample (search with limit=1 returns total in metadata)
  let contactCount = 0
  let sampleContact: { name: string; email: string | null } | null = null
  try {
    const r = await fetch(`${CRM_API}/contacts/search?locationId=${locationId}&limit=1`, { headers })
    if (r.ok) {
      const data = await r.json()
      contactCount = Number(data?.total || data?.meta?.total || (data?.contacts || []).length || 0)
      const c = (data?.contacts || [])[0]
      if (c) sampleContact = { name: c.name || c.firstName || '—', email: c.email || null }
    }
  } catch { /* count is informational only */ }

  // 3. Pipelines
  let pipelines: Array<{ id: string; name: string; stages: number }> = []
  try {
    const r = await fetch(`${CRM_API}/opportunities/pipelines?locationId=${locationId}`, { headers })
    if (r.ok) {
      const data = await r.json()
      pipelines = (data?.pipelines || []).map((p: { id?: string; name?: string; stages?: unknown[] }) => ({
        id: String(p.id || ''),
        name: String(p.name || ''),
        stages: Array.isArray(p.stages) ? p.stages.length : 0,
      }))
    }
  } catch { /* */ }

  // 4. Family-location metadata
  const family = FAMILY_LOCATIONS.find((f) => f.locationId === locationId)

  return NextResponse.json({
    ok: locationOk,
    stage: 'verified',
    location: {
      id: locationId,
      name: locationName,
      email: locationEmail,
      family_member: !!family,
      family_name: family?.name || null,
      family_vip: !!family?.vip,
    },
    counts: {
      contacts: contactCount,
      pipelines: pipelines.length,
    },
    sample_contact: sampleContact,
    pipelines,
    pit_redacted: `${pit.slice(0, 8)}…${pit.slice(-4)}`,
    profile: {
      business_name: profile?.business_name || null,
      plan: profile?.plan || 'free',
    },
  })
}
