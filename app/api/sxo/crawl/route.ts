/**
 * POST /api/sxo/crawl  — crawl a site for the signed-in agency.
 * GET  /api/sxo/crawl  — the sites this agency has crawled.
 *
 * MULTI-TENANT BY THE TOKEN, NEVER BY A QUERY PARAM. companyId comes from the
 * verified app JWT. A ?companyId= or ?locationId= that disagreed would be a
 * tenancy hole, so it is simply not read.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'
import { crawlSite } from '@/lib/sxo/crawler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })
  const { data } = await db
    .from('sxo_crawl_sites')
    .select('id, domain, score, pages_found, last_crawled_at, location_id')
    .eq('company_id', s.claims.companyId)
    .order('last_crawled_at', { ascending: false, nullsFirst: false })
    .limit(50)
  return NextResponse.json({ sites: data ?? [] })
}

export async function POST(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const domain = String(body?.domain ?? '').trim()
  const locationId = typeof body?.locationId === 'string' ? body.locationId.trim() || null : null
  const maxPages = Number(body?.maxPages) || undefined
  if (!domain) return NextResponse.json({ error: 'Which site should I crawl?' }, { status: 400 })

  const r = await crawlSite(s.claims.companyId, domain, locationId, { maxPages })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ ok: true, ...r.result })
}
