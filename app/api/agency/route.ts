import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

function getAgencyPIT(): string {
  // Try plain PITs first (encrypted type breaks PITs)
  return process.env.CRM_AGENCY_PIT_NEW
    || process.env.CRM_PIT_RAW
    || process.env.CRM_AGENCY_PIT
    || ''
}

async function crmFetch(path: string, opts: RequestInit = {}): Promise<{ ok: boolean; status: number; data: unknown; error?: string; detail?: string }> {
  const pit = getAgencyPIT()
  if (!pit) {
    return { ok: false, status: 500, data: null, error: 'No agency PIT configured', detail: 'Missing CRM_AGENCY_PIT_NEW, CRM_PIT_RAW, and CRM_AGENCY_PIT env vars' }
  }

  const url = `${CRM_API}${path}`
  const startMs = Date.now()

  try {
    const res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
        ...((opts.headers as Record<string, string>) || {}),
      },
    })

    const durationMs = Date.now() - startMs
    let body: unknown = null
    const contentType = res.headers.get('content-type') || ''

    try {
      body = contentType.includes('json') ? await res.json() : await res.text()
    } catch {
      body = null
    }

    if (!res.ok) {
      const errorMsg = typeof body === 'object' && body ? (body as Record<string, string>).message || (body as Record<string, string>).error || (body as Record<string, string>).msg || JSON.stringify(body) : String(body || res.statusText)
      console.error(`[CRM ERROR] ${res.status} ${opts.method || 'GET'} ${path} (${durationMs}ms)`)
      console.error(`[CRM ERROR] PIT prefix: ${pit.substring(0, 8)}...`)
      console.error(`[CRM ERROR] Response: ${typeof body === 'string' ? body.substring(0, 500) : JSON.stringify(body).substring(0, 500)}`)
      return {
        ok: false,
        status: res.status,
        data: body,
        error: `CRM ${res.status}: ${errorMsg}`,
        detail: `${opts.method || 'GET'} ${path} | PIT: ${pit.substring(0, 12)}... | Duration: ${durationMs}ms`,
      }
    }

    return { ok: true, status: res.status, data: body }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[CRM FETCH ERROR] ${opts.method || 'GET'} ${path}: ${errorMsg}`)
    return { ok: false, status: 502, data: null, error: `CRM connection failed: ${errorMsg}`, detail: `Fetch to ${url} threw` }
  }
}

// GET /api/agency — Fetch all sub-locations with stats
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized — not logged in' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Agency access requires admin role' }, { status: 403 })

  const companyId = process.env.CRM_COMPANY_ID || 'bknfhTkdDLapbwfZqQNi'

  // Log which PIT we're using
  const pit = getAgencyPIT()
  console.log(`[Agency API] GET locations | PIT: ${pit.substring(0, 15)}... | Company: ${companyId}`)

  const result = await crmFetch(`/locations/search?companyId=${companyId}&limit=100`)

  if (!result.ok) {
    return NextResponse.json({
      error: result.error,
      detail: result.detail,
      debug: {
        pitPrefix: pit.substring(0, 15),
        companyId,
        envVars: {
          CRM_AGENCY_PIT_NEW: process.env.CRM_AGENCY_PIT_NEW ? 'SET' : 'MISSING',
          CRM_PIT_RAW: process.env.CRM_PIT_RAW ? 'SET' : 'MISSING',
          CRM_AGENCY_PIT: process.env.CRM_AGENCY_PIT ? 'SET' : 'MISSING',
          CRM_COMPANY_ID: process.env.CRM_COMPANY_ID ? 'SET' : 'MISSING',
        },
      },
    }, { status: result.status })
  }

  const locData = result.data as Record<string, unknown>
  const locations = ((locData.locations || []) as Record<string, unknown>[]).map((loc) => ({
    id: loc.id,
    name: loc.name,
    email: loc.email,
    phone: loc.phone,
    address: loc.address || loc.city || '',
    website: loc.website || '',
    logoUrl: loc.logoUrl || '',
    settings: {
      timezone: loc.timezone || 'America/New_York',
      country: loc.country || 'US',
    },
  }))

  // Fetch contact counts (with error handling per location)
  const statsPromises = locations.slice(0, 20).map(async (loc) => {
    const r = await crmFetch(`/contacts/?locationId=${loc.id}&limit=1`)
    if (r.ok) {
      const d = r.data as Record<string, unknown>
      return { locationId: loc.id, contacts: (d.total as number) || ((d.contacts as unknown[])?.length) || 0 }
    }
    return { locationId: loc.id, contacts: 0, error: r.error }
  })

  const stats = await Promise.all(statsPromises)
  const statsMap = Object.fromEntries(stats.map(s => [s.locationId, s.contacts]))

  const enriched = locations.map((loc) => ({
    ...loc,
    contactCount: statsMap[loc.id as string] || 0,
  }))

  console.log(`[Agency API] Found ${enriched.length} locations`)

  return NextResponse.json({
    locations: enriched,
    total: enriched.length,
    companyId,
    agencyActive: true,
  })
}

// POST /api/agency — Detail fetches and bulk operations
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Agency access required' }, { status: 403 })

  const body = await req.json()
  const { action, locationId, locationIds, data } = body

  console.log(`[Agency API] POST action=${action} locationId=${locationId || 'N/A'}`)

  switch (action) {
    case 'get_location_detail': {
      const r = await crmFetch(`/locations/${locationId}`)
      if (!r.ok) return NextResponse.json({ error: r.error, detail: r.detail }, { status: r.status })
      const d = r.data as Record<string, unknown>
      return NextResponse.json({ location: d.location || d })
    }

    case 'get_pipelines': {
      const r = await crmFetch(`/opportunities/pipelines?locationId=${locationId}`)
      if (!r.ok) return NextResponse.json({ error: r.error, detail: r.detail }, { status: r.status })
      const d = r.data as Record<string, unknown>
      return NextResponse.json({ pipelines: (d.pipelines as unknown[]) || [] })
    }

    case 'get_calendars': {
      const r = await crmFetch(`/calendars/?locationId=${locationId}`)
      if (!r.ok) return NextResponse.json({ error: r.error, detail: r.detail }, { status: r.status })
      const d = r.data as Record<string, unknown>
      return NextResponse.json({ calendars: (d.calendars as unknown[]) || [] })
    }

    case 'get_users': {
      const r = await crmFetch(`/users/?locationId=${locationId}`)
      if (!r.ok) return NextResponse.json({ error: r.error, detail: r.detail }, { status: r.status })
      const d = r.data as Record<string, unknown>
      return NextResponse.json({ users: (d.users as unknown[]) || [] })
    }

    case 'get_conversations': {
      const r = await crmFetch(`/conversations/search?locationId=${locationId}&limit=20`, {
        method: 'POST',
        body: JSON.stringify({ locationId }),
      })
      if (!r.ok) return NextResponse.json({ error: r.error, detail: r.detail }, { status: r.status })
      const d = r.data as Record<string, unknown>
      return NextResponse.json({ conversations: (d.conversations as unknown[]) || [] })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
