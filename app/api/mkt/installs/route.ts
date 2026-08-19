/**
 * GET /api/mkt/installs — the install registry, per app, with health visible.
 *
 * WHY THIS IS THE FIRST PIECE OF A1. Two apps have shipped installs that hold
 * no usable token — 42 on one, zero rows on another — and nobody found out from
 * the product. They found out from a customer. There was no surface anywhere
 * that answered "is this account actually connected, and to which app", so a
 * silent failure stayed silent for as long as nobody complained.
 *
 * THE PREMISE IN THE PLAN NEEDS CORRECTING, and this endpoint is how it gets
 * checked rather than argued. A1 was written as "crm_installations has never
 * worked, replace it". Reading the write path, that is not what the evidence
 * says: the callback upserts correctly on (location_id, app_id), logs health,
 * and syncs a snapshot. Rows exist — they are EXPIRED, which means writes
 * succeeded and refresh did not. A table that writes fine and holds stale rows
 * is not a table that has never worked; it is a refresh bug wearing a storage
 * bug's clothes. Replacing it would move the same bug into a new table.
 *
 * So this reads what is there and says plainly what is wrong with each row.
 *
 * IT NEVER RETURNS A TOKEN. Presence, shape and expiry are enough to diagnose
 * every failure mode below, and an endpoint that hands out access tokens is a
 * worse problem than the one it was built to solve.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'
import { verdictFor, isUsable, type InstallVerdictRow } from '@/lib/crm/install-verdict'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * THE VERDICT LADDER LIVES IN lib/crm/install-verdict.ts, not here.
 *
 * It moved because the re-consent-on-open prompt asks the same seven-state
 * question this endpoint asks — "can this install still do anything" — and a
 * second copy of the ladder is how one surface starts calling a row dying while
 * another still calls it live. This endpoint is the operator's view of that
 * shared verdict; /x/[slug] is the customer's.
 */
interface Row extends InstallVerdictRow {
  location_id: string
  company_id: string | null
  app_id: string | null
  status: string | null
  updated_at: string | null
}

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  const locationId = req.nextUrl.searchParams.get('locationId')?.trim()
  const appId = req.nextUrl.searchParams.get('appId')?.trim()

  let q = db
    .from('crm_installations')
    .select('location_id, company_id, app_id, access_token, refresh_token, expires_at, status, updated_at, health_status')
    .order('updated_at', { ascending: false })
    .limit(500)
  if (locationId) q = q.eq('location_id', locationId)
  if (appId) q = q.eq('app_id', appId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as Row[]
  const installs = rows.map((r) => {
    const { verdict, why } = verdictFor(r)
    return {
      locationId: r.location_id,
      companyId: r.company_id,
      appId: r.app_id,
      status: r.status,
      expiresAt: r.expires_at,
      updatedAt: r.updated_at,
      // The field the smoke test asserts on. "A row exists" was never the
      // question; "can this row do anything" is.
      // 'dying' still works, so it counts as usable — but it is reported
      // separately below, because "usable" and "safe" are different questions.
      hasToken: isUsable(verdict),
      verdict,
      why,
    }
  })

  // Per app, because one app being broken must be visible as ONE app being
  // broken. A single blended number is how four listings share a failure and
  // nobody can tell which one is at fault.
  const byApp: Record<string, { total: number; live: number; dying: number; dead: number; noToken: number }> = {}
  for (const i of installs) {
    const key = i.appId || 'unknown'
    byApp[key] ||= { total: 0, live: 0, dying: 0, dead: 0, noToken: 0 }
    byApp[key].total++
    if (i.hasToken) byApp[key].live++
    if (i.verdict === 'dying') byApp[key].dying++
    if (i.verdict === 'expired-dead') byApp[key].dead++
    if (i.verdict === 'no-token') byApp[key].noToken++
  }

  const live = installs.filter((i) => i.hasToken).length
  return NextResponse.json({
    total: installs.length,
    live,
    // Said out loud rather than left to be inferred from two numbers.
    healthy: installs.length > 0 && live === installs.length,
    byApp,
    installs,
    ...(installs.length && live === 0
      ? { alert: 'Every install on file is unusable. This is the shape of a token exchange that has never succeeded, not of customers churning.' }
      : {}),
  })
}
