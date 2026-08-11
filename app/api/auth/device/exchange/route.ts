/**
 * POST /api/auth/device/exchange — device token in, short app JWT out.
 *
 * This is the seam that lets an extension hold a long-lived, revocable
 * credential while every downstream route keeps checking the same 15-minute app
 * JWT it already checks. Nothing else has to learn about device tokens.
 *
 * Revocation actually bites here: the device token is looked up on every
 * exchange, so revoking it stops new JWTs within one token lifetime rather than
 * whenever a cache happens to expire.
 *
 * NO SESSION COOKIE REQUIRED, by design — an extension has no Supabase session.
 * The bearer device token IS the credential, which is exactly why it must be
 * hashed at rest and revocable.
 */
import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/0n-token'
import { issueAppJwt } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Minutes. Matches the iframe token — the extension re-exchanges as needed. */
const TTL_SECONDS = 15 * 60

function bearer(req: NextRequest): string {
  const h = req.headers.get('authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7).trim() : ''
}

export async function POST(req: NextRequest) {
  const raw = bearer(req)
  if (!raw) return NextResponse.json({ error: 'No device key supplied.' }, { status: 401 })

  const ctx = await validateToken(raw)
  if (!ctx) {
    // One message for expired, revoked and never-valid on purpose — telling a
    // caller WHICH of those it is helps an attacker enumerate.
    return NextResponse.json({ error: 'That device key is not valid.' }, { status: 401 })
  }

  // The agency this device belongs to. The app JWT is scoped to a company, and
  // the device token only carries a user + location, so resolve it here rather
  // than trusting anything in the request.
  const db = createServiceClient()
  let companyId: string | null = null
  if (db) {
    const { data } = await db
      .from('agency_connections')
      .select('company_id')
      .eq('user_id', ctx.userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    companyId = data?.company_id ?? null
  }
  if (!companyId) {
    return NextResponse.json(
      { error: 'This account is not connected to an agency yet.' },
      { status: 403 },
    )
  }

  const token = issueAppJwt(
    { sub: ctx.userId, companyId, activeLocationId: ctx.locationId },
    TTL_SECONDS,
  )

  return NextResponse.json({
    token,
    expiresIn: TTL_SECONDS,
    locationId: ctx.locationId,
  })
}
