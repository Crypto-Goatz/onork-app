/**
 * GET /api/sxo/site?id=… — the graph for one crawled site.
 *
 * Returns nodes and edges ready for the canvas, scoped to the caller's company.
 * A site id belonging to another agency returns 404, not 403: confirming that an
 * id exists is itself information.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const id = (req.nextUrl.searchParams.get('id') || '').trim()
  if (!id) return NextResponse.json({ error: 'Which site?' }, { status: 400 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  const { data: site } = await db
    .from('sxo_crawl_sites')
    .select('id, domain, score, pages_found, last_crawled_at')
    .eq('id', id)
    .eq('company_id', s.claims.companyId)
    .maybeSingle()
  if (!site) return NextResponse.json({ error: 'No such site.' }, { status: 404 })

  const [{ data: pages }, { data: edges }] = await Promise.all([
    db.from('sxo_crawl_pages')
      .select('url, path, depth, status_code, title, score, severity, issues, node_type, word_count, response_ms')
      .eq('site_id', id).order('depth').limit(1000),
    db.from('sxo_crawl_edges').select('source_url, target_url').eq('site_id', id).limit(4000),
  ])

  const counts = { red: 0, amber: 0, green: 0, grey: 0 }
  for (const p of pages ?? []) counts[(p.severity as keyof typeof counts) ?? 'grey']++

  return NextResponse.json({ site, pages: pages ?? [], edges: edges ?? [], counts })
}
