/**
 * POST /api/admin/mcp-registry/connect
 *
 * Body: {
 *   name: string                  // canonical registry name (e.g. ai.smithery/...)
 *   title: string
 *   description?: string
 *   url: string                   // SHTTP url from remotes[].url
 *   headerTemplates: Array<{ name, template, secret }>
 *   placeholders: Record<string, string>   // user-filled values (e.g. { smithery_api_key: 'sm_...' })
 * }
 *
 * Resolves header templates against placeholders, stores in user_mcp_servers
 * with a generic 'header_overrides' structure that lib/mcp/client honors.
 *
 * Admin-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/admin-gate'
import { listTools } from '@/lib/mcp/client'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function resolveTemplate(template: string, placeholders: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key) => placeholders[key] ?? '')
}

interface ConnectBody {
  name: string
  title: string
  description?: string
  url: string
  headerTemplates: Array<{ name: string; template: string; secret?: boolean }>
  placeholders: Record<string, string>
}

export async function POST(req: NextRequest) {
  const gate = await verifyAdmin()
  if (!gate.ok || !gate.userId) {
    return NextResponse.json({ error: gate.error ?? 'Forbidden' }, { status: gate.userId ? 403 : 401 })
  }

  let body: ConnectBody
  try {
    body = (await req.json()) as ConnectBody
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.name || !body.url) {
    return NextResponse.json({ error: 'name and url required' }, { status: 400 })
  }

  // Resolve every header template against placeholders. Validate required
  // placeholders are filled.
  const resolvedHeaders: Record<string, string> = {}
  for (const h of body.headerTemplates ?? []) {
    const value = resolveTemplate(h.template, body.placeholders ?? {})
    if (h.template && value.includes('{')) {
      // Unresolved placeholder — find which one
      const stillUnfilled = (h.template.match(/\{([^}]+)\}/g) ?? [])
        .map((m) => m.slice(1, -1))
        .filter((k) => !body.placeholders?.[k])
      return NextResponse.json(
        { error: `Missing required values: ${stillUnfilled.join(', ')}` },
        { status: 400 }
      )
    }
    resolvedHeaders[h.name] = value
  }

  const sb = admin()
  const slug = slugify(body.name)

  // Upsert (admin can re-connect to update)
  const { data, error } = await sb
    .from('user_mcp_servers')
    .upsert(
      {
        user_id: gate.userId,
        slug,
        name: body.title || body.name,
        description: body.description ?? null,
        transport: 'http',
        url: body.url,
        env_vars: { __resolved_headers: resolvedHeaders, __registry_name: body.name },
        status: 'active',
        last_error: null,
      },
      { onConflict: 'user_id,slug' }
    )
    .select('id, slug, name, url')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Auto-list tools
  let toolsCount = 0
  try {
    const tools = await listTools({
      url: body.url,
      envVars: {},
      bearerToken: null,
      slug,
      registryHeaders: resolvedHeaders,
    })

    await sb
      .from('user_mcp_servers')
      .update({
        tools,
        tools_listed_at: new Date().toISOString(),
      })
      .eq('id', data.id)

    toolsCount = tools.length
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'list failed'
    await sb
      .from('user_mcp_servers')
      .update({ last_error: msg, status: 'error' })
      .eq('id', data.id)
    // Don't fail the connect — admin can retry list later
    return NextResponse.json({
      server: data,
      toolsCount: 0,
      warning: `Connected, but tools/list failed: ${msg}`,
    })
  }

  return NextResponse.json({ server: data, toolsCount })
}
