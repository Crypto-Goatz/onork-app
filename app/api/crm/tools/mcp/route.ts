/**
 * GET /api/crm/tools/mcp — every tool the 0nMCP bridge exposes, with its schema.
 *
 * The bridge answers `tools/list` with a JSON Schema per tool, so the UI can
 * build the run form from the tool itself. Hand-writing 120 forms would drift
 * the moment a tool gains an argument, and the drift would be invisible until
 * a call failed with a missing field.
 *
 * ALLOWLISTED IS REPORTED, NOT FILTERED. MCP_ALLOWED_TOOLS currently permits 9
 * of 120, and a page that hides the other 111 makes the ceiling look like the
 * product. Showing them greyed says what exists and what is switched on, which
 * is the same rule the Actions glossary follows.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { on3ToolsList, on3TokenFor, on3ServiceToken } from '@/lib/on3'

interface McpTool {
  name: string
  description?: string
  inputSchema?: { properties?: Record<string, { type?: string; description?: string }>; required?: string[] }
}

/** The bridge speaks SSE-framed JSON-RPC, so the payload arrives after `data: `. */
export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const allowed = new Set(
    (process.env.MCP_ALLOWED_TOOLS || '').split(',').map((t) => t.trim()).filter(Boolean),
  )

  try {
    const token = (await on3TokenFor(user.id)) || on3ServiceToken()
    if (!token) return NextResponse.json({ error: 'No 0n token for this account yet.' }, { status: 502 })
    const listed = (await on3ToolsList(token)) as McpTool[]
    const tools = listed.map((t) => {
      const props = t.inputSchema?.properties ?? {}
      const required = new Set(t.inputSchema?.required ?? [])
      return {
        name: t.name,
        // Service prefix is the grouping the tool names already imply.
        service: t.name.split('_')[0],
        description: t.description || '',
        enabled: allowed.has(t.name),
        fields: Object.entries(props).map(([key, spec]) => ({
          key,
          type: spec?.type ?? 'string',
          description: spec?.description ?? '',
          required: required.has(key),
        })),
      }
    })

    tools.sort((a, b) => a.service.localeCompare(b.service) || a.name.localeCompare(b.name))

    return NextResponse.json({
      tools,
      total: tools.length,
      enabled: tools.filter((t) => t.enabled).length,
      services: [...new Set(tools.map((t) => t.service))].sort(),
    })
  } catch (err) {
    console.error('[tools/mcp] list failed:', err)
    return NextResponse.json({ error: 'Could not reach the tool bridge.' }, { status: 502 })
  }
}
