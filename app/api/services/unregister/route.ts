/**
 * POST /api/services/unregister — Disconnect a WordPress site
 *
 * Called by 0nCore WordPress plugin on deactivation.
 * Auth: Bearer 0n_ token
 * Body: { site_id: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractToken } from '@/lib/0n-token'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const token = extractToken(req)
  if (!token) {
    return NextResponse.json(
      { error: 'Missing Bearer token. Provide Authorization: Bearer 0n_...' },
      { status: 401 }
    )
  }

  const ctx = await validateToken(token)
  if (!ctx) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { site_id } = body as { site_id?: string }

  if (!site_id) {
    return NextResponse.json(
      { error: 'Missing required field: site_id' },
      { status: 400 }
    )
  }

  const admin = getAdmin()

  const { error } = await admin
    .from('connected_services')
    .update({
      status: 'disconnected',
      last_seen_at: new Date().toISOString(),
    })
    .eq('user_id', ctx.userId)
    .eq('site_id', site_id)

  if (error) {
    console.error('[services/unregister] Update error:', error)
    return NextResponse.json(
      { error: `Unregister failed: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, disconnected: true })
}
