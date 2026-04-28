/**
 * POST /api/mcp/execute
 *
 * Body: { serverId: string, tool: string, args?: Record<string, unknown> }
 *
 * Forwards the call to the registered MCP server, returns the JSON-RPC
 * result, increments use_count + last_used_at.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callTool } from '@/lib/mcp/client'
import { verifyAdmin } from '@/lib/admin-gate'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Allow either admin session OR a valid internal-dispatch secret (so the
  // workflow executor can fire MCP tool steps server-to-server).
  const internalSecret = req.headers.get('x-internal-secret')
  const isInternal =
    !!internalSecret && internalSecret === (process.env.INTERNAL_DISPATCH_SECRET || '')

  let userId: string | null = null
  if (!isInternal) {
    const gate = await verifyAdmin()
    if (!gate.ok || !gate.userId) {
      return NextResponse.json({ error: gate.error ?? 'Forbidden' }, { status: gate.userId ? 403 : 401 })
    }
    userId = gate.userId
  }
  const user = userId ? { id: userId } : null

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
  let serverQuery = sb
    .from('user_mcp_servers')
    .select('id, slug, transport, url, env_vars, bearer_token, status, use_count')
    .eq('id', body.serverId)
  // Internal calls (workflow executor) match by id only — they've already
  // come through their own auth path. Direct admin calls also match user_id.
  if (user) {
    serverQuery = serverQuery.eq('user_id', user.id)
  }
  const { data: server } = await serverQuery.maybeSingle()

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
