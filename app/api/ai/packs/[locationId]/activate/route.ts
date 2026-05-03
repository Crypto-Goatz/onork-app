/**
 * /api/ai/packs/[locationId]/activate — turn on a prompt pack.
 *
 *   POST body: { packId, expiresAt? (ISO 8601) }
 *
 * Phase 1 wires activation only — Phase 5 adds Stripe billing. Idempotent:
 * activating an already-active pack just refreshes activated_at + expires.
 *
 * Spec: docs/0ncore-ai-agent-architecture.md
 */

import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { activatePack } from '@/lib/ai/store'
import { isPackId } from '@/lib/ai/k-layers/packs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, ctx: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await ctx.params
  if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { packId?: string; expiresAt?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const packId = body.packId?.trim()
  if (!packId || !isPackId(packId)) {
    return NextResponse.json({ error: 'invalid packId' }, { status: 400 })
  }

  let expiresAt: string | null = null
  if (body.expiresAt) {
    const parsed = Date.parse(body.expiresAt)
    if (!Number.isFinite(parsed)) {
      return NextResponse.json({ error: 'expiresAt must be ISO 8601' }, { status: 400 })
    }
    expiresAt = new Date(parsed).toISOString()
  }

  const row = await activatePack(locationId, packId, expiresAt)
  return NextResponse.json({ ok: true, pack: row })
}
