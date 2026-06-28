/**
 * GET /api/cro9/variants?slot=hero_headline&site=0ncore
 *
 * Serves the current best copy variant for a slot using Thompson sampling
 * (Beta-Bernoulli) over impressions/conversions — so better-converting copy
 * is shown more often while still exploring new variants. Returns { variant }
 * or { variant: null } when no variants exist (caller renders its fallback).
 *
 * Read-only, open CORS (called from the homepage). Never cached.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, max-age=0',
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

// Marsaglia–Tsang gamma sampler (k > 0), used to draw Beta variates.
function sampleGamma(k: number): number {
  if (k < 1) return sampleGamma(1 + k) * Math.pow(Math.random(), 1 / k)
  const d = k - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x: number, v: number
    do {
      // Box–Muller normal
      const u1 = Math.random(), u2 = Math.random()
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = Math.random()
    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}
function sampleBeta(a: number, b: number): number {
  const x = sampleGamma(a), y = sampleGamma(b)
  return x / (x + y)
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const slot = sp.get('slot')
  const site = sp.get('site') || '0ncore'
  if (!slot) return NextResponse.json({ error: 'slot required' }, { status: 400, headers: CORS })

  const { data, error } = await admin
    .from('cro9_copy_variants')
    .select('id, content, impressions, conversions, is_control')
    .eq('site_slug', site).eq('slot', slot).eq('active', true)

  if (error) return NextResponse.json({ variant: null, error: error.message }, { headers: CORS })
  if (!data || data.length === 0) return NextResponse.json({ variant: null }, { headers: CORS })

  // Thompson sampling: draw a conversion-rate sample per variant, pick the max.
  let best = data[0]
  let bestScore = -1
  for (const v of data) {
    const successes = v.conversions
    const failures = Math.max(v.impressions - v.conversions, 0)
    const score = sampleBeta(successes + 1, failures + 1)
    if (score > bestScore) { bestScore = score; best = v }
  }

  return NextResponse.json(
    { variant: { id: best.id, slot, content: best.content } },
    { headers: CORS },
  )
}
