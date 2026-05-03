/**
 * /api/ai/packs/[locationId] — list + deactivate prompt packs.
 *
 *   GET     → { available: PackId[], active: PackId[] }
 *   DELETE  → body { packId } deactivates a pack (sets is_active=false).
 *
 * Activation lives at /api/ai/packs/[locationId]/activate.
 *
 * Spec: docs/0ncore-ai-agent-architecture.md
 */

import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { listPacks, deactivatePack } from '@/lib/ai/store'
import { isPackId } from '@/lib/ai/k-layers/packs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await ctx.params
  if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const packs = await listPacks(locationId)
  return NextResponse.json(packs)
}

export async function DELETE(req: Request, ctx: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await ctx.params
  if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { packId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const packId = body.packId?.trim()
  if (!packId || !isPackId(packId)) {
    return NextResponse.json({ error: 'invalid packId' }, { status: 400 })
  }

  await deactivatePack(locationId, packId)
  return NextResponse.json({ ok: true, packId, is_active: false })
}
