/**
 * lib/crm/v3/dispatch.ts — generic CRM v3 tool dispatcher.
 *
 * Backs every `crm_<sdkMethod>` tool registered from catalog.json. Reads the
 * tool's path/method/param shape, substitutes :pathParams, packs the rest
 * into query/body per its declared `in:` location, and hits the live CRM
 * API (services.leadconnectorhq.com).
 *
 * One dispatcher → 576 tools. Re-run the 0nMCP generator to refresh.
 */

import catalogJson from './catalog.json'

type ParamLocation = 'path' | 'query' | 'body' | 'header'

interface ParamSpec {
  type: string
  description?: string
  required?: boolean
  in?: ParamLocation
}

export interface V3Tool {
  name: string
  description: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  params: Record<string, ParamSpec>
  query?: string[]
  body?: string[]
}

interface V3Catalog {
  generated_at: string
  sdk_version: string
  total_tools: number
  modules: Record<string, V3Tool[]>
}

const catalog = catalogJson as unknown as V3Catalog

// Flatten modules → single { toolName: def } map for O(1) lookup.
export const V3_TOOLS: V3Tool[] = Object.values(catalog.modules).flat()
export const V3_TOOL_INDEX: Record<string, V3Tool> = Object.fromEntries(
  V3_TOOLS.map((t) => [t.name, t]),
)

export const V3_SDK_VERSION = catalog.sdk_version
export const V3_TOTAL_TOOLS = catalog.total_tools
export const V3_MODULE_COUNT = Object.keys(catalog.modules).length

// ── inputSchema synthesis (JSON Schema for MCP tools/list) ──

export interface InputSchema {
  type: 'object'
  properties: Record<string, { type: string; description?: string }>
  required?: string[]
}

export function toolToInputSchema(tool: V3Tool): InputSchema {
  const properties: Record<string, { type: string; description?: string }> = {}
  const required: string[] = []

  for (const [name, spec] of Object.entries(tool.params)) {
    properties[name] = {
      type: normalizeType(spec.type),
      ...(spec.description ? { description: spec.description } : {}),
    }
    if (spec.required) required.push(name)
  }

  return required.length
    ? { type: 'object', properties, required }
    : { type: 'object', properties }
}

function normalizeType(t: string): string {
  if (t === 'number' || t === 'integer') return 'number'
  if (t === 'boolean') return 'boolean'
  if (t === 'array') return 'array'
  if (t === 'object') return 'object'
  return 'string'
}

// ── Dispatch ──

const CRM_BASE = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export interface DispatchOptions {
  // Bearer token to pass to the CRM API. For per-user OAuth tokens this is
  // the location-scoped access token; for fallback PIT mode it's the env PIT.
  accessToken: string
  // Optional: per-request override. If unset, derived from tool path params.
  locationId?: string
}

export interface DispatchResult {
  ok: boolean
  status: number
  data: unknown
  error?: string
}

export async function dispatchV3Tool(
  toolName: string,
  rawArgs: Record<string, unknown> | undefined,
  opts: DispatchOptions,
): Promise<DispatchResult> {
  const tool = V3_TOOL_INDEX[toolName]
  if (!tool) return { ok: false, status: 0, data: null, error: `unknown v3 tool: ${toolName}` }

  const args = { ...(rawArgs ?? {}) }

  // Auto-fill locationId if the tool needs it and we have one in context.
  if ('locationId' in tool.params && !args.locationId && opts.locationId) {
    args.locationId = opts.locationId
  }

  // 1) Path substitution — `:name` segments pulled from args.
  let url = tool.path
  for (const seg of url.match(/:([A-Za-z0-9_]+)/g) ?? []) {
    const key = seg.slice(1)
    const val = args[key]
    if (val === undefined || val === null || val === '') {
      return { ok: false, status: 0, data: null, error: `missing path param: ${key}` }
    }
    url = url.replace(seg, encodeURIComponent(String(val)))
  }

  // 2) Query string — params declared `in: 'query'` (or in tool.query list).
  const qs = new URLSearchParams()
  for (const [name, spec] of Object.entries(tool.params)) {
    if (spec.in !== 'query') continue
    const v = args[name]
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      for (const item of v) qs.append(name, String(item))
    } else {
      qs.set(name, String(v))
    }
  }
  if ([...qs].length > 0) url += (url.includes('?') ? '&' : '?') + qs.toString()

  // 3) Body — for POST/PUT/PATCH the generator emits a single passthrough
  //    `body` arg (since SDK request bodies are typed but not enumerated in
  //    paramDefs). Callers send a plain JSON object under `args.body`.
  let bodyInit: BodyInit | undefined
  const wantsBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(tool.method)
  if (wantsBody) {
    const explicit = args.body
    if (explicit && typeof explicit === 'object') {
      bodyInit = JSON.stringify(explicit)
    } else if (tool.body && tool.body.length) {
      // Build body from declared body keys (rare — used when generator
      // identified specific body fields).
      const obj: Record<string, unknown> = {}
      for (const k of tool.body) {
        if (args[k] !== undefined) obj[k] = args[k]
      }
      if (Object.keys(obj).length) bodyInit = JSON.stringify(obj)
    }
  }

  const res = await fetch(`${CRM_BASE}${url}`, {
    method: tool.method,
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      Version: CRM_VERSION,
      Accept: 'application/json',
      ...(bodyInit ? { 'Content-Type': 'application/json' } : {}),
    },
    body: bodyInit,
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = { raw: await res.text().catch(() => '') }
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    ...(res.ok ? {} : { error: `CRM ${res.status}` }),
  }
}
