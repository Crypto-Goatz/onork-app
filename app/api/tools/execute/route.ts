/**
 * POST /api/tools/execute
 *
 * Body: { tool: string, params: Record<string, unknown> }
 * Returns: { status, statusCode, durationMs, result, urlsFound, tool, service }
 *
 * Routes the call through the right credential layer:
 *   - CRM tools  → crm-router (OAuth → PIT fallback)
 *   - everything else → 0nMCP HTTP server (lib/0nmcp-client)
 *
 * Saves to switches.executions (the in-DB execution log) when invoked.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { crmGet, crmPost, crmPut, crmDelete } from '@/lib/crm'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { SERVICE_CATALOG } from '0nmcp/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  query?: string[]
  body?: Record<string, unknown>
}

interface ServiceDef {
  name: string
  type?: string
  baseUrl?: string
  endpoints: Record<string, Endpoint>
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function findTool(toolName: string): { serviceKey: string; endpointKey: string; service: ServiceDef; ep: Endpoint } | null {
  const map = SERVICE_CATALOG as Record<string, ServiceDef>
  const sorted = Object.entries(map).sort((a, b) => b[0].length - a[0].length)
  for (const [serviceKey, svc] of sorted) {
    if (toolName.startsWith(`${serviceKey}_`)) {
      const epKey = toolName.slice(serviceKey.length + 1)
      const ep = svc.endpoints?.[epKey]
      if (ep) return { serviceKey, endpointKey: epKey, service: svc, ep }
    }
  }
  return null
}

function fillPath(path: string, params: Record<string, unknown>): { filled: string; consumed: Set<string> } {
  const consumed = new Set<string>()
  const filled = path.replace(/\{([^}]+)\}/g, (_, key) => {
    consumed.add(key)
    const v = params[key]
    return v !== undefined ? encodeURIComponent(String(v)) : ''
  })
  return { filled, consumed }
}

function urlsFromValue(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') {
    const matches = v.match(/https?:\/\/[^\s"<>]+/g) ?? []
    out.push(...matches)
  } else if (Array.isArray(v)) {
    v.forEach((item) => urlsFromValue(item, out))
  } else if (v && typeof v === 'object') {
    Object.values(v).forEach((item) => urlsFromValue(item, out))
  }
  return out
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tool?: string; params?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.tool) return NextResponse.json({ error: 'tool required' }, { status: 400 })

  const matched = findTool(body.tool)
  if (!matched) {
    return NextResponse.json({ error: 'tool not found', tool: body.tool }, { status: 404 })
  }

  const { serviceKey, service, ep } = matched
  const params = body.params ?? {}
  const start = Date.now()

  let status: 'success' | 'error' = 'error'
  let statusCode = 0
  let result: unknown = null

  try {
    if (serviceKey === 'crm') {
      // Route through the CRM auth router for OAuth/PIT resolution
      const { data: profile } = await supabase
        .from('profiles')
        .select('crm_location_id')
        .eq('id', user.id)
        .maybeSingle()
      const locationId = profile?.crm_location_id
      if (!locationId) {
        return NextResponse.json({
          status: 'error',
          statusCode: 403,
          durationMs: Date.now() - start,
          result: { error: 'No CRM location on file. Connect CRM in Settings.' },
          urlsFound: [],
          tool: body.tool,
          service: serviceKey,
        })
      }

      const { filled, consumed } = fillPath(ep.path, params)
      const queryParams: string[] = []
      for (const q of ep.query ?? []) {
        if (params[q] !== undefined && !consumed.has(q)) {
          queryParams.push(`${encodeURIComponent(q)}=${encodeURIComponent(String(params[q]))}`)
        }
      }
      const pathWithQuery = queryParams.length > 0 ? `${filled}?${queryParams.join('&')}` : filled

      const bodyParams: Record<string, unknown> = {}
      for (const k of Object.keys(ep.body ?? {})) {
        if (params[k] !== undefined && !consumed.has(k) && !(ep.query ?? []).includes(k)) {
          bodyParams[k] = params[k]
        }
      }

      let res: Response
      switch (ep.method) {
        case 'GET':
          res = await crmGet(pathWithQuery, locationId)
          break
        case 'POST':
          res = await crmPost(pathWithQuery, locationId, bodyParams)
          break
        case 'PUT':
          res = await crmPut(pathWithQuery, locationId, bodyParams)
          break
        case 'DELETE':
          res = await crmDelete(pathWithQuery, locationId)
          break
        default:
          return NextResponse.json({ error: `unsupported method: ${ep.method}` }, { status: 400 })
      }
      statusCode = res.status
      status = res.ok ? 'success' : 'error'
      result = await res.json().catch(() => ({}))
    } else {
      // Generic execution via 0nMCP HTTP server
      const onmcpUrl = process.env.ONMCP_URL || 'https://0nmcp-remote.0nmcp.workers.dev'
      const res = await fetch(`${onmcpUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.ONMCP_TOKEN ? { Authorization: `Bearer ${process.env.ONMCP_TOKEN}` } : {}),
        },
        body: JSON.stringify({ tool: body.tool, params }),
      })
      statusCode = res.status
      status = res.ok ? 'success' : 'error'
      result = await res.json().catch(() => ({}))
    }
  } catch (err) {
    status = 'error'
    statusCode = 500
    result = { error: err instanceof Error ? err.message : 'Unknown error' }
  }

  const durationMs = Date.now() - start
  const urlsFound = urlsFromValue(result)

  // Log execution (non-blocking)
  void admin()
    .from('tool_executions')
    .insert({
      user_id: user.id,
      tool_name: body.tool,
      service: serviceKey,
      params,
      result,
      status,
      duration_ms: durationMs,
    })
    .then(() => null)

  return NextResponse.json({
    status,
    statusCode,
    durationMs,
    result,
    urlsFound: urlsFound.slice(0, 50),
    tool: body.tool,
    service: serviceKey,
    serviceName: service.name,
  })
}
