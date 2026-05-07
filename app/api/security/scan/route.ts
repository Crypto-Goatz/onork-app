/**
 * POST /api/security/scan
 *
 * Runs a virus scan for a registry target and returns the verdict.
 * Auth: signed-in user OR x-internal-secret header.
 *
 * Body: { target_type, target_id, target_url?, target_hash?, force? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { runScan, evaluateGate, type TargetType } from '@/lib/security/registry-scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TARGET_TYPES: TargetType[] = ['mcp', 'ucp_product', 'marketplace_app', 'user_mcp', 'extension']

export async function POST(req: NextRequest) {
  // Auth: either internal secret OR authenticated user
  const internalSecret = process.env.INTERNAL_DISPATCH_SECRET || ''
  const got = req.headers.get('x-internal-secret') || ''
  let internal = false
  if (internalSecret && got === internalSecret) {
    internal = true
  } else {
    const supabase = await createServerClient()
    const user = (await supabase.auth.getSession()).data.session?.user ?? null
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { target_type?: string; target_id?: string; target_url?: string; target_hash?: string; force?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const targetType = body.target_type as TargetType
  if (!targetType || !TARGET_TYPES.includes(targetType)) {
    return NextResponse.json(
      { error: `target_type must be one of ${TARGET_TYPES.join(', ')}` },
      { status: 400 },
    )
  }
  if (!body.target_id) {
    return NextResponse.json({ error: 'target_id required' }, { status: 400 })
  }
  if (!body.target_url && !body.target_hash) {
    return NextResponse.json({ error: 'target_url or target_hash required' }, { status: 400 })
  }

  try {
    const { scan, fresh } = await runScan({
      target_type: targetType,
      target_id: body.target_id,
      target_url: body.target_url,
      target_hash: body.target_hash,
      force: body.force,
    })
    return NextResponse.json({
      ok: true,
      fresh,
      gate: evaluateGate(scan),
      scan,
      internal,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'scan failed' },
      { status: 500 },
    )
  }
}
