/**
 * POST /api/cro9/variants/track   { id, type: 'impression' | 'conversion' }
 *
 * Records an impression (variant shown) or conversion (CTA clicked) against a
 * copy variant. These counters drive the Thompson-sampling selection in
 * GET /api/cro9/variants. Open CORS; fire-and-forget from the browser.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 5

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  let body: { id?: string; type?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400, headers: CORS }) }
  const { id, type } = body
  if (!id || (type !== 'impression' && type !== 'conversion')) {
    return NextResponse.json({ error: 'id and valid type required' }, { status: 400, headers: CORS })
  }
  const { error } = await admin.rpc('cro9_bump_variant', { p_id: id, p_field: type })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: CORS })
  return NextResponse.json({ ok: true }, { headers: CORS })
}
