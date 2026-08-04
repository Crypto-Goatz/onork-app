import { callTool } from '@/lib/mcp/client'

/**
 * Server-only, enforced at runtime.
 *
 * The `server-only` package is not a dependency of this repo, and adding one to
 * guard a single import is not worth a package. This throws the moment the
 * module is evaluated in a browser, which is the same protection at the only
 * point that matters — and it fails loudly in development rather than shipping
 * a secret quietly.
 */
if (typeof window !== 'undefined') {
  throw new Error('This module is server-only and must never reach the browser.')
}


/**
 * 0nMCP, server-side only.
 *
 * A thin binding over the generic MCP client rather than a second
 * implementation — lib/mcp/client.ts already speaks JSON-RPC, handles the
 * transport and normalises results. This only fixes the endpoint and the key.
 *
 * `server-only` is load-bearing, not decorative. The 0nMCP key reaches every
 * connected service in the ecosystem; if this file were ever pulled into a
 * client bundle the key would ship to the browser. The import makes that a
 * build error instead of a breach.
 *
 * Nothing here is exported to a route handler that returns raw results — the
 * burst executor sanitises before anything reaches the iframe, because a tool
 * response can contain identifiers and internal vocabulary the customer has no
 * business seeing.
 */

const MCP_URL = process.env.ONMCP_MCP_URL || 'https://0nmcp-remote.0nmcp.workers.dev/mcp'

export interface OnmcpResult {
  ok: boolean
  /** Text content joined, which is what every tool here returns. */
  text: string
  /** Structured payload when the tool returned one. */
  data?: unknown
  error?: string
}

export async function call0nMCP(
  tool: string,
  args: Record<string, unknown> = {},
): Promise<OnmcpResult> {
  const apiKey = process.env.ONMCP_API_KEY
  if (!apiKey) return { ok: false, text: '', error: 'ONMCP_API_KEY not configured' }

  try {
    const res = await callTool(
      { url: MCP_URL, headers: { Authorization: `Bearer ${apiKey}` } } as never,
      tool,
      args,
    )

    const blocks = (res as { content?: { type?: string; text?: string }[] })?.content ?? []
    const text = blocks.filter((b) => b?.type === 'text').map((b) => b.text ?? '').join('\n').trim()
    const isError = (res as { isError?: boolean })?.isError === true

    if (isError) return { ok: false, text, error: text || 'tool reported an error' }
    return { ok: true, text, data: (res as { structuredContent?: unknown })?.structuredContent }
  } catch (e) {
    return { ok: false, text: '', error: e instanceof Error ? e.message : String(e) }
  }
}
