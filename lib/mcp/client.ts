/**
 * Minimal MCP client (Streamable HTTP transport).
 *
 * The Model Context Protocol uses JSON-RPC 2.0 over HTTP. For the SHTTP
 * transport, every call is a single POST to the server's endpoint with a
 * JSON-RPC body. We support two RPCs:
 *
 *   tools/list   — returns the server's tool catalog
 *   tools/call   — invokes a named tool with an arguments object
 *
 * Auth varies per server:
 *   - Browserbase: env vars are passed via headers (X-BB-API-Key, ...)
 *   - Generic Bearer: send Authorization: Bearer <token>
 *
 * For env-var-style servers we fall back to forwarding all env_vars as
 * `X-MCP-ENV-<KEY>` headers if the server doesn't have a known shape.
 */

interface ToolDef {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

interface ListToolsResult {
  tools: ToolDef[]
}

interface CallToolResult {
  content: Array<{ type: string; text?: string; data?: unknown }>
  isError?: boolean
}

export interface McpServerConfig {
  url: string
  envVars?: Record<string, string>
  bearerToken?: string | null
  slug?: string
  /**
   * Resolved headers from a registry-style server entry. Each header is
   * applied verbatim — placeholders already substituted at connect time.
   * Takes precedence over envVars/bearerToken when present.
   */
  registryHeaders?: Record<string, string>
}

interface JsonRpcResponse<T> {
  jsonrpc: '2.0'
  id: number | string
  result?: T
  error?: { code: number; message: string; data?: unknown }
}

let nextId = 1

function buildHeaders(cfg: McpServerConfig): HeadersInit {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  }

  // Highest priority — explicit headers from a registry-driven connect
  if (cfg.registryHeaders) {
    for (const [k, v] of Object.entries(cfg.registryHeaders)) {
      if (typeof v === 'string' && v.length > 0) h[k] = v
    }
    return h
  }

  if (cfg.bearerToken) {
    h.Authorization = `Bearer ${cfg.bearerToken}`
  }
  // Per-server known env-to-header mappings (legacy preset path)
  if (cfg.slug === 'browserbase' && cfg.envVars) {
    if (cfg.envVars.BROWSERBASE_API_KEY) h['X-BB-API-Key'] = cfg.envVars.BROWSERBASE_API_KEY
    if (cfg.envVars.BROWSERBASE_PROJECT_ID) h['X-BB-Project-Id'] = cfg.envVars.BROWSERBASE_PROJECT_ID
    if (cfg.envVars.GEMINI_API_KEY) h['X-BB-Gemini-Key'] = cfg.envVars.GEMINI_API_KEY
  }
  // Fallback — generic env forwarding for unknown servers
  if (cfg.envVars && cfg.slug !== 'browserbase') {
    for (const [k, v] of Object.entries(cfg.envVars)) {
      if (typeof v === 'string') h[`X-MCP-ENV-${k}`] = v
    }
  }
  return h
}

async function jsonRpc<T>(cfg: McpServerConfig, method: string, params: Record<string, unknown> = {}): Promise<T> {
  const id = nextId++
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: buildHeaders(cfg),
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`MCP HTTP ${res.status}: ${text.slice(0, 300)}`)
  }

  // Some MCP servers respond with text/event-stream — take the first JSON event
  const ct = res.headers.get('content-type') || ''
  let payload: unknown
  if (ct.includes('text/event-stream')) {
    const text = await res.text()
    const dataLine = text
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('data:'))
    if (!dataLine) throw new Error('MCP SSE: no data event')
    payload = JSON.parse(dataLine.slice('data:'.length).trim())
  } else {
    payload = await res.json()
  }

  const j = payload as JsonRpcResponse<T>
  if (j.error) {
    throw new Error(`MCP RPC error ${j.error.code}: ${j.error.message}`)
  }
  if (j.result === undefined) {
    throw new Error('MCP RPC: no result')
  }
  return j.result
}

export async function listTools(cfg: McpServerConfig): Promise<ToolDef[]> {
  const result = await jsonRpc<ListToolsResult>(cfg, 'tools/list')
  return result.tools ?? []
}

export async function callTool(cfg: McpServerConfig, name: string, args: Record<string, unknown> = {}): Promise<CallToolResult> {
  return jsonRpc<CallToolResult>(cfg, 'tools/call', { name, arguments: args })
}

// ─────────────────────────────────────────────────────────────────────────
// Presets — one-click "Add Browserbase" UX
// ─────────────────────────────────────────────────────────────────────────

export interface McpPreset {
  slug: string
  name: string
  description: string
  url: string
  authMode: 'env' | 'bearer'
  envFields?: Array<{ key: string; label: string; required: boolean; secret: boolean }>
  bearerLabel?: string
  docs: string
  iconChar?: string
}

export const MCP_PRESETS: McpPreset[] = [
  {
    slug: 'browserbase',
    name: 'Browserbase',
    description:
      'Cloud browser automation for AI agents. start, navigate, act, observe, extract, end — backed by Stagehand.',
    url: 'https://mcp.browserbase.com/mcp',
    authMode: 'env',
    envFields: [
      { key: 'BROWSERBASE_API_KEY', label: 'API Key', required: true, secret: true },
      { key: 'BROWSERBASE_PROJECT_ID', label: 'Project ID', required: true, secret: false },
      { key: 'GEMINI_API_KEY', label: 'Gemini API Key (optional, for Stagehand model)', required: false, secret: true },
    ],
    docs: 'https://docs.browserbase.com/integrations/mcp/introduction',
    iconChar: '🌐',
  },
]
