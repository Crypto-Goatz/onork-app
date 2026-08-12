/**
 * POST /api/crm/scans — run an SXO scan for the agency or one of its clients.
 *
 * Goes through the 0nMCP bridge (`sxo_scan`, `sxo_generate_report`) rather than
 * reimplementing the scanner. The scanner is a product in its own right and
 * lives on sxowebsite.com; duplicating it here would be a second copy to keep
 * correct.
 *
 * ALLOWLIST-GATED like every other bridge tool. `sxo_scan` is not currently in
 * MCP_ALLOWED_TOOLS, so this returns a clear refusal naming the change needed
 * instead of a generic failure — the tool exists, it is simply not switched on.
 *
 * Every scan writes a receipt. A scan run for a client is work done in that
 * client's name and is charged for, so it earns a record like any other leg.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const TOOLS: Record<string, string> = {
  score: 'sxo_scan',
  report: 'sxo_generate_report',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const kind = typeof body?.kind === 'string' ? body.kind : 'score'
  const domain = typeof body?.domain === 'string' ? body.domain.trim() : ''
  const forClient = typeof body?.locationId === 'string' ? body.locationId.trim() : ''

  const tool = TOOLS[kind]
  if (!tool) return NextResponse.json({ error: 'Unknown scan type.' }, { status: 400 })
  if (!domain) return NextResponse.json({ error: 'Which site should I scan?' }, { status: 400 })

  const allowed = (process.env.MCP_ALLOWED_TOOLS || '').split(',').map((t) => t.trim())
  if (!allowed.includes(tool)) {
    return NextResponse.json(
      {
        error: `Scans are not switched on yet. ${tool} exists on the bridge — enabling it is a change to MCP_ALLOWED_TOOLS.`,
        needsTool: tool,
      },
      { status: 403 },
    )
  }

  const { call0nMCP } = await import('@/lib/onmcp/client')
  const r = await call0nMCP(tool, { domain, url: domain })

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
          location_id: forClient || null,
          capability: tool,
          intent: `SXO ${kind} scan of ${domain}`,
          status: r.ok ? 'ok' : 'failed',
          detail: r.ok ? (r.text || '').slice(0, 1000) : null,
          error: r.ok ? null : (r.error || '').slice(0, 500),
          targets: 1,
          price_cents: 0,
          billed: false,
          source: 'scans',
          settled_at: new Date().toISOString(),
        })
      }
    }
  } catch (err) {
    console.error('[crm/scans] receipt failed:', err)
  }

  if (!r.ok) return NextResponse.json({ error: r.error || 'The scan did not run.' }, { status: 502 })
  return NextResponse.json({ ok: true, text: r.text })
}
