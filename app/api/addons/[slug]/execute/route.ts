/**
 * POST /api/addons/[slug]/execute — Manually trigger an add-on execution.
 * Generic for ALL add-ons. Execution logic defined in lib/addon-registry.ts.
 *
 * THE GATE MOVED OFF user_id. This route used to require a `product_keys` row
 * matching the CALLER — a table that has zero rows in production, so the answer
 * was "not purchased" for every human who ever pressed Run, including people
 * with a live install. Worse, when it did have rows it entitled one person
 * rather than the sub-account: the colleague sharing the location got a 403 on
 * a product their business pays for. Entitlement is now resolved per LOCATION
 * by lib/addons/entitlements.ts, which also honours grace.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getAddonDefinition } from '@/lib/addon-registry'
import { requireAddonAccess } from '@/lib/addons/guard'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const definition = getAddonDefinition(slug)
  if (!definition) {
    return NextResponse.json({ error: `Unknown add-on: ${slug}` }, { status: 404 })
  }

  // Per-location entitlement. 'grace' is allowed to run — that is what grace is.
  const access = await requireAddonAccess(slug)
  if (!access.ok) return access.response
  const user = { id: access.userId }

  // Get user's config
  const { data: configRow } = await admin
    .from('addon_configs')
    .select('config')
    .eq('user_id', user.id)
    .eq('addon_slug', slug)
    .single()

  if (!configRow?.config) {
    return NextResponse.json({ error: 'Add-on not configured. Set up your preferences first.' }, { status: 400 })
  }

  // Get user's profile for CRM location
  const { data: profile } = await admin
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  // Get user's connected accounts
  const { data: connections } = await admin
    .from('user_connections')
    .select('provider, access_token, metadata')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const connMap: Record<string, { access_token: string; metadata?: Record<string, unknown> }> = {}
  for (const c of connections || []) {
    connMap[c.provider] = { access_token: c.access_token, metadata: c.metadata }
  }

  // Create execution record
  const { data: execution } = await admin
    .from('addon_executions')
    .insert({
      user_id: user.id,
      addon_slug: slug,
      status: 'running',
      config_snapshot: configRow.config,
    })
    .select()
    .single()

  const startTime = Date.now()

  try {
    // Run the add-on
    const result = await definition.execute({
      userId: user.id,
      // The gate already resolved and trimmed this. Reading it twice is how the
      // two copies end up disagreeing about which location is being acted on.
      locationId: access.locationId || profile?.crm_location_id || '',
      config: configRow.config,
      connections: connMap,
      crmPit: process.env.CRM_PIT || '',
    })

    const durationMs = Date.now() - startTime

    // Update execution record
    await admin
      .from('addon_executions')
      .update({
        status: result.success ? 'success' : 'error',
        result: { summary: result.summary, outputs: result.outputs, items: result.items },
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution?.id)

    // Update config with last run info
    await admin
      .from('addon_configs')
      .update({
        last_run_at: new Date().toISOString(),
        run_count: (configRow as Record<string, unknown>).run_count
          ? Number((configRow as Record<string, unknown>).run_count) + 1
          : 1,
        last_result: { summary: result.summary, items: result.items },
        last_error: result.success ? null : result.summary,
      })
      .eq('user_id', user.id)
      .eq('addon_slug', slug)

    return NextResponse.json({ result, execution_id: execution?.id })
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'

    await admin
      .from('addon_executions')
      .update({
        status: 'error',
        error: errorMsg,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution?.id)

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
