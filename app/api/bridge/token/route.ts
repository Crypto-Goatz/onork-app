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
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
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
    const name: string | undefined = body.name

    // Resolve the user's primary CRM location for this token
    const supabase = await createServerClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('crm_location_id')
      .eq('id', userId)
      .maybeSingle()

    const locationId: string | null = body.locationId || profile?.crm_location_id || null
    if (!locationId) {
      return NextResponse.json(
        { error: 'No CRM location on file. Connect your CRM first, or pass locationId in the request body.' },
        { status: 400 }
      )
    }

    const token = await generateToken({
      userId,
      locationId,
      name,
      channel,
      scopes,
      metadata,
    })

    return NextResponse.json({
      token,
      locationId,
      warning: 'This token is shown only once. Store it securely. Use it as: Authorization: Bearer <token>, X-Location-Id: <locationId>.',
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
  const tokenId: string | undefined = body.tokenId || body.id
  if (!tokenId) return NextResponse.json({ error: 'Missing tokenId' }, { status: 400 })

  const ok = await revokeToken(tokenId, userId)
  if (!ok) return NextResponse.json({ error: 'Revoke failed' }, { status: 500 })

  return NextResponse.json({ revoked: true, tokenId })
}
