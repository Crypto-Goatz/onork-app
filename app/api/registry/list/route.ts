/**
 * GET /api/registry/list
 *
 * Unified browse for the registry — both MCP servers AND UCP products,
 * each row pre-decorated with its security-scan gate decision and
 * a one-click eligibility flag.
 *
 * Query params:
 *   ?type=mcp|ucp|all   (default: all)
 *   ?q=<search>
 *   ?category=<cat>
 *   ?limit=50  (max 200)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { evaluateGate, type RegistryScanRow, type TargetType } from '@/lib/security/registry-scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

const ONE_CLICK_FULFILLMENT_TYPES = new Set(['instant', 'digital', 'config_only'])

interface RegistryItem {
  kind: 'mcp' | 'ucp'
  id: string
  slug: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  icon: string | null
  // commerce
  price_cents: number | null
  price_type: string | null
  fulfillment_type?: string | null
  // mcp-specific
  npm_name?: string | null
  install_url?: string | null
  packages?: unknown
  // shared
  install_count: number | null
  rating: number | null
  // gate
  scan_status: string
  scan_engines_total: number
  scan_engines_flagged: number
  scan_threats: string[]
  install_allowed: boolean
  install_blocked_reason: string | null
  one_click_eligible: boolean
  scanned_at: string | null
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const type = url.searchParams.get('type') || 'all'
  const q = (url.searchParams.get('q') || '').trim()
  const category = url.searchParams.get('category')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200)

  const sb = admin()

  // 1. Pull both registries in parallel

  type McpRow = {
    name: string
    title: string | null
    description: string | null
    version: string | null
    packages: unknown
    remotes: unknown
    repository: unknown
    install_count: number | null
    rating: number | null
    is_featured: boolean | null
    tags: string[] | null
  }

  type UcpRow = {
    id: string
    slug: string
    name: string
    description: string | null
    long_description: string | null
    category: string | null
    tags: string[] | null
    price_cents: number | null
    price_type: string | null
    fulfillment_type: string | null
    icon: string | null
    featured: boolean | null
    total_sold: number | null
    avg_rating: number | null
  }

  const fetchMcp = async (): Promise<McpRow[]> => {
    if (type !== 'all' && type !== 'mcp') return []
    let query = sb
      .from('mcp_registry_servers')
      .select('name, title, description, version, packages, remotes, repository, install_count, rating, is_featured, tags')
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('install_count', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (q) query = query.or(`name.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`)
    const r = await query
    return (r.data as McpRow[] | null) || []
  }

  const fetchUcp = async (): Promise<UcpRow[]> => {
    if (type !== 'all' && type !== 'ucp') return []
    let query = sb
      .from('ucp_products')
      .select('id, slug, name, description, long_description, category, tags, price_cents, price_type, fulfillment_type, icon, featured, total_sold, avg_rating')
      .eq('status', 'active')
      .order('featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .limit(limit)
    if (category) query = query.eq('category', category)
    if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    const r = await query
    return (r.data as UcpRow[] | null) || []
  }

  const [mcpRows, ucpRows] = await Promise.all([fetchMcp(), fetchUcp()])

  // 2. Pull all relevant scans in one query
  const targets: Array<{ target_type: TargetType; target_id: string }> = [
    ...mcpRows.map((m) => ({ target_type: 'mcp' as TargetType, target_id: m.name })),
    ...ucpRows.map((u) => ({ target_type: 'ucp_product' as TargetType, target_id: u.id })),
  ]
  const scansByKey = new Map<string, RegistryScanRow>()
  if (targets.length > 0) {
    const targetIds = targets.map((t) => t.target_id)
    const { data: scans } = await sb
      .from('registry_security_scans')
      .select('*')
      .in('target_id', targetIds)
    for (const s of (scans as RegistryScanRow[] | null) || []) {
      scansByKey.set(`${s.target_type}:${s.target_id}`, s)
    }
  }

  // 3. Shape items
  const items: RegistryItem[] = []

  for (const m of mcpRows) {
    const scan = scansByKey.get(`mcp:${m.name}`) || null
    const gate = evaluateGate(scan)
    const npmName = (() => {
      const pkgs = m.packages as Array<{ registry?: string; identifier?: string }> | null
      const npmPkg = pkgs?.find((p) => p?.registry === 'npm')
      return npmPkg?.identifier || null
    })()
    const installUrl = (() => {
      const remotes = m.remotes as Array<{ url?: string; transport?: string }> | null
      return remotes?.[0]?.url || null
    })()
    items.push({
      kind: 'mcp',
      id: m.name,
      slug: m.name,
      name: m.title || m.name,
      description: m.description,
      category: null,
      tags: m.tags || [],
      icon: null,
      price_cents: 0,
      price_type: 'free',
      npm_name: npmName,
      install_url: installUrl,
      packages: m.packages,
      install_count: m.install_count,
      rating: m.rating,
      scan_status: gate.status,
      scan_engines_total: gate.engines_total,
      scan_engines_flagged: gate.engines_flagged,
      scan_threats: gate.threat_categories,
      install_allowed: gate.allowed,
      install_blocked_reason: gate.allowed ? null : gate.reason || null,
      // MCP one-click eligibility = no env vars required
      // Heuristic: stdio packages with no documented env vars
      one_click_eligible: gate.allowed && !!npmName,
      scanned_at: gate.scanned_at || null,
    })
  }

  for (const u of ucpRows) {
    const scan = scansByKey.get(`ucp_product:${u.id}`) || null
    const gate = evaluateGate(scan)
    const fulfillment = (u.fulfillment_type || '').toLowerCase()
    const isFree = (u.price_cents ?? 0) === 0
    items.push({
      kind: 'ucp',
      id: u.id,
      slug: u.slug,
      name: u.name,
      description: u.description,
      category: u.category,
      tags: u.tags || [],
      icon: u.icon,
      price_cents: u.price_cents,
      price_type: u.price_type,
      fulfillment_type: u.fulfillment_type,
      install_count: u.total_sold,
      rating: u.avg_rating,
      scan_status: gate.status,
      scan_engines_total: gate.engines_total,
      scan_engines_flagged: gate.engines_flagged,
      scan_threats: gate.threat_categories,
      install_allowed: gate.allowed,
      install_blocked_reason: gate.allowed ? null : gate.reason || null,
      one_click_eligible: gate.allowed && isFree && ONE_CLICK_FULFILLMENT_TYPES.has(fulfillment),
      scanned_at: gate.scanned_at || null,
    })
  }

  return NextResponse.json({
    items,
    counts: {
      total: items.length,
      mcp: items.filter((i) => i.kind === 'mcp').length,
      ucp: items.filter((i) => i.kind === 'ucp').length,
      passed: items.filter((i) => i.scan_status === 'passed').length,
      flagged: items.filter((i) => i.scan_status === 'flagged').length,
      pending: items.filter((i) => i.scan_status === 'pending').length,
      one_click: items.filter((i) => i.one_click_eligible).length,
    },
  })
}
