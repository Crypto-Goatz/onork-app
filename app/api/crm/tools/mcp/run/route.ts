/**
 * POST /api/crm/tools/mcp/run — run one tool from the Tools panel.
 *
 * THE ALLOWLIST IS ENFORCED HERE, not in the UI. The panel greys out disabled
 * tools, but a greyed button is a hint, not a control — anything that can
 * actually reach a customer's Stripe or Gmail has to be refused server-side.
 *
 * Every run writes a receipt, exactly like a command-bar leg. A tool invoked
 * from a panel touches a real account just as hard as one invoked from a
 * sentence, so it earns the same record of who ran what.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const tool = typeof body?.tool === 'string' ? body.tool.trim() : ''
  const args = body?.args && typeof body.args === 'object' ? body.args as Record<string, unknown> : {}
  if (!tool) return NextResponse.json({ error: 'Which tool?' }, { status: 400 })

  const allowed = (process.env.MCP_ALLOWED_TOOLS || '')
    .split(',').map((t) => t.trim()).filter(Boolean)
  if (!allowed.includes(tool)) {
    return NextResponse.json(
      { error: `${tool} is not switched on. Enabling it is a change to MCP_ALLOWED_TOOLS.` },
      { status: 403 },
    )
  }

  const { call0nMCP } = await import('@/lib/onmcp/client')
  const r = await call0nMCP(tool, args)

  // Receipt — same as a command-bar leg. Best-effort: a logging failure must not
  // swallow a result the user is waiting on.
  try {
    const db = createServiceClient()
    if (db) {
      const { data: agency } = await db
        .from('agency_connections')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (agency?.company_id) {
        await db.from('burst_receipts').insert({
          company_id: agency.company_id,
          capability: tool,
          intent: 'Run from the Tools panel',
          status: r.ok ? 'ok' : 'failed',
          detail: r.ok ? (r.text || '').slice(0, 1000) : null,
          error: r.ok ? null : (r.error || '').slice(0, 500),
          targets: 1,
          price_cents: 0,
          billed: false,
          source: 'tools-panel',
          settled_at: new Date().toISOString(),
        })
      }
    }
  } catch (err) {
    console.error('[tools/mcp/run] receipt failed:', err)
  }

  if (!r.ok) return NextResponse.json({ ok: false, error: r.error || `${tool} did not run.` }, { status: 502 })
  return NextResponse.json({ ok: true, text: r.text || 'Ran.' })
}
