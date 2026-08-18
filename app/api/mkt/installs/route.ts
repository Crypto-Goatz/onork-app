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

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Verdict =
  | 'live'            // token present and in date — this one works
  | 'expiring'        // in date, but inside the hour
  | 'expired-refreshable'
  | 'expired-dead'    // expired AND no refresh token: only a reinstall fixes it
  | 'no-token'        // the row exists and the exchange never produced a token
  | 'dying'           // works today, cannot survive expiry — no refresh token
  | 'unknown-expiry'

interface Row {
  location_id: string
  company_id: string | null
  app_id: string | null
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  status: string | null
  updated_at: string | null
  // What the refresh worker LEARNED by attempting, as opposed to what this row
  // looks like at rest. 'revoked' is a fact no other column can express.
  health_status: string | null
}

function verdictFor(r: Row): { verdict: Verdict; why: string } {
  if (!r.access_token) {
    return {
      verdict: 'no-token',
      why: 'The install completed but the code was never exchanged for a token. This account cannot be written to.',
    }
  }
  if (!r.expires_at) return { verdict: 'unknown-expiry', why: 'No expiry recorded, so this token cannot be trusted or refreshed on schedule.' }

  const ms = new Date(r.expires_at).getTime() - Date.now()

  // Caught BEFORE it dies. An install with no refresh token works perfectly
  // today and is unrecoverable tomorrow — waiting for expiry to report it is
  // how 26 of these went unnoticed until a customer complained.
  if (ms > 0 && !r.refresh_token) {
    return {
      verdict: 'dying',
      why: 'Works now, but no refresh token was ever stored — this stops at expiry and needs a reinstall. Catch it before then.',
    }
  }

  if (ms > 60 * 60 * 1000) return { verdict: 'live', why: 'Token present and in date.' }
  if (ms > 0) return { verdict: 'expiring', why: 'Token expires within the hour.' }

  // The distinction that matters most. One of these is a background job's
  // problem; the other needs the customer to reinstall, and telling them apart
  // is the difference between a fix and a support queue.
  //
  // A REFRESH TOKEN BEING PRESENT IS NOT THE SAME AS IT WORKING, and reading
  // this row alone cannot tell you which. Two installs here held long, entirely
  // well-formed refresh tokens whose issuing client matched the one we present,
  // against credentials proven valid — and the CRM rejected both, because it had
  // revoked the authorization. Nothing about the stored row shows that. Only an
  // attempt does, so the worker records its verdict and this trusts it over the
  // optimistic guess.
  if (r.health_status === 'revoked') {
    return {
      verdict: 'expired-dead',
      why: 'The CRM has revoked this authorization — the refresh was attempted and rejected. Credentials are valid; only a reinstall restores it.',
    }
  }

  return r.refresh_token
    ? { verdict: 'expired-refreshable', why: 'Expired, but a refresh token is on file and has not been rejected — the refresh worker can recover this.' }
    : { verdict: 'expired-dead', why: 'Expired with NO refresh token on file. Nothing can recover this; the account must reinstall.' }
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
      hasToken: verdict === 'live' || verdict === 'expiring' || verdict === 'dying',
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
