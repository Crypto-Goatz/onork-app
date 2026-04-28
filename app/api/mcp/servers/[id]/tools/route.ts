/**
 * GET /api/mcp/servers/[id]/tools?refresh=1
 *
 * Returns the cached tool list. If ?refresh=1 (or the cache is empty),
 * connects to the MCP server, calls tools/list, caches the result, and
 * returns it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { listTools } from '@/lib/mcp/client'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const refresh = req.nextUrl.searchParams.get('refresh') === '1'
  const sb = admin()

  const { data: server } = await sb
    .from('user_mcp_servers')
    .select('id, slug, transport, url, env_vars, bearer_token, tools, tools_listed_at, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cached = Array.isArray(server.tools) ? (server.tools as Array<unknown>) : []

  if (!refresh && cached.length > 0) {
    return NextResponse.json({ tools: cached, cached: true, listed_at: server.tools_listed_at })
  }

  if (server.transport !== 'http' || !server.url) {
    return NextResponse.json(
      { error: `Unsupported transport: ${server.transport}. Only 'http' (SHTTP) is wired today.` },
      { status: 400 }
    )
  }

  try {
    const envVarsRaw = (server.env_vars as Record<string, unknown>) ?? {}
    const registryHeaders = (envVarsRaw.__resolved_headers as Record<string, string>) ?? undefined
    const plainEnvVars: Record<string, string> = {}
    for (const [k, v] of Object.entries(envVarsRaw)) {
      if (!k.startsWith('__') && typeof v === 'string') plainEnvVars[k] = v
    }

    const tools = await listTools({
      url: server.url,
      envVars: plainEnvVars,
      bearerToken: server.bearer_token ?? null,
      slug: server.slug,
      registryHeaders,
    })

    await sb
      .from('user_mcp_servers')
      .update({
        tools,
        tools_listed_at: new Date().toISOString(),
        last_error: null,
        status: 'active',
      })
      .eq('id', id)

    return NextResponse.json({ tools, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await sb
      .from('user_mcp_servers')
      .update({ last_error: msg, status: 'error' })
      .eq('id', id)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
