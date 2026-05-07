/**
 * GET /api/capabilities?q=&kind=
 *
 * Unified search across every capability surface in 0nCore:
 *   - 0nMCP catalog tools  (1,598)
 *   - Connected services   (54)
 *   - Marketplace apps     (variable, includes UCP products)
 *   - Saved Switches       (per-user)
 *   - MCP server tools     (per-user, admin-connected)
 *
 * Each result is normalized to one shape: { kind, name, description,
 * source, runHref, tags }.
 *
 * `q` filters by case-insensitive substring across name/description/tags.
 * `kind` (optional) narrows to a single source.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — 0nmcp ships ESM with .js exports
import { SERVICE_CATALOG } from '0nmcp/catalog'
import { SERVICES } from '@/lib/service-catalog'

export const dynamic = 'force-dynamic'

interface CapabilityRow {
  kind: 'tool' | 'service' | 'app' | 'switch' | 'mcp_tool'
  id: string
  name: string
  description: string
  source: string
  runHref?: string
  tags: string[]
  method?: string
  iconChar?: string
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function matches(q: string, ...fields: Array<string | undefined | null>): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  for (const f of fields) {
    if (f && f.toLowerCase().includes(needle)) return true
  }
  return false
}

interface CatalogService {
  name: string
  description?: string
  type?: string
  endpoints?: Record<string, { method: string }>
}

function expandCatalog(q: string): CapabilityRow[] {
  const map = SERVICE_CATALOG as Record<string, CatalogService>
  const out: CapabilityRow[] = []
  for (const [serviceKey, svc] of Object.entries(map)) {
    for (const [epKey, ep] of Object.entries(svc.endpoints ?? {})) {
      const toolName = `${serviceKey}_${epKey}`
      if (
        matches(q, toolName, svc.name, svc.description, svc.type, ep.method)
      ) {
        out.push({
          kind: 'tool',
          id: toolName,
          name: toolName,
          description: svc.description ?? '',
          source: svc.name,
          runHref: `/dashboard/execute/${toolName}`,
          tags: [svc.type ?? 'integration', ep.method.toLowerCase()],
          method: ep.method,
        })
      }
    }
  }
  return out
}

function expandServices(q: string): CapabilityRow[] {
  return SERVICES
    .filter((s) =>
      matches(q, s.id, s.name, s.description, s.category)
    )
    .map((s) => ({
      kind: 'service' as const,
      id: s.id,
      name: s.name,
      description: s.description ?? '',
      source: 'Connected service',
      runHref: `/dashboard/integrations?service=${s.id}`,
      tags: [s.category, 'connect'],
      iconChar: s.icon,
    }))
}

interface AppRow {
  id: string
  slug: string
  name: string
  description?: string
  category?: string
  icon?: string | null
  status?: string
}

interface SwitchRow {
  id: string
  name: string
  description: string | null
  spec: { tool?: { name?: string; method?: string } } | null
  is_multi: boolean
  tags: string[] | null
}

interface McpServerRow {
  id: string
  name: string
  status: string
  tools: Array<{ name: string; description?: string }>
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const kindFilter = req.nextUrl.searchParams.get('kind')

  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null

  const out: CapabilityRow[] = []

  if (!kindFilter || kindFilter === 'tool') {
    out.push(...expandCatalog(q))
  }

  if (!kindFilter || kindFilter === 'service') {
    out.push(...expandServices(q))
  }

  // Apps (UCP products + marketplace_apps unified)
  if (!kindFilter || kindFilter === 'app') {
    const sb = admin()
    const [ucp, mkt] = await Promise.all([
      sb
        .from('ucp_products')
        .select('id, slug, name, description, category, icon, status')
        .eq('status', 'active')
        .limit(200),
      sb
        .from('marketplace_apps')
        .select('id, slug, name, description, category, icon, status')
        .eq('status', 'active')
        .limit(200),
    ])
    const seen = new Set<string>()
    const merged = [...(ucp.data ?? []), ...(mkt.data ?? [])] as AppRow[]
    for (const a of merged) {
      if (!a.slug || seen.has(a.slug)) continue
      seen.add(a.slug)
      if (matches(q, a.name, a.description, a.category)) {
        out.push({
          kind: 'app',
          id: a.id,
          name: a.name,
          description: a.description ?? '',
          source: 'Marketplace app',
          runHref: `/widgets/marketplace?slug=${a.slug}`,
          tags: [a.category ?? 'app'],
          iconChar: a.icon ?? undefined,
        })
      }
    }
  }

  // Switches (user's own)
  if (user && (!kindFilter || kindFilter === 'switch')) {
    const sb = admin()
    const { data } = await sb
      .from('switches')
      .select('id, name, description, spec, is_multi, tags')
      .eq('user_id', user.id)
      .limit(200)
    for (const s of (data ?? []) as SwitchRow[]) {
      if (!matches(q, s.name, s.description, s.spec?.tool?.name)) continue
      out.push({
        kind: 'switch',
        id: s.id,
        name: s.name,
        description: s.description ?? '',
        source: 'Saved Switch',
        runHref: `/dashboard/switches?id=${s.id}`,
        tags: ['switch', ...(s.tags ?? []), s.is_multi ? 'multi-step' : 'single'],
        method: s.spec?.tool?.method,
      })
    }
  }

  // MCP server tools (user's own — admin-only by row owner)
  if (user && (!kindFilter || kindFilter === 'mcp_tool')) {
    const sb = admin()
    const { data } = await sb
      .from('user_mcp_servers')
      .select('id, name, status, tools')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(50)
    for (const server of (data ?? []) as McpServerRow[]) {
      const tools = Array.isArray(server.tools) ? server.tools : []
      for (const t of tools) {
        if (!matches(q, t.name, t.description, server.name)) continue
        out.push({
          kind: 'mcp_tool',
          id: `${server.id}:${t.name}`,
          name: t.name,
          description: t.description ?? '',
          source: server.name,
          runHref: `/dashboard/mcp-servers`,
          tags: ['mcp', 'external'],
        })
      }
    }
  }

  // Sort: tools first, then services, apps, switches, mcp_tools.
  // Within each, alphabetical.
  const order: Record<CapabilityRow['kind'], number> = {
    tool: 0,
    service: 1,
    app: 2,
    switch: 3,
    mcp_tool: 4,
  }
  out.sort((a, b) => {
    if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind]
    return a.name.localeCompare(b.name)
  })

  // Group counts for the UI
  const counts = out.reduce(
    (acc, r) => {
      acc[r.kind] = (acc[r.kind] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return NextResponse.json({
    total: out.length,
    counts,
    capabilities: out.slice(0, 500), // hard cap so the UI stays responsive
  })
}
