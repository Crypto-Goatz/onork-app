/**
 * GET /api/admin/mcp-registry?search=&cursor=&limit=&transport=streamable-http
 *
 * Server-side proxy for the OFFICIAL MCP registry at
 * https://registry.modelcontextprotocol.io/v0/servers
 *
 * Filters to the latest-version of each server. Optionally filters to
 * streamable-http transport (the only kind we currently wire).
 *
 * Admin-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-gate'

const REGISTRY_BASE = 'https://registry.modelcontextprotocol.io/v0/servers'

interface RegistryHeader {
  name: string
  description?: string
  isRequired?: boolean
  isSecret?: boolean
  value?: string
  default?: string
}

interface RegistryRemote {
  type: 'streamable-http' | 'sse' | 'stdio' | string
  url?: string
  headers?: RegistryHeader[]
}

interface RegistryServer {
  $schema?: string
  name: string
  title?: string
  description?: string
  version?: string
  repository?: { url?: string; source?: string }
  remotes?: RegistryRemote[]
  packages?: Array<{ identifier?: string; transport?: { type?: string } }>
}

interface RegistryEntry {
  server: RegistryServer
  _meta?: {
    'io.modelcontextprotocol.registry/official'?: {
      isLatest?: boolean
      status?: string
      publishedAt?: string
    }
  }
}

interface RegistryResponse {
  servers: RegistryEntry[]
  metadata?: { nextCursor?: string; count?: number }
}

interface NormalizedServer {
  name: string
  title: string
  description: string
  version: string
  repository?: string
  remotes: Array<{
    type: string
    url: string
    headers: Array<{
      name: string
      description: string
      required: boolean
      secret: boolean
      template: string
      placeholders: string[]
    }>
  }>
  hasStreamableHttp: boolean
  hasStdio: boolean
  registry: { publishedAt?: string; isLatest?: boolean }
}

/** Pull placeholder names (e.g. "{api_key}") from a header value template. */
function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{([^}]+)\}/g) ?? []
  return matches.map((m) => m.slice(1, -1))
}

function normalize(entry: RegistryEntry): NormalizedServer {
  const s = entry.server
  const remotes = (s.remotes ?? []).map((r) => ({
    type: r.type,
    url: r.url ?? '',
    headers: (r.headers ?? []).map((h) => {
      const tpl = h.value ?? h.default ?? ''
      return {
        name: h.name,
        description: h.description ?? '',
        required: !!h.isRequired,
        secret: !!h.isSecret,
        template: tpl,
        placeholders: extractPlaceholders(tpl),
      }
    }),
  }))

  const hasStreamableHttp = remotes.some((r) => r.type === 'streamable-http' || r.type === 'http')
  const hasStdio = (s.packages ?? []).length > 0

  return {
    name: s.name,
    title: s.title || s.name.split('/').slice(-1)[0],
    description: s.description ?? '',
    version: s.version ?? '0.0.0',
    repository: s.repository?.url,
    remotes,
    hasStreamableHttp,
    hasStdio,
    registry: {
      publishedAt: entry._meta?.['io.modelcontextprotocol.registry/official']?.publishedAt,
      isLatest: entry._meta?.['io.modelcontextprotocol.registry/official']?.isLatest,
    },
  }
}

export async function GET(req: NextRequest) {
  const gate = await verifyAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error ?? 'Forbidden' }, { status: gate.userId ? 403 : 401 })
  }

  const search = req.nextUrl.searchParams.get('search') ?? ''
  const cursor = req.nextUrl.searchParams.get('cursor')
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50'), 100)
  const onlyHttp = req.nextUrl.searchParams.get('transport') !== 'all'

  const params = new URLSearchParams({ limit: String(limit) })
  if (search) params.set('search', search)
  if (cursor) params.set('cursor', cursor)

  let res: Response
  try {
    res = await fetch(`${REGISTRY_BASE}?${params}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Registry unreachable: ${err instanceof Error ? err.message : 'fetch failed'}` },
      { status: 502 }
    )
  }

  if (!res.ok) {
    return NextResponse.json({ error: `Registry HTTP ${res.status}` }, { status: 502 })
  }

  const data = (await res.json()) as RegistryResponse

  // Latest version of each server only
  const latest = (data.servers ?? []).filter(
    (e) => e._meta?.['io.modelcontextprotocol.registry/official']?.isLatest !== false
  )

  let normalized = latest.map(normalize)
  if (onlyHttp) {
    normalized = normalized.filter((s) => s.hasStreamableHttp)
  }

  return NextResponse.json({
    servers: normalized,
    nextCursor: data.metadata?.nextCursor ?? null,
    count: data.metadata?.count ?? normalized.length,
  })
}
