/**
 * POST /api/auth/generate-token
 *
 * Admin-only. Generates (or rotates) the universal 0n_live_ access token
 * for a user and writes it to profiles.access_token. The raw token is
 * returned exactly once.
 *
 * Body: { userId: string }
 * Response: { token: "0n_live_..." }
 *
 * Self-rotation: if `userId` is omitted, the caller's own profile is
 * rotated (any authenticated user can rotate their own token).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-gate'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { generateProfileToken } from '@/lib/0n-token'

export async function POST(req: NextRequest) {
  let body: { userId?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const targetUserId = body.userId?.trim()

  // Self-rotation path: no userId => rotate the caller's own token.
  if (!targetUserId) {
    const sb = await createServerClient()
    const { data: { session } } = await sb.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    try {
      const token = await generateProfileToken(session.user.id)
      return NextResponse.json({ token })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'generation failed' },
        { status: 500 },
      )
    }
  }

  // Admin path: minting/rotating for another user.
  const gate = await verifyAdmin()
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error ?? 'forbidden' },
      { status: gate.userId ? 403 : 401 },
    )
  }

  try {
    const token = await generateProfileToken(targetUserId)
    return NextResponse.json({ token })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'generation failed' },
      { status: 500 },
    )
  }
}
