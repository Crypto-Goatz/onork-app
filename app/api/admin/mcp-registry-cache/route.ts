/**
 * GET  /api/admin/mcp-registry-cache?search=&category=&recommended=&featured=
 * PUT  /api/admin/mcp-registry-cache  (per-row curation)
 *      body: { id, recommended?, featured?, admin_notes? }
 *
 * Lives on the admin side. Reads from the locally-cached
 * mcp_registry_cache table populated by /api/cron/mcp-registry-sync.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/admin-gate'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const gate = await verifyAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error ?? 'Forbidden' }, { status: gate.userId ? 403 : 401 })

  const search = req.nextUrl.searchParams.get('search') ?? ''
  const category = req.nextUrl.searchParams.get('category') ?? ''
  const recommendedOnly = req.nextUrl.searchParams.get('recommended') === '1'
  const featuredOnly = req.nextUrl.searchParams.get('featured') === '1'
  const remoteOnly = req.nextUrl.searchParams.get('remote') === '1'
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100'), 500)

  const sb = admin()
  let q = sb
    .from('mcp_registry_cache')
    .select('id, server_name, server_title, description, version, has_remote, remote_url, remote_type, repository_url, category, recommended, featured, admin_notes, tools_count, last_synced_at')
    .order('featured', { ascending: false })
    .order('recommended', { ascending: false })
    .order('server_name')
    .limit(limit)

  if (category) q = q.eq('category', category)
  if (recommendedOnly) q = q.eq('recommended', true)
  if (featuredOnly) q = q.eq('featured', true)
  if (remoteOnly) q = q.eq('has_remote', true)
  if (search) q = q.or(`server_name.ilike.%${search}%,server_title.ilike.%${search}%,description.ilike.%${search}%`)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Stats — quick summary across the whole table (not just the filtered set)
  const stats = await sb
    .from('mcp_registry_cache')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({
    servers: data ?? [],
    total: stats.count ?? 0,
  })
}

export async function PUT(req: NextRequest) {
  const gate = await verifyAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error ?? 'Forbidden' }, { status: gate.userId ? 403 : 401 })

  const body = await req.json().catch(() => ({}))
  const { id, recommended, featured, admin_notes } = body as {
    id?: string
    recommended?: boolean
    featured?: boolean
    admin_notes?: string
  }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof recommended === 'boolean') update.recommended = recommended
  if (typeof featured === 'boolean') update.featured = featured
  if (typeof admin_notes === 'string') update.admin_notes = admin_notes

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no editable fields' }, { status: 400 })
  }

  const sb = admin()
  const { error } = await sb.from('mcp_registry_cache').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
