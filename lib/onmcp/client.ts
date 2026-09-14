
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

/**
 * 0n3 is the runtime now. The unauthenticated worker this used to call is
 * retired (it executed CRM, Stripe and database tools for anyone who found the
 * URL). Every call carries a 0n token: the caller's own when one is passed,
 * otherwise ON3_TOKEN — the scoped "CRM agent bridge" token.
 */
import { on3Call, on3ServiceToken } from '@/lib/on3'

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
  opts: { token?: string } = {},
): Promise<OnmcpResult> {
  const token = opts.token || on3ServiceToken()
  if (!token) return { ok: false, text: '', error: 'ON3_TOKEN is not configured, so 0nCore has no account to act as.' }
  const r = await on3Call(token, tool, args)
  return { ok: r.ok, text: r.text, data: r.data, error: r.error }
}
