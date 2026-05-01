/**
 * POST /api/scanner/analyze
 *
 * Server-side gap analysis for the Stack Scanner.
 * - Augments client-side detection with response-host signals.
 * - Computes gaps + stack_gap_score per spec §3.4.
 * - Calls scanner_recommend (Groq) for ranked recommendations.
 * - Persists the scan into stack_scans (RLS-scoped to caller).
 *
 * Auth: prefers Bearer 0n_ token; falls back to anonymous insert
 * (RLS will reject it). Browser extension is the primary caller.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recommendForGaps } from '@/lib/scanner/recommend'
import { validateToken } from '@/lib/0n-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const REQUIRED_CATEGORIES = ['analytics', 'crm', 'email']

interface AnalyzeBody {
  url?: string
  hostname?: string
  detected?: Record<string, Array<{ id: string; name: string; category: string; evidence?: unknown[] }>>
  network_hosts?: string[]
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function computeGaps(by_category: AnalyzeBody['detected']) {
  const gaps: string[] = []
  for (const c of REQUIRED_CATEGORIES) {
    if (!by_category?.[c] || by_category[c].length === 0) gaps.push(c)
  }
  const detectedCategories = by_category
    ? Object.values(by_category).filter((v) => v.length > 0).length
    : 0
  const bonus = detectedCategories >= 5 ? 1 : 0
  // Weak match detection (mirror of client gap-rules)
  const weakMatches: number =
    by_category?.analytics?.some((h) => h.id === 'ga4') &&
    !by_category?.analytics?.some((h) => h.id === 'gtm')
      ? 1
      : 0
  let score = 100 - gaps.length * 8 - weakMatches * 4 + bonus * 2
  if (score < 0) score = 0
  if (score > 100) score = 100
  return { gaps, weakMatches, score }
}

export async function POST(req: NextRequest) {
  let body: AnalyzeBody
  try {
    body = (await req.json()) as AnalyzeBody
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }
  const url = body.url
  const hostname = body.hostname
  if (!url || !hostname) {
    return NextResponse.json(
      { ok: false, error: 'url and hostname required' },
      { status: 400 },
    )
  }

  const detected = body.detected ?? {}
  const network_hosts = Array.isArray(body.network_hosts) ? body.network_hosts : []

  // Compute gaps + score
  const { gaps, score } = computeGaps(detected)

  // Recommendations via Groq
  const recommendations = await recommendForGaps({
    detected: detected as never,
    gaps,
    hostname,
  })

  // Persist (only if we can resolve a user — otherwise return without saving)
  let scanId: string | null = null
  try {
    const auth = req.headers.get('authorization') || ''
    const tokenMatch = auth.match(/^Bearer\s+(0n_\S+)/)
    const ctx = tokenMatch ? await validateToken(tokenMatch[1]) : null
    const userId = ctx?.userId ?? null
    if (userId) {
      const sb = admin()
      const { data, error } = await sb
        .from('stack_scans')
        .insert({
          user_id: userId,
          url,
          hostname,
          detected,
          network_hosts,
          gaps,
          recommendations,
          stack_gap_score: score,
        })
        .select('id')
        .single()
      if (!error && data) scanId = data.id
    }
  } catch (e) {
    console.warn('[analyze] persist skipped:', (e as Error).message)
  }

  return NextResponse.json({
    ok: true,
    scanId,
    gaps,
    recommendations,
    stack_gap_score: score,
  })
}
