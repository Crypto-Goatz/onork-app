import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { personalize } from '@/lib/builder/personalize'
import type { PageSpec, VisitorSignal } from '@/lib/builder/blocks'

/**
 * POST /api/personalize — called from a published page, per visitor.
 *
 * PUBLIC BY NECESSITY. It runs on a stranger's browser on a client's website,
 * so it can never be authenticated. That shapes everything:
 *
 *   • the page spec is loaded BY ID from our own store, never accepted from the
 *     request — otherwise anyone could post their own prompt and use the
 *     agency's model budget to generate whatever they liked
 *   • rate-limited per page
 *   • it only ever RETURNS TEXT. No tools, no writes, nothing that touches a
 *     CRM. The worst a hostile caller achieves is some wasted tokens.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

const hits = new Map<string, { n: number; resetAt: number }>()
function throttled(k: string) {
  const now = Date.now()
  const r = hits.get(k)
  if (!r || now > r.resetAt) { hits.set(k, { n: 1, resetAt: now + 60_000 }); if (hits.size > 5000) hits.clear(); return false }
  r.n += 1
  return r.n > 30
}

const str = (v: unknown, max = 80) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const pageId = str(body?.pageId, 64)
  if (!pageId) return NextResponse.json({ ok: false, error: 'No page.' }, { status: 400, headers: CORS })
  if (throttled(pageId)) return NextResponse.json({ ok: false, blocks: {} }, { status: 429, headers: CORS })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data } = await sb.from('builder_pages').select('spec, live').eq('id', pageId).maybeSingle()
  if (!data?.spec || data.live === false) {
    // Silent: the page still shows its published copy, which is the whole
    // point of the fallback rule.
    return NextResponse.json({ ok: true, blocks: {}, provider: 'fallback' }, { headers: CORS })
  }

  // Only the signals we declared. Anything else a caller invents is ignored
  // rather than reaching the prompt.
  const visitor: VisitorSignal = {
    name: str(body?.visitor?.name, 60),
    company: str(body?.visitor?.company, 80),
    industry: str(body?.visitor?.industry, 60),
    expertise: (['novice', 'business', 'expert'] as const).find((e) => e === body?.visitor?.expertise),
    scrollDepth: num(body?.visitor?.scrollDepth),
    dwellSeconds: num(body?.visitor?.dwellSeconds),
    exitIntent: body?.visitor?.exitIntent === true,
    returning: body?.visitor?.returning === true,
  }

  const result = await personalize(data.spec as PageSpec, visitor)
  return NextResponse.json({ ok: true, ...result }, {
    headers: { ...CORS, 'Cache-Control': 'no-store' },
  })
}
