import { NextRequest, NextResponse } from 'next/server'
import {
  drAdmin,
  buildScriptTag,
  generateSiteId,
  generateScriptKey,
  normalizeDomain,
  type DrDomain,
} from '@/lib/dr/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function originFor(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'www.0ncore.com'
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const locationId = req.nextUrl.searchParams.get('locationId')
  if (!locationId) {
    return NextResponse.json({ ok: false, error: 'locationId required' }, { status: 400 })
  }

  const { data, error } = await drAdmin()
    .from('dr_domains')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const origin = originFor(req)
  const domains = (data as DrDomain[]).map((d) => ({
    id: d.id,
    domain: d.domain,
    siteId: d.site_id,
    scriptKey: d.script_key,
    isActive: d.is_active,
    createdAt: d.created_at,
    scriptTag: buildScriptTag(d.site_id, origin),
  }))

  return NextResponse.json({ ok: true, domains })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { locationId?: string; domain?: string } | null
  if (!body?.locationId || !body?.domain) {
    return NextResponse.json({ ok: false, error: 'locationId and domain required' }, { status: 400 })
  }

  const domain = normalizeDomain(body.domain)
  if (!domain) {
    return NextResponse.json({ ok: false, error: 'invalid domain format' }, { status: 400 })
  }

  const supabase = drAdmin()

  const { data: existing } = await supabase
    .from('dr_domains')
    .select('site_id')
    .eq('location_id', body.locationId)
    .eq('domain', domain)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { ok: false, error: 'domain already registered for this location' },
      { status: 409 },
    )
  }

  const siteId = generateSiteId(domain)
  const scriptKey = generateScriptKey()

  const { data, error } = await supabase
    .from('dr_domains')
    .insert({
      location_id: body.locationId,
      domain,
      site_id: siteId,
      script_key: scriptKey,
      is_active: true,
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message || 'insert failed' }, { status: 500 })
  }

  const origin = originFor(req)
  const row = data as DrDomain
  return NextResponse.json({
    ok: true,
    id: row.id,
    siteId: row.site_id,
    scriptKey: row.script_key,
    domain: row.domain,
    scriptTag: buildScriptTag(row.site_id, origin),
  })
}
