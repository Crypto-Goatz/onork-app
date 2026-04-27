/**
 * Marketplace App Webhook Receiver
 *
 * External services (Chrome extension, Zapier, etc.) POST to:
 *   /api/webhooks/marketplace/{installation_id}
 *
 * The body becomes the trigger payload for the installed .0n app.
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ installation_id: string }> }) {
  const { installation_id } = await params

  const body = await req.json().catch(() => ({}))

  const supabase = getSupabase()

  const { data: install } = await supabase
    .from('user_installed_apps')
    .select('id, user_id, app_id, status, config_overrides, marketplace_apps(slug, app_config)')
    .eq('id', installation_id)
    .single()

  if (!install) {
    return NextResponse.json({ error: 'Installation not found' }, { status: 404 })
  }

  if (install.status !== 'active') {
    return NextResponse.json({ error: `Install is ${install.status}` }, { status: 403 })
  }

  const rawApp = install.marketplace_apps as unknown
  const app = (Array.isArray(rawApp) ? rawApp[0] : rawApp) as { slug: string; app_config: OnAppManifest } | null
  if (!app) {
    return NextResponse.json({ error: 'App not found' }, { status: 404 })
  }

  const trigger = app.app_config?.trigger
  if (trigger?.type !== 'webhook') {
    return NextResponse.json({ error: 'App trigger type is not webhook' }, { status: 400 })
  }

  const ctx: ExecutionContext = {
    userId: install.user_id,
    installationId: install.id,
    appSlug: app.slug,
    trigger: {
      source: 'webhook',
      event: trigger.event,
      received_at: new Date().toISOString(),
      ...body,
    },
    outputs: {},
    variables: {},
    config: (install.config_overrides as Record<string, unknown>) || {},
  }

  const exec = await executeApp(app.app_config, ctx)

  return NextResponse.json({
    received: true,
    installation_id,
    app_slug: app.slug,
    status: exec.ok ? 'success' : 'failed',
    steps_run: exec.steps.length,
    duration_ms: exec.total_duration_ms,
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ installation_id: string }> }) {
  const { installation_id } = await params
  return NextResponse.json({
    webhook_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/webhooks/marketplace/${installation_id}`,
    method: 'POST',
    accepts: 'application/json',
    note: 'POST any JSON body to fire the trigger. Body is available as {{trigger.*}} in app steps.',
  })
}
