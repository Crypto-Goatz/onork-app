/**
 * GET / PUT /api/dashboard/layout — the operator's own arrangement of tools.
 *
 * PER USER, NOT PER COMPANY. Two people at one agency do different jobs; making
 * them share a layout means the second one to arrange it wins and the first
 * quietly stops using the feature.
 *
 * The server stores an ORDER, never a catalogue. Which tools exist comes from
 * the registry at render time — so a tool that is removed, renamed or newly
 * installed is reflected immediately instead of being frozen into someone's
 * saved layout.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const db = createServiceClient()
  if (!db) return NextResponse.json({ tiles: null })

  const { data } = await db
    .from('dashboard_layouts')
    .select('tiles')
    .eq('company_id', s.claims.companyId)
    .eq('user_id', s.claims.sub)
    .eq('surface', 'command')
    .maybeSingle()

  // null, not [], so the client can tell "never arranged" from "deliberately empty".
  return NextResponse.json({ tiles: data?.tiles ?? null })
}

export async function PUT(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const tiles = Array.isArray(body?.tiles) ? body.tiles.slice(0, 60).map((t: unknown) => String(t)) : null
  if (!tiles) return NextResponse.json({ error: 'Send an array of tile ids.' }, { status: 400 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  await db.from('dashboard_layouts').upsert(
    {
      company_id: s.claims.companyId, user_id: s.claims.sub, surface: 'command',
      tiles, updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,user_id,surface' },
  )
  return NextResponse.json({ ok: true, count: tiles.length })
}
