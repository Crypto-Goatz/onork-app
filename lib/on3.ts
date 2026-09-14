/**
 * 0n3 — the one hosted 0n runtime (https://0n3.app). Every tool call from
 * 0nCore goes here with a 0n token that names the account it acts for:
 *
 *   • a signed-in person → their own token (profiles.access_token)
 *   • the CRM agent bridge / server jobs → ON3_TOKEN, a scoped, revocable
 *     access_tokens row named "CRM agent bridge (0nCore)"
 *
 * There is no unauthenticated path. If no token can be found the call is
 * refused here with a reason, never forwarded.
 */
import { createClient } from '@supabase/supabase-js'

export const on3Url = () => (process.env.ON3_URL || 'https://0n3.app').replace(/\/$/, '')
export const on3McpUrl = () => `${on3Url()}/mcp`

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

/** A person's own 0n token, minted on first use (same generator as /api/token). */
export async function on3TokenFor(userId: string): Promise<string | null> {
  const { data } = await admin().from('profiles').select('access_token').eq('id', userId).maybeSingle()
  if (data?.access_token) return data.access_token
  try {
    const { generateProfileToken } = await import('@/lib/0n-token')
    return await generateProfileToken(userId)
  } catch {
    return null
  }
}

/** The server's own token for jobs that act for the agency account. */
export function on3ServiceToken(): string | null {
  return process.env.ON3_TOKEN || null
}

export interface On3Result { ok: boolean; text: string; data?: unknown; error?: string; status?: number }

function parseRpc(raw: string): Record<string, unknown> | null {
  for (const line of raw.split('\n')) {
    const s = line.startsWith('data:') ? line.slice(5).trim() : line.trim()
    if (!s.startsWith('{')) continue
    try { return JSON.parse(s) } catch { /* keep scanning */ }
  }
  return null
}

export async function on3Rpc(token: string, method: string, params: Record<string, unknown> = {}, timeoutMs = 45_000): Promise<{ ok: boolean; status: number; rpc: Record<string, unknown> | null }> {
  const res = await fetch(on3McpUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  })
  return { ok: res.ok, status: res.status, rpc: parseRpc(await res.text()) }
}

export async function on3ToolsList(token: string): Promise<{ name: string; description?: string; inputSchema?: unknown }[]> {
  const r = await on3Rpc(token, 'tools/list', {}, 20_000)
  const result = (r.rpc?.result ?? {}) as { tools?: { name: string; description?: string; inputSchema?: unknown }[] }
  return result.tools ?? []
}

export async function on3Call(token: string, tool: string, args: Record<string, unknown> = {}): Promise<On3Result> {
  try {
    const r = await on3Rpc(token, 'tools/call', { name: tool, arguments: args })
    if (!r.ok && !r.rpc) return { ok: false, text: '', error: r.status === 401 ? 'The 0n token was refused by 0n3.' : `0n3 answered ${r.status}.`, status: r.status }
    if (r.rpc?.error) { const e = r.rpc.error as { message?: string }; return { ok: false, text: '', error: e.message || 'The tool failed.', status: r.status } }
    const result = (r.rpc?.result ?? {}) as { content?: { type?: string; text?: string }[]; isError?: boolean; structuredContent?: unknown }
    const text = (result.content ?? []).filter((b) => b?.type === 'text').map((b) => b.text ?? '').join('\n').trim()
    let data: unknown = result.structuredContent
    if (data === undefined && text) { try { data = JSON.parse(text) } catch { /* plain text */ } }
    if (result.isError) return { ok: false, text, error: text || 'tool reported an error', status: r.status }
    return { ok: true, text, data, status: r.status }
  } catch (e) {
    return { ok: false, text: '', error: e instanceof Error ? e.message : String(e) }
  }
}
