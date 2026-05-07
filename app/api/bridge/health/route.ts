/**
 * GET /api/bridge/health — Check all connections for the authenticated user
 * POST /api/bridge/health — Run health checks and return results
 *
 * Auth: Bearer 0n_... token or Supabase session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { validateToken, extractToken } from '@/lib/0n-token'
import { getHealthSummary, checkAllConnections } from '@/lib/connection-health'

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

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const summary = await getHealthSummary(userId)
  return NextResponse.json(summary)
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results = await checkAllConnections(userId)
  const summary = await getHealthSummary(userId)

  return NextResponse.json({
    checked: results.length,
    results,
    summary,
  })
}
