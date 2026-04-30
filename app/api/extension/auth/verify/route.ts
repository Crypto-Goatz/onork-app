/**
 * POST /api/extension/auth/verify
 *
 * Body: { token: '0n_live_…' }
 *
 * The Chrome extension calls this once after the user pastes their token
 * to confirm it's valid + return profile info to display in the popup.
 *
 * No auth header required — the token IS the auth.
 *
 * CORS: open. The extension fetches from chrome-extension:// origin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/0n-token'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  let body: { token?: string }
  try { body = await req.json() } catch { body = {} }

  const token = body.token?.trim() ?? ''
  if (!token) {
    return NextResponse.json({ valid: false, error: 'token required' }, { status: 400, headers: CORS })
  }

  const ctx = await validateToken(token)
  if (!ctx) {
    return NextResponse.json(
      { valid: false, error: 'Token invalid, revoked, or expired.' },
      { status: 401, headers: CORS }
    )
  }

  // Pull a tiny profile snapshot for the popup to display
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await sb
    .from('profiles')
    .select('email, full_name, avatar_url, crm_location_id')
    .eq('id', ctx.userId)
    .maybeSingle()

  return NextResponse.json(
    {
      valid: true,
      user: {
        id: ctx.userId,
        email: profile?.email ?? null,
        name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        location_id: ctx.locationId,
      },
      scopes: ctx.scopes,
      channel: ctx.channel,
    },
    { headers: CORS }
  )
}
