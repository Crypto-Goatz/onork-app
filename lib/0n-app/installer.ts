/**
 * .0n App Installer
 *
 * Installs a marketplace app into a user's account: creates the
 * user_installed_apps row, registers the trigger (cron / webhook /
 * crm_event), and bumps install counts.
 */

import { createClient } from '@supabase/supabase-js'
import { OnAppManifest, getDefaultConfig } from './parser'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface InstallParams {
  userId: string
  appId: string
  orderId?: string
  configOverrides?: Record<string, unknown>
}

export interface InstallResult {
  ok: boolean
  installation_id?: string
  trigger_registered?: boolean
  error?: string
}

export async function installApp(params: InstallParams): Promise<InstallResult> {
  const supabase = getSupabase()
  const { userId, appId, orderId, configOverrides } = params

  const { data: app, error: appErr } = await supabase
    .from('marketplace_apps')
    .select('*')
    .eq('id', appId)
    .single()

  if (appErr || !app) {
    return { ok: false, error: 'App not found' }
  }

  const manifest = app.app_config as OnAppManifest
  const finalConfig = { ...getDefaultConfig(manifest), ...(configOverrides || {}) }

  const { data: install, error: installErr } = await supabase
    .from('user_installed_apps')
    .upsert({
      user_id: userId,
      app_id: appId,
      order_id: orderId || null,
      status: 'active',
      config_overrides: finalConfig,
    }, { onConflict: 'user_id,app_id' })
    .select()
    .single()

  if (installErr || !install) {
    return { ok: false, error: installErr?.message || 'Install failed' }
  }

  await supabase.rpc('increment_app_installs', { app_id_param: appId }).then(() => {}, () => {})

  let triggerRegistered = false
  try {
    triggerRegistered = await registerTrigger(install.id, userId, manifest)
  } catch (err) {
    console.error('[0n-app/installer] Trigger registration failed:', (err as Error).message)
  }

  return { ok: true, installation_id: install.id, trigger_registered: triggerRegistered }
}

async function registerTrigger(
  installationId: string,
  userId: string,
  app: OnAppManifest,
): Promise<boolean> {
  const supabase = getSupabase()
  const trigger = app.trigger

  if (trigger.type === 'on_install') {
    return true
  }

  if (trigger.type === 'scheduled') {
    await supabase.from('custom_triggers').upsert({
      user_id: userId,
      name: `${app.name} (scheduled)`,
      trigger_type: 'cron',
      config: {
        cron: trigger.cron,
        installation_id: installationId,
        app_slug: app.slug,
      },
      enabled: true,
    }, { onConflict: 'user_id,name' })
    return true
  }

  if (trigger.type === 'webhook') {
    await supabase.from('custom_triggers').upsert({
      user_id: userId,
      name: `${app.name} (webhook)`,
      trigger_type: 'webhook',
      config: {
        installation_id: installationId,
        app_slug: app.slug,
        event: trigger.event,
      },
      enabled: true,
    }, { onConflict: 'user_id,name' })
    return true
  }

  if (trigger.type === 'crm_event') {
    await supabase.from('custom_triggers').upsert({
      user_id: userId,
      name: `${app.name} (crm)`,
      trigger_type: 'crm_event',
      config: {
        event: trigger.event,
        installation_id: installationId,
        app_slug: app.slug,
        ...(trigger.config || {}),
      },
      enabled: true,
    }, { onConflict: 'user_id,name' })
    return true
  }

  return false
}

export async function uninstallApp(userId: string, appId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()

  const { data: install } = await supabase
    .from('user_installed_apps')
    .select('id, app_id')
    .eq('user_id', userId)
    .eq('app_id', appId)
    .single()

  if (!install) return { ok: false, error: 'Not installed' }

  await supabase
    .from('user_installed_apps')
    .delete()
    .eq('id', install.id)

  await supabase
    .from('custom_triggers')
    .delete()
    .eq('user_id', userId)
    .filter('config->>installation_id', 'eq', install.id)

  await supabase
    .from('marketplace_apps')
    .update({ active_installs: 0 })
    .eq('id', appId)
    .gt('active_installs', 0)

  return { ok: true }
}

export async function setInstallStatus(
  userId: string,
  appId: string,
  status: 'active' | 'paused',
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('user_installed_apps')
    .update({ status })
    .eq('user_id', userId)
    .eq('app_id', appId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
