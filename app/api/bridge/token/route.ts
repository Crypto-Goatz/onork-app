/**
 * POST /api/bridge/token — Generate a new 0n token
 * GET  /api/bridge/token — List user's tokens
 *
 * Auth: Supabase session (dashboard) or existing 0n token
 * The raw token is returned ONCE at creation. It cannot be retrieved again.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { generateToken, listUserTokens, revokeToken, validateToken, extractToken } from '@/lib/0n-token'

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const token = extractToken(req)
  if (token) {
    const ctx = await validateToken(token)
    if (ctx) return ctx.userId
  }
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const channel = body.channel || 'dashboard'
    const scopes = body.scopes || ['read', 'write', 'execute']
    const metadata = body.metadata || {}

    const token = await generateToken(userId, channel, scopes, metadata)

    return NextResponse.json({
      token,
      warning: 'This token is shown only once. Store it securely.',
      channel,
      scopes,
    })
  } catch (err) {
    console.error('[bridge/token] Error:', err)
    return NextResponse.json({ error: 'Token generation failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tokens = await listUserTokens(userId)
  return NextResponse.json({
    tokens: tokens.map(t => ({
      id: t.id,
      name: t.name,
      prefix: t.token_prefix,
      channel: t.channel,
      scopes: t.scopes,
      lastUsed: t.last_used_at,
      created: t.created_at,
      active: !t.revoked,
    })),
  })
}

export async function DELETE(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { tokenPrefix } = body
  if (!tokenPrefix) return NextResponse.json({ error: 'Missing tokenPrefix' }, { status: 400 })

  const ok = await revokeToken(tokenPrefix, userId)
  if (!ok) return NextResponse.json({ error: 'Revoke failed' }, { status: 500 })

  return NextResponse.json({ revoked: true, tokenPrefix })
}
