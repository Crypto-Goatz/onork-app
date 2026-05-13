/**
 * POST /api/auth/validate-token
 *
 * Public. Any platform (MCP, Chrome extension, Slack, WordPress, custom
 * API caller) hits this with a 0n_live_ token and gets back the bound
 * profile or an error. Same validator as the in-process `validateProfileToken`
 * / `resolveToken` helpers in lib/0n-token.ts — the lib is the source of
 * truth; this endpoint exposes it over HTTP for non-Node clients.
 *
 * Body: { token: "0n_live_..." }
 * Response (valid):   { valid: true, source: "profile" | "api_tokens", profile: {...} }
 * Response (invalid): { valid: false, error: "..." }
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveToken, extractToken } from '@/lib/0n-token'

export async function POST(req: NextRequest) {
  let token: string | null = null

  try {
    const body = await req.json()
    if (typeof body?.token === 'string') token = body.token.trim()
  } catch {
    // body optional — fall through to header/query extraction
  }

  if (!token) token = extractToken(req)

  if (!token) {
    return NextResponse.json({ valid: false, error: 'no token provided' }, { status: 400 })
  }

  const result = await resolveToken(token)

  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 401 })
  }

  // Profile model: return the full profile row.
  if (result.source === 'profile' && result.profile) {
    const { access_token: _redact, ...safe } = result.profile as Record<string, unknown>
    return NextResponse.json({ valid: true, source: 'profile', profile: safe })
  }

  // api_tokens model: return the token context (no profile attached).
  return NextResponse.json({
    valid: true,
    source: 'api_tokens',
    userId: result.userId,
    context: result.context,
  })
}

// GET form for trivial smoke tests / curl-from-anywhere.
export async function GET(req: NextRequest) {
  const token = extractToken(req)
  if (!token) {
    return NextResponse.json({ valid: false, error: 'no token provided' }, { status: 400 })
  }
  const result = await resolveToken(token)
  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 401 })
  }
  if (result.source === 'profile' && result.profile) {
    const { access_token: _redact, ...safe } = result.profile as Record<string, unknown>
    return NextResponse.json({ valid: true, source: 'profile', profile: safe })
  }
  return NextResponse.json({
    valid: true,
    source: 'api_tokens',
    userId: result.userId,
    context: result.context,
  })
}
