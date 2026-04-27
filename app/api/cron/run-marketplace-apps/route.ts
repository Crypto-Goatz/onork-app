/**
 * Marketplace Cron Tick — every 5 minutes
 *
 * Scans active custom_triggers of type='cron', evaluates the cron expression
 * against the current minute, and executes matching marketplace apps.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { executeApp, ExecutionContext } from '@/lib/0n-app/executor'
import { OnAppManifest } from '@/lib/0n-app/parser'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface CronFields {
  minute: number
  hour: number
  dayOfMonth: number
  month: number
  dayOfWeek: number
}

function matchesField(field: string, value: number): boolean {
  if (field === '*') return true
  if (field.includes('/')) {
    const [base, stepStr] = field.split('/')
    const step = parseInt(stepStr, 10)
    if (base === '*') return value % step === 0
    const start = parseInt(base, 10)
    return (value - start) % step === 0 && value >= start
  }
  if (field.includes(',')) {
    return field.split(',').some(part => matchesField(part, value))
  }
  if (field.includes('-')) {
    const [a, b] = field.split('-').map(n => parseInt(n, 10))
    return value >= a && value <= b
  }
  return parseInt(field, 10) === value
}

function evaluateCron(cron: string, fields: CronFields): boolean {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return false
  const [m, h, dom, mon, dow] = parts
  return (
    matchesField(m, fields.minute) &&
    matchesField(h, fields.hour) &&
    matchesField(dom, fields.dayOfMonth) &&
    matchesField(mon, fields.month) &&
    matchesField(dow, fields.dayOfWeek)
  )
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET || ''
  const isVercelCron = authHeader === `Bearer ${cronSecret}` || req.headers.get('x-vercel-cron') === '1'

  if (!isVercelCron && cronSecret && !req.url.includes('?manual=true')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const now = new Date()
  const fields: CronFields = {
    minute: now.getUTCMinutes(),
    hour: now.getUTCHours(),
    dayOfMonth: now.getUTCDate(),
    month: now.getUTCMonth() + 1,
    dayOfWeek: now.getUTCDay(),
  }

  const { data: triggers, error } = await supabase
    .from('custom_triggers')
    .select('id, user_id, name, config')
    .eq('trigger_type', 'cron')
    .eq('enabled', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { trigger_id: string; app_slug: string; matched: boolean; status?: string; error?: string }[] = []

  for (const trigger of triggers || []) {
    const cfg = (trigger.config as Record<string, unknown>) || {}
    const cron = cfg.cron as string | undefined
    const installationId = cfg.installation_id as string | undefined
    const appSlug = (cfg.app_slug as string) || 'unknown'

    if (!cron || !installationId) {
      results.push({ trigger_id: trigger.id, app_slug: appSlug, matched: false, error: 'missing cron or installation_id' })
      continue
    }

    const matched = evaluateCron(cron, fields)
    if (!matched) {
      results.push({ trigger_id: trigger.id, app_slug: appSlug, matched: false })
      continue
    }

    try {
      const { data: install } = await supabase
        .from('user_installed_apps')
        .select('id, app_id, status, config_overrides, marketplace_apps(slug, app_config)')
        .eq('id', installationId)
        .single()

      if (!install) {
        results.push({ trigger_id: trigger.id, app_slug: appSlug, matched, error: 'installation not found' })
        continue
      }

      if (install.status !== 'active') {
        results.push({ trigger_id: trigger.id, app_slug: appSlug, matched, error: `paused (${install.status})` })
        continue
      }

      const app = install.marketplace_apps as { slug: string; app_config: OnAppManifest } | null
      if (!app) {
        results.push({ trigger_id: trigger.id, app_slug: appSlug, matched, error: 'app not found' })
        continue
      }

      const ctx: ExecutionContext = {
        userId: trigger.user_id,
        installationId: install.id,
        appSlug: app.slug,
        trigger: { source: 'cron', cron, fired_at: now.toISOString() },
        outputs: {},
        variables: {},
        config: (install.config_overrides as Record<string, unknown>) || {},
      }

      const exec = await executeApp(app.app_config, ctx)
      results.push({
        trigger_id: trigger.id,
        app_slug: app.slug,
        matched: true,
        status: exec.ok ? 'success' : 'failed',
      })
    } catch (err) {
      results.push({
        trigger_id: trigger.id,
        app_slug: appSlug,
        matched: true,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const fired = results.filter(r => r.matched).length

  return NextResponse.json({
    tick_at: now.toISOString(),
    cron_fields: fields,
    triggers_scanned: triggers?.length || 0,
    triggers_fired: fired,
    results,
  })
}
