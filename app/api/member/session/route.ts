import { NextRequest, NextResponse } from 'next/server'
import { readMemberLink, mintMemberSession } from '@/lib/member/token'

/**
 * POST /api/member/session — trade a portal link for a short session.
 *
 * The link can sit in an inbox for a fortnight; the session it buys lasts two
 * hours. That is the whole point of the exchange — a forwarded email should not
 * be a permanent key to someone's profile.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const claims = readMemberLink(typeof body?.link === 'string' ? body.link : null)
  if (!claims) {
    // One message for expired, forged and malformed alike.
    return NextResponse.json({ ok: false, error: 'This link is not valid any more.' }, { status: 401, headers: CORS })
  }
  return NextResponse.json({
    ok: true,
    session: mintMemberSession(claims.contactId, claims.locationId),
  }, { headers: CORS })
}
