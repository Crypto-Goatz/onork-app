/**
 * POST/GET /api/mcp — Live MCP (Model Context Protocol) server endpoint.
 *
 * Speaks JSON-RPC 2.0 over HTTP. Any MCP-compatible client (Claude Desktop,
 * Cursor, Continue, Windsurf, Cline, custom SDK consumers) can connect to
 *
 *   POST https://0ncore.com/api/mcp
 *
 * Transport: Streamable HTTP (per MCP 2025-03-26). Responds JSON when the
 * caller sends `Accept: application/json`, SSE when the caller sends
 * `Accept: text/event-stream`. GET returns a small metadata blob for
 * discovery / health checks.
 *
 * Methods implemented:
 *   initialize         — server info + capabilities
 *   tools/list         — full tool catalog
 *   tools/call         — execute a tool, return MCP content blocks
 *   notifications/initialized — accepted (no-op)
 *   ping               — accepted (returns empty)
 *
 * Auth:
 *   - Bearer 0n_live_<hex> in Authorization header (preferred)
 *   - ?token=0n_live_<hex> query param
 *   - MCP_PUBLIC_KEY env var (for the discoverable "public" build) — accepted
 *     in Authorization header as `Bearer <key>` and grants read/execute on
 *     non-tenant tools (sxo_scan, generate_post). Tenant-bound tools
 *     (CRM, D&R) require a 0n_ token.
 *
 * initialize and tools/list are unauthenticated so MCP clients can discover
 * the server. tools/call is gated per-tool.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateToken, validateProfileToken, type TokenContext } from '@/lib/0n-token'
import { chargeExecution, creditWallet, EXECUTION_COST_CENTS } from '@/lib/wallet'
import { scoreContent } from '@/lib/vpis/formula'
import { runCombinedScan } from '@/lib/sxo-aeo/engine'
import {
  drAdmin,
  buildScriptTag,
  generateSiteId,
  generateScriptKey,
  normalizeDomain,
} from '@/lib/dr/admin'
import {
  V3_TOOLS,
  V3_TOOL_INDEX,
  V3_SDK_VERSION,
  V3_MODULE_COUNT,
  dispatchV3Tool,
  toolToInputSchema,
} from '@/lib/crm/v3/dispatch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PROTOCOL_VERSION = '2025-03-26'
const SERVER_INFO = { name: '0nCore MCP', version: '1.0.0' }

// ─────────────────────────────────────────────────────────────────────────
// Tool catalog
// ─────────────────────────────────────────────────────────────────────────

type ToolSchema = {
  name: string
  description: string
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
  // requireTenant=true => caller must present a valid 0n_ token (CRM/D&R scope)
  requireTenant?: boolean
}

const TOOLS: ToolSchema[] = [
  {
    name: 'vpis_score',
    description:
      'Score text content using the VPIS (Velocity/Profile/Intent/Stage) formula. ' +
      'Returns 8-factor breakdown + adjusted score for posts or comments.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Post or comment body to score' },
        type: {
          type: 'string',
          enum: ['post', 'comment'],
          description: 'Content type (default: post)',
        },
        target_keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional keywords to bias the keyword factor',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'sxo_scan',
    description:
      'Run a full SXO + AEO compliance scan on a URL. Returns SXO score, AEO score, ' +
      'combined score, per-pillar breakdown, findings, and page snapshot.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Absolute URL to scan' },
      },
      required: ['url'],
    },
  },
  {
    name: 'stack_scan',
    description:
      'Detect the CRM / marketing / analytics stack on a public URL. Returns ' +
      'identified vendors by category plus a stack-gap score (0–100).',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Absolute URL to scan' },
      },
      required: ['url'],
    },
  },
  {
    name: 'search_contacts',
    description:
      'Search CRM contacts by query string (name, email, phone, company). Returns ' +
      'up to `limit` contact records for the caller’s bound location.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', description: 'Max results (default 20, capped at 100)' },
      },
      required: ['query'],
    },
    requireTenant: true,
  },
  {
    name: 'create_tag',
    description: 'Create a new tag in the caller’s CRM location.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
    requireTenant: true,
  },
  {
    name: 'generate_post',
    description:
      'Generate a VPIS-scored LinkedIn post. Iterates up to 3 drafts via Groq and ' +
      'returns the best-scoring text plus its full factor breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        hook_archetype: {
          type: 'string',
          enum: [
            'absolute_declaration',
            'bait_and_flip',
            'specificity_spike',
            'authority_contrast',
            'confession_contrast',
          ],
        },
        icp_context: { type: 'string', description: 'Audience/ICP description' },
        value_prop: { type: 'string' },
        target_keywords: { type: 'string', description: 'Comma-separated keywords' },
        target_score: { type: 'number', description: 'Stop early when VPIS >= this' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'dr_register_domain',
    description:
      'Register a domain for Detect & Refine (D&R) click-quality tracking. Returns ' +
      'the generated site_id, script_key, and a ready-to-paste <script> tag.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Bare hostname, e.g. example.com' },
      },
      required: ['domain'],
    },
    requireTenant: true,
  },
  {
    name: 'dr_stats',
    description:
      'Fetch D&R click-grading stats for a site_id (or a domain you registered). ' +
      'Returns daily series, grade totals, top referrers and ad platforms.',
    inputSchema: {
      type: 'object',
      properties: {
        site_id: { type: 'string' },
        domain: { type: 'string', description: 'Used to look up site_id if omitted' },
        days: { type: 'number', description: 'Window in days (1–90, default 7)' },
      },
    },
    requireTenant: true,
  },
]

// ── v3 CRM catalog (auto-generated from HighLevel SDK v3.0.0) ─────────────
// 576 SDK-aligned CRM tools from lib/crm/v3/catalog.json. All require a
// tenant token; the generic dispatcher in lib/crm/v3/dispatch.ts handles
// path/query/body substitution against services.leadconnectorhq.com.
const V3_TOOL_SCHEMAS: ToolSchema[] = V3_TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  inputSchema: toolToInputSchema(t),
  requireTenant: true,
}))

const ALL_TOOLS: ToolSchema[] = [...TOOLS, ...V3_TOOL_SCHEMAS]

const TOOL_INDEX: Record<string, ToolSchema> = Object.fromEntries(
  ALL_TOOLS.map((t) => [t.name, t]),
)

// ─────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────

async function resolveAuth(
  req: NextRequest,
): Promise<{ ctx: TokenContext | null; publicOk: boolean }> {
  const header = req.headers.get('authorization') || ''
  let raw: string | null = null
  if (header.startsWith('Bearer ')) raw = header.slice(7).trim()
  if (!raw) raw = req.nextUrl.searchParams.get('token')

  if (raw && raw.startsWith('0n_')) {
    // 1) Try api_tokens (legacy/scoped tokens with location binding).
    const ctx = await validateToken(raw)
    if (ctx) return { ctx, publicOk: true }

    // 2) Try profiles.access_token (universal one-token-per-user).
    //    Synthesize a TokenContext from the profile so tenant-bound tools
    //    keep working unchanged.
    const profileRes = await validateProfileToken(raw)
    if (profileRes.valid && profileRes.profile) {
      const p = profileRes.profile as Record<string, unknown>
      return {
        ctx: {
          tokenId: `profile:${profileRes.profile.id}`,
          userId: profileRes.profile.id,
          locationId: (p.location_id as string) || '',
          scopes: ['read', 'write', 'execute'],
          channel: 'profile',
        },
        publicOk: true,
      }
    }
  }

  const publicKey = process.env.MCP_PUBLIC_KEY
  const publicOk = !!publicKey && raw === publicKey
  return { ctx: null, publicOk }
}

// ─────────────────────────────────────────────────────────────────────────
// JSON-RPC helpers
// ─────────────────────────────────────────────────────────────────────────

type JsonRpcId = string | number | null
type JsonRpcRequest = { jsonrpc: '2.0'; id?: JsonRpcId; method: string; params?: unknown }

function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: '2.0', id, result }
}
function rpcError(id: JsonRpcId, code: number, message: string, data?: unknown) {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } }
}

function wantsSSE(req: NextRequest): boolean {
  const a = req.headers.get('accept') || ''
  return a.includes('text/event-stream')
}

function respond(req: NextRequest, payload: unknown, status = 200) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, Accept, X-Location-Id, Mcp-Session-Id',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  }
  if (wantsSSE(req)) {
    return new NextResponse(`event: message\ndata: ${JSON.stringify(payload)}\n\n`, {
      status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        ...cors,
      },
    })
  }
  return NextResponse.json(payload, { status, headers: cors })
}

function toMcpContent(result: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
}

function toMcpError(message: string, result?: unknown) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify({ error: message, ...(result ? { result } : {}) }, null, 2) },
    ],
    isError: true,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// CRM helpers
// ─────────────────────────────────────────────────────────────────────────

const CRM_BASE = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

function crmHeaders(): Record<string, string> {
  const pit = process.env.CRM_PIT || process.env.CRM_PIT_TOKEN || process.env.CRM_AGENCY_PIT || ''
  return {
    Authorization: `Bearer ${pit}`,
    Version: CRM_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Tool executor
// ─────────────────────────────────────────────────────────────────────────

async function execTool(
  name: string,
  rawArgs: unknown,
  ctx: TokenContext | null,
  req: NextRequest,
): Promise<{ result?: unknown; error?: string }> {
  const args = (rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) as Record<string, unknown>

  switch (name) {
    case 'vpis_score': {
      const text = String(args.text ?? '').trim()
      if (!text) return { error: 'text required' }
      const type = (args.type as 'post' | 'comment') || 'post'
      const targetKeywords = Array.isArray(args.target_keywords)
        ? (args.target_keywords as string[])
        : undefined
      const scores = await scoreContent(text, type, { targetKeywords })
      return { result: scores }
    }

    case 'sxo_scan': {
      const url = String(args.url ?? '').trim()
      if (!url) return { error: 'url required' }
      const result = await runCombinedScan(url)
      return { result }
    }

    case 'stack_scan': {
      const url = String(args.url ?? '').trim()
      if (!url) return { error: 'url required' }
      return { result: await runStackScan(url) }
    }

    case 'search_contacts': {
      const query = String(args.query ?? '').trim()
      if (!query) return { error: 'query required' }
      const limit = Math.min(100, Math.max(1, Number(args.limit ?? 20)))
      const locationId = ctx!.locationId
      const res = await fetch(`${CRM_BASE}/contacts/search`, {
        method: 'POST',
        headers: crmHeaders(),
        body: JSON.stringify({ locationId, query, pageLimit: limit }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return { error: `CRM ${res.status}`, result: body }
      return { result: body }
    }

    case 'create_tag': {
      const tagName = String(args.name ?? '').trim()
      if (!tagName) return { error: 'name required' }
      const locationId = ctx!.locationId
      const res = await fetch(`${CRM_BASE}/locations/${locationId}/tags`, {
        method: 'POST',
        headers: crmHeaders(),
        body: JSON.stringify({ name: tagName }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return { error: `CRM ${res.status}`, result: body }
      return { result: body }
    }

    case 'generate_post': {
      const proto = req.headers.get('x-forwarded-proto') || 'https'
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '0ncore.com'
      const res = await fetch(`${proto}://${host}/api/linkedin-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.get('authorization')
            ? { Authorization: req.headers.get('authorization') as string }
            : {}),
        },
        body: JSON.stringify({ action: 'generate-post', ...args }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return { error: `linkedin-bot ${res.status}`, result: body }
      return { result: body }
    }

    case 'dr_register_domain': {
      const domain = normalizeDomain(String(args.domain ?? ''))
      if (!domain) return { error: 'invalid domain' }
      const locationId = ctx!.locationId
      const sb = drAdmin()
      const { data: existing } = await sb
        .from('dr_domains')
        .select('id, site_id, script_key')
        .eq('location_id', locationId)
        .eq('domain', domain)
        .eq('is_active', true)
        .maybeSingle()

      const proto = req.headers.get('x-forwarded-proto') || 'https'
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'www.0ncore.com'
      const origin = `${proto}://${host}`

      if (existing) {
        return {
          result: {
            already_registered: true,
            id: existing.id,
            siteId: existing.site_id,
            scriptKey: existing.script_key,
            domain,
            scriptTag: buildScriptTag(existing.site_id, origin),
          },
        }
      }

      const siteId = generateSiteId(domain)
      const scriptKey = generateScriptKey()
      const { data, error } = await sb
        .from('dr_domains')
        .insert({ location_id: locationId, domain, site_id: siteId, script_key: scriptKey, is_active: true })
        .select('id')
        .single()
      if (error || !data) return { error: error?.message || 'insert failed' }

      return {
        result: {
          id: data.id,
          siteId,
          scriptKey,
          domain,
          scriptTag: buildScriptTag(siteId, origin),
        },
      }
    }

    case 'dr_stats': {
      const sb = drAdmin()
      let siteId = (args.site_id as string) || ''
      const locationId = ctx!.locationId
      if (!siteId && args.domain) {
        const d = normalizeDomain(String(args.domain))
        if (!d) return { error: 'invalid domain' }
        const { data } = await sb
          .from('dr_domains')
          .select('site_id')
          .eq('location_id', locationId)
          .eq('domain', d)
          .eq('is_active', true)
          .maybeSingle()
        if (!data) return { error: 'domain not registered for this location' }
        siteId = data.site_id
      }
      if (!siteId) return { error: 'site_id or domain required' }

      // Verify the site belongs to this tenant.
      const { data: ownership } = await sb
        .from('dr_domains')
        .select('id')
        .eq('site_id', siteId)
        .eq('location_id', locationId)
        .maybeSingle()
      if (!ownership) return { error: 'site_id not owned by this token' }

      const days = Math.min(90, Math.max(1, Number(args.days ?? 7)))
      const since = new Date()
      since.setDate(since.getDate() - (days - 1))
      const sinceISO = since.toISOString().slice(0, 10)

      const { data: daily } = await sb
        .from('dr_daily_stats')
        .select('*')
        .eq('site_id', siteId)
        .gte('date', sinceISO)
        .order('date', { ascending: true })

      return { result: { siteId, days, daily: daily ?? [] } }
    }

    default: {
      // v3 CRM dispatcher — handles every crm_<sdkMethod> tool from the
      // generated catalog. One generic path → 576 tools.
      if (V3_TOOL_INDEX[name]) {
        const pit =
          process.env.CRM_PIT || process.env.CRM_PIT_TOKEN || process.env.CRM_AGENCY_PIT || ''
        if (!pit) return { error: 'CRM PIT not configured (set CRM_PIT)' }
        const r = await dispatchV3Tool(name, args, {
          accessToken: pit,
          locationId: ctx?.locationId || process.env.CRM_LOCATION_ID || '',
        })
        if (!r.ok) return { error: r.error ?? `CRM ${r.status}`, result: r.data }
        return { result: r.data }
      }
      return { error: `unknown tool: ${name}` }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Stack scan (lightweight, server-side)
// ─────────────────────────────────────────────────────────────────────────

type StackHit = { id: string; name: string; category: string; evidence: string[] }

const STACK_SIGNATURES: Array<{ id: string; name: string; category: string; pattern: RegExp }> = [
  { id: 'ga4', name: 'Google Analytics 4', category: 'analytics', pattern: /gtag\(['"]config['"]\s*,\s*['"]G-[A-Z0-9]+/i },
  { id: 'gtm', name: 'Google Tag Manager', category: 'analytics', pattern: /googletagmanager\.com\/(gtm|gtag)\.js/i },
  { id: 'meta_pixel', name: 'Meta Pixel', category: 'analytics', pattern: /connect\.facebook\.net\/.+?\/fbevents\.js/i },
  { id: 'plausible', name: 'Plausible', category: 'analytics', pattern: /plausible\.io\/js/i },
  { id: 'segment', name: 'Segment', category: 'analytics', pattern: /cdn\.segment\.com\/analytics\.js/i },
  { id: 'hubspot', name: 'HubSpot', category: 'crm', pattern: /js\.hs-(scripts|analytics|banner|forms)\.com/i },
  { id: 'crm', name: 'CRM (LeadConnector)', category: 'crm', pattern: /leadconnectorhq\.com|msgsndr\.com/i },
  { id: 'salesforce', name: 'Salesforce', category: 'crm', pattern: /salesforce\.com|sforce\.com/i },
  { id: 'intercom', name: 'Intercom', category: 'support', pattern: /widget\.intercom\.io/i },
  { id: 'drift', name: 'Drift', category: 'support', pattern: /js\.driftt\.com/i },
  { id: 'zendesk', name: 'Zendesk', category: 'support', pattern: /static\.zdassets\.com/i },
  { id: 'mailchimp', name: 'Mailchimp', category: 'email', pattern: /chimpstatic\.com|list-manage\.com/i },
  { id: 'klaviyo', name: 'Klaviyo', category: 'email', pattern: /static\.klaviyo\.com/i },
  { id: 'convertkit', name: 'ConvertKit', category: 'email', pattern: /(convertkit|ck-cdn)\.com/i },
  { id: 'activecampaign', name: 'ActiveCampaign', category: 'email', pattern: /trackcmp\.net|activehosted\.com/i },
  { id: 'stripe', name: 'Stripe', category: 'payments', pattern: /js\.stripe\.com/i },
  { id: 'paypal', name: 'PayPal', category: 'payments', pattern: /paypal\.com\/sdk\/js/i },
  { id: 'cloudflare', name: 'Cloudflare', category: 'cdn', pattern: /cdn\.cloudflare\.com|cloudflare\.com\/cdn-cgi/i },
  { id: 'cro9', name: 'CRO9', category: 'sxo', pattern: /cro9\.com|0nmcp\.com\/analytics/i },
]

const REQUIRED_CATEGORIES = ['analytics', 'crm', 'email']

async function runStackScan(url: string): Promise<unknown> {
  let target: URL
  try {
    target = new URL(url)
  } catch {
    return { error: 'invalid URL' }
  }

  let html = ''
  let status = 0
  let headers: Record<string, string> = {}
  try {
    const res = await fetch(target.toString(), {
      headers: { 'User-Agent': '0nCore-MCP/1.0 (+https://0ncore.com)' },
      redirect: 'follow',
    })
    status = res.status
    headers = Object.fromEntries(res.headers.entries())
    html = await res.text()
  } catch (e) {
    return { error: `fetch failed: ${(e as Error).message}` }
  }

  const byCategory: Record<string, StackHit[]> = {}
  for (const sig of STACK_SIGNATURES) {
    const m = sig.pattern.exec(html)
    if (m) {
      const hit: StackHit = {
        id: sig.id,
        name: sig.name,
        category: sig.category,
        evidence: [m[0].slice(0, 200)],
      }
      ;(byCategory[sig.category] ??= []).push(hit)
    }
  }

  const gaps = REQUIRED_CATEGORIES.filter((c) => !byCategory[c]?.length)
  const detectedCount = Object.values(byCategory).filter((v) => v.length > 0).length
  const bonus = detectedCount >= 5 ? 1 : 0
  const weakMatches = byCategory.analytics?.some((h) => h.id === 'ga4') && !byCategory.analytics?.some((h) => h.id === 'gtm') ? 1 : 0
  let score = 100 - gaps.length * 8 - weakMatches * 4 + bonus * 2
  score = Math.max(0, Math.min(100, score))

  return {
    url: target.toString(),
    hostname: target.hostname,
    status,
    server: headers['server'] || null,
    detected: byCategory,
    gaps,
    stack_gap_score: score,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// HTTP handlers
// ─────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  return respond(req, {
    server: SERVER_INFO,
    protocolVersion: PROTOCOL_VERSION,
    transport: 'streamable-http',
    endpoints: { mcp: '/api/mcp', discovery: '/.well-known/mcp.json' },
    methods: ['initialize', 'tools/list', 'tools/call', 'ping'],
    tools: ALL_TOOLS.length,
    crm: {
      sdk_version: V3_SDK_VERSION,
      modules: V3_MODULE_COUNT,
      tools: V3_TOOLS.length,
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers':
        'Authorization, Content-Type, Accept, X-Location-Id, Mcp-Session-Id',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest
  try {
    body = (await req.json()) as JsonRpcRequest
  } catch {
    return respond(req, rpcError(null, -32700, 'Parse error'), 400)
  }

  const { id = null, method, params } = body || ({} as JsonRpcRequest)
  if (!method) return respond(req, rpcError(id, -32600, 'Invalid Request: missing method'), 400)

  // Notifications (no response required per JSON-RPC) — accept silently.
  if (method.startsWith('notifications/')) {
    return new NextResponse(null, {
      status: 202,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  if (method === 'ping') {
    return respond(req, rpcResult(id, {}))
  }

  if (method === 'initialize') {
    return respond(
      req,
      rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          'Live MCP server for the 0nCore / 0nMCP ecosystem. Tenant-scoped tools require a 0n_ token in Authorization: Bearer. Discovery: GET /.well-known/mcp.json.',
      }),
    )
  }

  if (method === 'tools/list') {
    const tools = ALL_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }))
    return respond(req, rpcResult(id, { tools }))
  }

  if (method === 'tools/call') {
    const p = (params || {}) as { name?: string; arguments?: unknown }
    const name = p.name || ''
    const schema = TOOL_INDEX[name]
    if (!schema) return respond(req, rpcResult(id, toMcpError(`unknown tool: ${name}`)))

    const { ctx, publicOk } = await resolveAuth(req)
    if (schema.requireTenant && !ctx) {
      return respond(req, rpcResult(id, toMcpError('tool requires a 0n_ tenant token (Authorization: Bearer 0n_live_...)')))
    }
    if (!schema.requireTenant && !ctx && !publicOk && !process.env.MCP_OPEN_PUBLIC) {
      return respond(req, rpcResult(id, toMcpError('authorization required (Bearer 0n_ token or configured MCP_PUBLIC_KEY)')))
    }

    // Meter: each authenticated execution costs $0.05. Pre-charge, refund on failure.
    // Public/unauthenticated calls (no userId) are not metered.
    let charged = false
    if (ctx?.userId) {
      const charge = await chargeExecution(ctx.userId, { description: `mcp:${name}`, ref: name })
      if (!charge.ok) {
        return respond(req, rpcResult(id, toMcpError('Insufficient balance — add funds to continue. Each execution costs $0.05.')))
      }
      charged = true
    }
    const refund = async () => {
      if (charged && ctx?.userId) {
        await creditWallet(ctx.userId, EXECUTION_COST_CENTS, { kind: 'refund', description: `refund mcp:${name}`, ref: name })
      }
    }

    try {
      const { result, error } = await execTool(name, p.arguments, ctx, req)
      if (error) { await refund(); return respond(req, rpcResult(id, toMcpError(error, result))) }
      return respond(req, rpcResult(id, toMcpContent(result)))
    } catch (e) {
      await refund()
      return respond(req, rpcResult(id, toMcpError((e as Error).message)))
    }
  }

  return respond(req, rpcError(id, -32601, `Method not found: ${method}`))
}
