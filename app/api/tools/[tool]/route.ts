/**
 * GET /api/tools/[tool]
 *
 * Returns a single tool's full definition. Tool name is `<serviceKey>_<endpointKey>`.
 * Body is the rendered ToolDef the form needs to render parameters.
 */

import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { SERVICE_CATALOG } from '0nmcp/catalog'

interface Endpoint {
  method: string
  path: string
  query?: string[]
  body?: Record<string, unknown>
}

interface ServiceDef {
  name: string
  type?: string
  description: string
  baseUrl?: string
  endpoints: Record<string, Endpoint>
  capabilities?: Array<{ name: string; description?: string }>
}

interface ParamDef {
  type: string
  description: string
  required: boolean
  in: 'path' | 'query' | 'body'
}

function inferType(value: unknown): string {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (Array.isArray(value)) return 'array'
  if (value !== null && typeof value === 'object') return 'object'
  return 'string'
}

function buildParams(ep: Endpoint): Record<string, ParamDef> {
  const params: Record<string, ParamDef> = {}

  // Path params: anything in {curly}
  const pathMatches = ep.path.match(/\{([^}]+)\}/g) ?? []
  for (const m of pathMatches) {
    const key = m.slice(1, -1)
    params[key] = { type: 'string', description: `Path parameter: ${key}`, required: true, in: 'path' }
  }

  // Query params
  for (const q of ep.query ?? []) {
    params[q] = { type: 'string', description: `Query parameter: ${q}`, required: false, in: 'query' }
  }

  // Body params
  if (ep.body && typeof ep.body === 'object') {
    for (const [k, v] of Object.entries(ep.body)) {
      params[k] = {
        type: inferType(v),
        description: `Body field: ${k}`,
        required: false,
        in: 'body',
      }
    }
  }

  return params
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tool: string }> }
) {
  const { tool: toolName } = await params

  // Tool naming: serviceKey_endpointKey (e.g. "stripe_create_customer")
  // Find the service whose key prefixes the tool name
  const map = SERVICE_CATALOG as Record<string, ServiceDef>
  const entries = Object.entries(map)

  let matched: { serviceKey: string; endpointKey: string; service: ServiceDef; ep: Endpoint } | null = null

  // Prefer the longest service-key match in case of overlapping prefixes
  const sortedByLen = entries.slice().sort((a, b) => b[0].length - a[0].length)
  for (const [serviceKey, svc] of sortedByLen) {
    if (toolName.startsWith(`${serviceKey}_`)) {
      const epKey = toolName.slice(serviceKey.length + 1)
      const ep = svc.endpoints?.[epKey]
      if (ep) {
        matched = { serviceKey, endpointKey: epKey, service: svc, ep }
        break
      }
    }
  }

  if (!matched) {
    return NextResponse.json({ error: 'Tool not found', tool: toolName }, { status: 404 })
  }

  const { serviceKey, endpointKey, service, ep } = matched
  const cap = service.capabilities?.find((c) => endpointKey.includes(c.name) || c.name.includes(endpointKey.split('_')[0]))

  return NextResponse.json({
    name: toolName,
    endpointKey,
    service: serviceKey,
    serviceName: service.name,
    category: service.type ?? 'integration',
    description: cap?.description ?? service.description,
    method: ep.method,
    path: ep.path,
    baseUrl: service.baseUrl ?? '',
    params: buildParams(ep),
  })
}
