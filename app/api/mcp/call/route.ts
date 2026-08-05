import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/mcp/call — plain JSON in, plain JSON out, MCP in the middle.
 *
 * WHY THIS EXISTS. The CRM's "custom API" action is a generic HTTP call: one
 * POST, one response, `application/json`. The MCP worker answers
 * `text/event-stream` NO MATTER WHAT Accept header you send — verified — so the
 * action receives `event: message\ndata: {...}` and cannot parse it.
 *
 * This unwraps the SSE frame and returns clean JSON, which makes the custom-API
 * screen work without the agent needing an MCP client at all.
 *
 * IT ALSO ADDS THE AUTH THE WORKER LACKS. The worker answered `tools/call`
 * unauthenticated — anyone with the URL can write to the CRM. Pointing the agent
 * here instead means a bearer token is required, and the worker URL never has to
 * be published anywhere.
 *
 * DENY-BY-DEFAULT ON WRITES. A generic HTTP action reachable from a workflow is
 * a wide door; `MCP_ALLOWED_TOOLS` narrows it to the tools the agent is meant to
 * have. Unset means read-only, because the safe default for a door you forgot to
 * configure is one that cannot change anything.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const WORKER = process.env.ONMCP_MCP_URL || 'https://0nmcp-remote.0nmcp.workers.dev/mcp'

/** Tools that only read. Everything else needs an explicit allowlist entry. */
const READ_ONLY = /^(.*_(get|list|search|read|find)_|crm_get|crm_list|crm_search)/

function allowed(tool: string): boolean {
  const list = (process.env.MCP_ALLOWED_TOOLS || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (list.includes('*')) return true
  if (list.includes(tool)) return true
  return READ_ONLY.test(tool)
}

/** The worker replies "event: message\ndata: {...}". Take the JSON. */
function unwrap(raw: string): Record<string, unknown> | null {
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

export async function POST(req: NextRequest) {
  const secret = process.env.MCP_BRIDGE_TOKEN
  const given = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!secret || given !== secret) {
    return NextResponse.json({ ok: false, error: 'Not authorised.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const tool = String(body?.tool ?? body?.name ?? '').trim()
  const args = (body?.args ?? body?.arguments ?? {}) as Record<string, unknown>

  // No tool named = list what is available, which makes this discoverable from
  // the CRM's own Test tab.
  if (!tool) {
    const res = await fetch(WORKER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    })
    const j = unwrap(await res.text())
    const tools = ((j?.result as { tools?: { name: string; description?: string }[] })?.tools ?? [])
    return NextResponse.json({
      ok: true,
      tools: tools.map((t) => ({ name: t.name, description: t.description, allowed: allowed(t.name) })),
      count: tools.length,
    })
  }

  if (!allowed(tool)) {
    return NextResponse.json({
      ok: false,
      error: `"${tool}" is not switched on for this connection.`,
      // Named, so the fix is obvious rather than a mystery 403.
      fix: 'Add it to MCP_ALLOWED_TOOLS.',
    }, { status: 403 })
  }

  try {
    const res = await fetch(WORKER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name: tool, arguments: args } }),
      signal: AbortSignal.timeout(45000),
    })
    const raw = await res.text()
    const j = unwrap(raw)
    if (!j) return NextResponse.json({ ok: false, error: 'The tool server returned something unreadable.' }, { status: 502 })
    if (j.error) {
      const e = j.error as { message?: string }
      return NextResponse.json({ ok: false, error: e.message || 'The tool failed.' }, { status: 502 })
    }

    const content = ((j.result as { content?: { text?: string }[] })?.content ?? [])
    const text = content.map((c) => c.text).filter(Boolean).join('\n')

    // Many tools return JSON *as a string*. Parsed when possible, so the agent
    // gets fields it can branch on rather than a blob it has to re-parse.
    let data: unknown = undefined
    try { data = text ? JSON.parse(text) : undefined } catch { /* plain text is fine */ }

    return NextResponse.json({ ok: true, tool, text, ...(data !== undefined ? { data } : {}) })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'The call failed.' }, { status: 502 })
  }
}
