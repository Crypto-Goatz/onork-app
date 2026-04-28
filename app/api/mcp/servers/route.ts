/**
 * GET  /api/mcp/servers  — list user's connected MCP servers (with cached tool counts)
 * POST /api/mcp/servers  — register a new MCP server
 *   body: { slug?, name, description?, url, transport='http', envVars?, bearerToken? }
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

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await admin()
    .from('user_mcp_servers')
    .select('id, slug, name, description, transport, url, status, tools, tools_listed_at, last_used_at, use_count, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Don't return env_vars in the list response — those are sensitive
  return NextResponse.json({
    servers: (data ?? []).map((s) => ({
      ...s,
      tool_count: Array.isArray(s.tools) ? s.tools.length : 0,
    })),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    slug?: string
    name?: string
    description?: string
    url?: string
    transport?: 'http' | 'stdio'
    envVars?: Record<string, string>
    bearerToken?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if ((body.transport ?? 'http') === 'http' && !body.url) {
    return NextResponse.json({ error: 'url required for http transport' }, { status: 400 })
  }

  const slug = body.slug?.trim() || slugify(body.name)

  const { data, error } = await admin()
    .from('user_mcp_servers')
    .insert({
      user_id: user.id,
      slug,
      name: body.name,
      description: body.description ?? null,
      transport: body.transport ?? 'http',
      url: body.url ?? null,
      env_vars: body.envVars ?? {},
      bearer_token: body.bearerToken ?? null,
      status: 'active',
    })
    .select('id, slug, name, transport, url, status')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A server with that slug is already connected' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ server: data })
}
