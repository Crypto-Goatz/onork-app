/**
 * GET /api/tools/catalog
 *   ?view=stats        — { totalTools, totalServices, totalCategories }
 *   ?view=services     — { services: [{ key, name, category, toolCount }] }
 *   ?search=<query>    — { tools: [{ name, service, serviceName, category, description, method }] }
 *   (default)          — { services } same as view=services
 *
 * Reads SERVICE_CATALOG directly from the 0nmcp npm package. No DB hit.
 */

import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — 0nmcp ships ESM with .js exports; types not bundled
import { SERVICE_CATALOG } from '0nmcp/catalog'

export const dynamic = 'force-dynamic'

interface ServiceDef {
  name: string
  type?: string
  description: string
  capabilities: Array<{ name: string; actions?: string[]; description?: string }>
  endpoints: Record<string, { method: string; path: string; query?: string[]; body?: Record<string, unknown> }>
  baseUrl?: string
}

function asMap(): Record<string, ServiceDef> {
  return SERVICE_CATALOG as Record<string, ServiceDef>
}

function toolCountFor(svc: ServiceDef): number {
  return Object.keys(svc.endpoints || {}).length
}

function toolsFor(serviceKey: string, svc: ServiceDef) {
  return Object.entries(svc.endpoints || {}).map(([epKey, ep]) => ({
    name: `${serviceKey}_${epKey}`,
    endpointKey: epKey,
    service: serviceKey,
    serviceName: svc.name,
    category: svc.type ?? 'integration',
    description: descFromCapability(svc, epKey) ?? svc.description,
    method: ep.method,
    path: ep.path,
  }))
}

function descFromCapability(svc: ServiceDef, epKey: string): string | null {
  if (!svc.capabilities) return null
  const match = svc.capabilities.find((c) => epKey.includes(c.name) || c.name.includes(epKey.split('_')[0]))
  return match?.description ?? null
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const view = url.searchParams.get('view') ?? 'services'
  const search = url.searchParams.get('search')

  const map = asMap()
  const entries = Object.entries(map)

  if (search && search.trim()) {
    const q = search.toLowerCase()
    const matches: ReturnType<typeof toolsFor> = []
    for (const [k, svc] of entries) {
      for (const t of toolsFor(k, svc)) {
        const hay = `${t.name} ${t.serviceName} ${t.description ?? ''} ${t.method}`.toLowerCase()
        if (hay.includes(q)) matches.push(t)
      }
    }
    return NextResponse.json({ tools: matches.slice(0, 200) })
  }

  if (view === 'stats') {
    let totalTools = 0
    const cats = new Set<string>()
    for (const [, svc] of entries) {
      totalTools += toolCountFor(svc)
      cats.add(svc.type ?? 'integration')
    }
    return NextResponse.json({
      totalTools,
      totalServices: entries.length,
      totalCategories: cats.size,
    })
  }

  // Default + view=services
  const services = entries.map(([key, svc]) => ({
    key,
    name: svc.name,
    category: svc.type ?? 'integration',
    description: svc.description,
    toolCount: toolCountFor(svc),
  }))

  return NextResponse.json({ services })
}
