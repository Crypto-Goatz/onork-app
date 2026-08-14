/**
 * GET  /api/snapshot/template?locationId= — what the template still needs.
 * POST /api/snapshot/template            — create everything scriptable.
 *
 * GET is a dry run. Both return the manual steps, because the useful output is
 * not "done" but "here is precisely what a human still has to draw".
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { buildTemplate, TEMPLATE_FIELDS, TEMPLATE_TAGS } from '@/lib/snapshot/template'
import { VERBS } from '@/lib/crm/router'
import { MANAGED_VALUES } from '@/lib/snapshot/backfill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function GET(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  return NextResponse.json({
    willCreate: {
      fields: TEMPLATE_FIELDS.map((f) => f.name),
      tags: TEMPLATE_TAGS,
      values: MANAGED_VALUES.map((v) => v.name),
    },
    verbs: VERBS,
    cannotScript: [
      'Workflows — POST /workflows/ returns 404. Hand-built once.',
      'Snapshot creation — the Snapshots API has no create endpoint.',
    ],
    note: 'POST with { locationId } to build. Idempotent; never deletes.',
  })
}

export async function POST(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const locationId = String(body?.locationId ?? '').trim()
  if (!locationId) return NextResponse.json({ error: 'Which location is the template?' }, { status: 400 })

  // Scoped to this agency's own connected locations — a template is built in a
  // location you already hold a key for, never an arbitrary id.
  const { createServiceClient } = await import('@/lib/connect/service-client')
  const db = createServiceClient()
  const { data: conn } = await (db
    ? db.from('location_connections').select('location_id')
        .eq('company_id', s.claims.companyId).eq('location_id', locationId)
        .eq('status', 'active').maybeSingle()
    : Promise.resolve({ data: null }))
  if (!conn) return NextResponse.json({ error: 'That location is not a connected client of yours.' }, { status: 404 })

  return NextResponse.json(await buildTemplate(locationId))
}
