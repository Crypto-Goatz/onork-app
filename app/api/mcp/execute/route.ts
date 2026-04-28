/**
 * POST /api/mcp/execute
 *
 * Body: { serverId: string, tool: string, args?: Record<string, unknown> }
 *
 * Forwards the call to the registered MCP server, returns the JSON-RPC
 * result, increments use_count + last_used_at.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { callTool } from '@/lib/mcp/client'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { serverId?: string; tool?: string; args?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.serverId || !body.tool) {
    return NextResponse.json({ error: 'serverId and tool required' }, { status: 400 })
  }

  const sb = admin()
  const { data: server } = await sb
    .from('user_mcp_servers')
    .select('id, slug, transport, url, env_vars, bearer_token, status, use_count')
    .eq('id', body.serverId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  if (server.status !== 'active') {
    return NextResponse.json({ error: `Server status: ${server.status}` }, { status: 400 })
  }
  if (server.transport !== 'http' || !server.url) {
    return NextResponse.json(
      { error: `Unsupported transport: ${server.transport}` },
      { status: 400 }
    )
  }

  const start = Date.now()
  try {
    const envVarsRaw = (server.env_vars as Record<string, unknown>) ?? {}
    const registryHeaders = (envVarsRaw.__resolved_headers as Record<string, string>) ?? undefined
    const plainEnvVars: Record<string, string> = {}
    for (const [k, v] of Object.entries(envVarsRaw)) {
      if (!k.startsWith('__') && typeof v === 'string') plainEnvVars[k] = v
    }

    const result = await callTool(
      {
        url: server.url,
        envVars: plainEnvVars,
        bearerToken: server.bearer_token ?? null,
        slug: server.slug,
        registryHeaders,
      },
      body.tool,
      body.args ?? {}
    )

    void sb
      .from('user_mcp_servers')
      .update({
        use_count: (server.use_count ?? 0) + 1,
        last_used_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', body.serverId)

    return NextResponse.json({
      status: result.isError ? 'error' : 'success',
      durationMs: Date.now() - start,
      result,
      tool: body.tool,
      serverId: body.serverId,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await sb
      .from('user_mcp_servers')
      .update({ last_error: msg })
      .eq('id', body.serverId)
    return NextResponse.json(
      {
        status: 'error',
        durationMs: Date.now() - start,
        error: msg,
        tool: body.tool,
        serverId: body.serverId,
      },
      { status: 502 }
    )
  }
}
