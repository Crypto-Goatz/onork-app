/**
 * GET /api/cron/addons — Run all scheduled add-ons.
 * Called by Vercel cron. Iterates all enabled addon_configs on schedule.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAddonDefinition } from '@/lib/addon-registry'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all enabled configs that are due to run
  const { data: configs } = await supabase
    .from('addon_configs')
    .select('*, profiles!inner(crm_location_id)')
    .eq('enabled', true)
    .in('schedule', ['daily', 'hourly', 'weekly'])

  if (!configs || configs.length === 0) {
    return NextResponse.json({ ran: 0, message: 'No scheduled add-ons' })
  }

  const results = []

  for (const cfg of configs) {
    const definition = getAddonDefinition(cfg.addon_slug)
    if (!definition) continue

    // Check if user still has active purchase
    const { data: key } = await supabase
      .from('product_keys')
      .select('status')
      .eq('user_id', cfg.user_id)
      .eq('product_slug', cfg.addon_slug)
      .eq('status', 'active')
      .single()

    if (!key) continue

    // Skip if not due yet (simple schedule check)
    if (cfg.last_run_at) {
      const lastRun = new Date(cfg.last_run_at)
      const now = new Date()
      const hoursSince = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)

      if (cfg.schedule === 'hourly' && hoursSince < 0.9) continue
      if (cfg.schedule === 'daily' && hoursSince < 22) continue
      if (cfg.schedule === 'weekly' && hoursSince < 166) continue
    }

    // Get user's connections
    const { data: connections } = await supabase
      .from('user_connections')
      .select('provider, access_token, metadata')
      .eq('user_id', cfg.user_id)
      .eq('status', 'active')

    const connMap: Record<string, { access_token: string; metadata?: Record<string, unknown> }> = {}
    for (const c of connections || []) {
      connMap[c.provider] = { access_token: c.access_token, metadata: c.metadata }
    }

    // Create execution record
    const { data: execution } = await supabase
      .from('addon_executions')
      .insert({
        user_id: cfg.user_id,
        addon_slug: cfg.addon_slug,
        status: 'running',
        config_snapshot: cfg.config,
      })
      .select()
      .single()

    const startTime = Date.now()

    try {
      const result = await definition.execute({
        userId: cfg.user_id,
        locationId: (cfg as Record<string, unknown> & { profiles?: { crm_location_id?: string } }).profiles?.crm_location_id || '',
        config: cfg.config,
        connections: connMap,
        crmPit: process.env.CRM_PIT || '',
      })

      const durationMs = Date.now() - startTime

      await supabase.from('addon_executions').update({
        status: result.success ? 'success' : 'error',
        result: { summary: result.summary, outputs: result.outputs, items: result.items },
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      }).eq('id', execution?.id)

      await supabase.from('addon_configs').update({
        last_run_at: new Date().toISOString(),
        run_count: (cfg.run_count || 0) + 1,
        last_result: { summary: result.summary, items: result.items },
        last_error: result.success ? null : result.summary,
      }).eq('id', cfg.id)

      results.push({ addon: cfg.addon_slug, user: cfg.user_id, status: 'ok', summary: result.summary })
    } catch (err) {
      const durationMs = Date.now() - startTime
      const errorMsg = err instanceof Error ? err.message : 'Unknown'

      await supabase.from('addon_executions').update({
        status: 'error',
        error: errorMsg,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      }).eq('id', execution?.id)

      await supabase.from('addon_configs').update({
        last_error: errorMsg,
      }).eq('id', cfg.id)

      results.push({ addon: cfg.addon_slug, user: cfg.user_id, status: 'error', error: errorMsg })
    }
  }

  return NextResponse.json({ ran: results.length, results })
}
