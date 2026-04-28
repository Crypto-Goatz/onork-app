/**
 * GET /api/cron/mcp-registry-sync
 *
 * Daily Vercel cron — paginates the OFFICIAL MCP registry
 * (registry.modelcontextprotocol.io/v0/servers) and upserts every server
 * into mcp_registry_cache. Auto-categorizes by description keywords.
 *
 * Auth: CRON_SECRET in `Authorization: Bearer ...` header.
 * Schedule: 0 4 * * *  (4am UTC daily)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const REGISTRY_BASE = 'https://registry.modelcontextprotocol.io/v0/servers'
const PAGE_LIMIT = 100
const MAX_PAGES = 30 // safety cap

const CATEGORIES: Record<string, string[]> = {
  marketing: ['ads', 'seo', 'social', 'email', 'campaign', 'analytics', 'content', 'newsletter'],
  sales: ['crm', 'lead', 'outreach', 'pipeline', 'contact', 'enrichment', 'prospect'],
  finance: ['payment', 'invoice', 'bookkeeping', 'quickbooks', 'stripe', 'billing', 'accounting'],
  development: ['code', 'github', 'gitlab', 'deploy', 'database', 'api', 'server', 'docker', 'kubernetes'],
  data: ['scraping', 'extraction', 'search', 'crawl', 'browser', 'web', 'parse', 'firecrawl'],
  ai: ['llm', 'model', 'inference', 'image', 'video', 'audio', 'generation', 'speech', 'tts', 'embedding'],
  commerce: ['shopify', 'woocommerce', 'store', 'product', 'order', 'inventory', 'cart'],
  communication: ['slack', 'discord', 'email', 'message', 'chat', 'notification', 'sms', 'whatsapp'],
  compliance: ['hipaa', 'gdpr', 'security', 'audit', 'compliance', 'privacy', 'soc2'],
  productivity: ['calendar', 'task', 'project', 'document', 'note', 'workflow', 'asana', 'linear', 'notion'],
}

interface RegistryEntry {
  server: {
    name: string
    title?: string
    description?: string
    version?: string
    repository?: { url?: string; source?: string }
    websiteUrl?: string
    remotes?: Array<{ type: string; url?: string }>
    packages?: Array<unknown>
  }
  _meta?: {
    'io.modelcontextprotocol.registry/official'?: { isLatest?: boolean }
  }
}

interface RegistryResponse {
  servers: RegistryEntry[]
  metadata?: { nextCursor?: string }
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function categorize(description: string | undefined, title: string | undefined): string {
  const hay = `${title ?? ''} ${description ?? ''}`.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some((kw) => hay.includes(kw))) return cat
  }
  return 'other'
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // no secret configured = open (dev only)
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = admin()
  let cursor: string | null = null
  let pages = 0
  let upserts = 0
  let skipped = 0
  const errors: string[] = []

  while (pages < MAX_PAGES) {
    const params = new URLSearchParams({ limit: String(PAGE_LIMIT) })
    if (cursor) params.set('cursor', cursor)

    let data: RegistryResponse
    try {
      const res = await fetch(`${REGISTRY_BASE}?${params}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      if (!res.ok) {
        errors.push(`Page ${pages + 1}: HTTP ${res.status}`)
        break
      }
      data = (await res.json()) as RegistryResponse
    } catch (err) {
      errors.push(`Page ${pages + 1}: ${err instanceof Error ? err.message : 'fetch failed'}`)
      break
    }

    pages++

    for (const entry of data.servers ?? []) {
      const isLatest = entry._meta?.['io.modelcontextprotocol.registry/official']?.isLatest
      if (isLatest === false) {
        skipped++
        continue
      }

      const s = entry.server
      const remote = (s.remotes ?? []).find((r) => r.type === 'streamable-http' || r.type === 'http' || r.type === 'sse')
      const category = categorize(s.description, s.title)

      const row = {
        server_name: s.name,
        server_title: s.title ?? null,
        description: s.description ?? null,
        version: s.version ?? null,
        has_remote: !!remote,
        remote_url: remote?.url ?? null,
        remote_type: remote?.type ?? null,
        repository_url: s.repository?.url ?? null,
        website_url: s.websiteUrl ?? null,
        category,
        tags: s.title ? [s.title.toLowerCase()] : [],
        tools_count: null, // populated lazily on view
        raw_data: entry,
        last_synced_at: new Date().toISOString(),
      }

      const { error } = await sb
        .from('mcp_registry_cache')
        .upsert(row, { onConflict: 'server_name,version' })
      if (error) {
        errors.push(`Upsert ${s.name}@${s.version}: ${error.message}`)
        continue
      }
      upserts++
    }

    cursor = data.metadata?.nextCursor ?? null
    if (!cursor) break
  }

  return NextResponse.json({
    ok: errors.length === 0,
    pages,
    upserts,
    skipped,
    errors: errors.slice(0, 20),
  })
}
