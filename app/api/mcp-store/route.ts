/**
 * GET /api/mcp-store?search=&category=
 *
 * Public-ish (any authed user) read of recommended + featured MCP servers
 * from the cache. Used by /dashboard/mcp-store.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search') ?? ''
  const category = req.nextUrl.searchParams.get('category') ?? ''

  const sb = admin()
  let q = sb
    .from('mcp_registry_cache')
    .select('id, server_name, server_title, description, version, has_remote, remote_url, remote_type, repository_url, category, recommended, featured')
    .order('featured', { ascending: false })
    .order('recommended', { ascending: false })
    .order('server_name')
    .limit(200)

  if (category) q = q.eq('category', category)
  if (search) q = q.or(`server_name.ilike.%${search}%,server_title.ilike.%${search}%,description.ilike.%${search}%`)

  // User-facing store hides anything not yet curated as recommended
  // (admin can flip the flag from /dashboard/admin/mcp-registry-cache)
  q = q.eq('recommended', true)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const featured = (data ?? []).filter((s) => s.featured)
  const rest = (data ?? []).filter((s) => !s.featured)
  return NextResponse.json({ featured, servers: rest })
}
