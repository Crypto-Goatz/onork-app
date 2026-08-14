/**
 * GET   /api/learning/facts — the review queue.
 * PATCH /api/learning/facts — approve or reject one fact.
 *
 * Approval is recorded with WHO and WHEN. A promoted fact will eventually be
 * repeated to a client's customers, so it needs an author.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') || 'candidate'
  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  const { data: facts } = await db
    .from('learning_facts')
    .select('id, location_id, kind, subject, fact, confidence, evidence_count, status, first_seen, last_seen')
    .eq('company_id', s.claims.companyId)
    .eq('status', status)
    .order('confidence', { ascending: false })
    .limit(200)

  const counts: Record<string, number> = {}
  for (const st of ['candidate', 'promoted', 'rejected', 'conflict']) {
    const { count } = await db
      .from('learning_facts')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', s.claims.companyId)
      .eq('status', st)
    counts[st] = count ?? 0
  }

  return NextResponse.json({ facts: facts ?? [], counts })
}

export async function PATCH(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id ?? '').trim()
  const decision = String(body?.decision ?? '')
  if (!id || !['promoted', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'Need a fact id and a decision.' }, { status: 400 })
  }

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage unavailable.' }, { status: 503 })

  // Scoped to the caller's company — a fact id from another agency simply does
  // not match, so there is nothing to leak.
  const { data, error } = await db
    .from('learning_facts')
    .update({ status: decision, reviewed_by: s.claims.sub, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', s.claims.companyId)
    .select('id')
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'No such fact.' }, { status: 404 })
  return NextResponse.json({ ok: true, id: data.id, status: decision })
}
