import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { widget, WIDGETS, embedTag } from '@/lib/widgets/registry'
import { listAgencyLocations } from '@/lib/crm/locations'

/**
 * Widget configuration, scoped to the agency's JWT.
 * GET  /api/widgets/config/all      — every widget + its state
 * GET  /api/widgets/config/:key     — one widget, per location
 * POST /api/widgets/config/:key     — enable/disable and set copy
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const companyId = session.claims.companyId
  const { key } = await ctx.params

  const { data } = await admin()
    .from('widget_configs')
    .select('widget_key, location_id, enabled, config')
    .eq('company_id', companyId)

  const rows = data ?? []

  if (key === 'all') {
    return NextResponse.json({
      ok: true,
      widgets: WIDGETS.map((w) => {
        const mine = rows.filter((r) => r.widget_key === w.key)
        return {
          key: w.key, name: w.name, cls: w.cls, delivery: w.delivery, blurb: w.blurb,
          live: w.live, pending: w.pending, fields: w.fields,
          enabledCount: mine.filter((m) => m.enabled).length,
          embedTag: w.delivery === 'embed' ? embedTag(w.key) : null,
        }
      }),
    })
  }

  const w = widget(key)
  if (!w) return NextResponse.json({ error: 'Unknown widget.' }, { status: 404 })
  const { locations } = await listAgencyLocations(companyId)
  const byLoc = new Map(rows.filter((r) => r.widget_key === key).map((r) => [r.location_id, r]))

  return NextResponse.json({
    ok: true,
    widget: { key: w.key, name: w.name, blurb: w.blurb, fields: w.fields, live: w.live, pending: w.pending, delivery: w.delivery },
    embedTag: w.delivery === 'embed' ? embedTag(w.key) : null,
    locations: locations.map((l) => {
      const r = byLoc.get(l.id)
      return { id: l.id, name: l.name, enabled: Boolean(r?.enabled), config: r?.config ?? {} }
    }),
  })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { key } = await ctx.params
  const w = widget(key)
  if (!w) return NextResponse.json({ error: 'Unknown widget.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const locationId = String(body?.locationId ?? '')
  if (!locationId) return NextResponse.json({ error: 'Pick a client.' }, { status: 400 })

  // The client must belong to the asking agency — otherwise this is a way to
  // switch widgets on inside someone else's account.
  const { locations } = await listAgencyLocations(session.claims.companyId)
  if (!locations.some((l) => l.id === locationId)) {
    return NextResponse.json({ error: 'No such client on this agency.' }, { status: 404 })
  }
  if (body?.enabled && !w.live) {
    return NextResponse.json({ error: `${w.name} is not finished yet.` }, { status: 400 })
  }

  // Only declared fields are stored — a config blob is rendered onto a public
  // page, so it must never carry anything the widget did not ask for.
  const allowed = new Set(w.fields.map((f) => f.key))
  const incoming = (body?.config && typeof body.config === 'object' ? body.config : {}) as Record<string, unknown>
  const config: Record<string, string> = {}
  for (const [k, v] of Object.entries(incoming)) {
    if (allowed.has(k) && typeof v === 'string') config[k] = v.slice(0, 400)
  }

  const { error } = await admin().from('widget_configs').upsert({
    company_id: session.claims.companyId,
    location_id: locationId,
    widget_key: key,
    enabled: Boolean(body?.enabled),
    config,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error('[widgets/config]', error)
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
