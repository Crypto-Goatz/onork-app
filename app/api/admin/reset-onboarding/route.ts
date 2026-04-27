/**
 * POST /api/admin/reset-onboarding
 *
 * Wipes a user's onboarding/provision state so they can re-run the entire
 * signup flow as if they were brand new. Optionally creates a fresh
 * CRM sub-account with a custom name.
 *
 * Auth: caller must be an admin (is_admin=true in profiles).
 *
 * Body:
 * {
 *   "target_email": "mike.mento@gmail.com",
 *   "subaccount_name": "Full-Test-1",      // optional, used for the new CRM location
 *   "delete_old_subaccount": false,        // optional, drops the old CRM location
 *   "wipe_apps": true                      // optional, removes user_installed_apps + custom_triggers
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function requireAdmin(req: NextRequest) {
  // Allow CRON_SECRET bypass for ops use
  const secret = process.env.CRON_SECRET || ''
  const auth = req.headers.get('authorization') || ''
  if (secret && auth === `Bearer ${secret}`) return { ok: true, asService: true }

  try {
    const server = await createServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Not authenticated' }
    const admin = getAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!profile?.is_admin) return { ok: false, error: 'Admin only' }
    return { ok: true, asService: false }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

async function crmCreateLocation(name: string, email: string): Promise<{ ok: boolean; location_id?: string; error?: string }> {
  const agencyPit = process.env.CRM_AGENCY_PIT_NEW || process.env.CRM_AGENCY_PIT
  const companyId = process.env.CRM_COMPANY_ID || 'bknfhTkdDLapbwfZqQNi'
  if (!agencyPit) return { ok: false, error: 'CRM_AGENCY_PIT not set' }

  try {
    const res = await fetch(`${CRM_API}/locations/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agencyPit}`,
        'Content-Type': 'application/json',
        Version: CRM_VERSION,
      },
      body: JSON.stringify({
        companyId,
        name,
        email,
        phone: '',
        address: '',
        city: '',
        state: '',
        country: 'US',
        postalCode: '',
        website: '',
        timezone: 'America/New_York',
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { ok: false, error: data.message || JSON.stringify(data) }
    }
    const id = data.id || data.location?.id || data._id
    if (!id) return { ok: false, error: 'no location id returned' }
    return { ok: true, location_id: id }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

async function crmDeleteLocation(locationId: string): Promise<{ ok: boolean; error?: string }> {
  const agencyPit = process.env.CRM_AGENCY_PIT_NEW || process.env.CRM_AGENCY_PIT
  if (!agencyPit) return { ok: false, error: 'CRM_AGENCY_PIT not set' }

  try {
    const res = await fetch(`${CRM_API}/locations/${locationId}?deleteTwilioAccount=true`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${agencyPit}`,
        Version: CRM_VERSION,
      },
    })
    if (!res.ok && res.status !== 404) {
      const text = await res.text()
      return { ok: false, error: `${res.status}: ${text}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const targetEmail = body.target_email as string | undefined
  const subaccountName = (body.subaccount_name as string | undefined) || ''
  const deleteOldSubaccount = !!body.delete_old_subaccount
  const wipeApps = body.wipe_apps !== false // default true

  if (!targetEmail) return NextResponse.json({ error: 'target_email required' }, { status: 400 })

  const admin = getAdmin()
  const log: Record<string, unknown> = { target_email: targetEmail }

  // 1. Look up user
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('id, email, full_name, crm_location_id, crm_contact_id, stripe_customer_id, plan, tier_level, onboarding_complete, provisioned_at')
    .eq('email', targetEmail)
    .single()

  if (profErr || !profile) {
    return NextResponse.json({ error: 'User not found', detail: profErr?.message }, { status: 404 })
  }

  log.user_id = profile.id
  log.previous_state = {
    plan: profile.plan,
    crm_location_id: profile.crm_location_id,
    crm_contact_id: profile.crm_contact_id,
    onboarding_complete: profile.onboarding_complete,
  }

  // 2. Optionally delete the old CRM sub-account
  if (deleteOldSubaccount && profile.crm_location_id) {
    const r = await crmDeleteLocation(profile.crm_location_id)
    log.old_subaccount_deletion = r
  }

  // 3. Wipe installed marketplace apps + their triggers
  if (wipeApps) {
    const { error: e1 } = await admin
      .from('user_installed_apps')
      .delete()
      .eq('user_id', profile.id)
    log.installed_apps_wiped = !e1
    if (e1) log.installed_apps_error = e1.message

    const { error: e2 } = await admin
      .from('custom_triggers')
      .delete()
      .eq('user_id', profile.id)
    log.custom_triggers_wiped = !e2
    if (e2) log.custom_triggers_error = e2.message
  }

  // 4. Wipe user_tiers + kb seeds so onboarding rebuilds them
  await admin.from('user_tiers').delete().eq('user_id', profile.id)
  await admin.from('kb_content_queue').delete().eq('user_id', profile.id)
  log.tiers_wiped = true
  log.kb_wiped = true

  // 5. Reset profile fields so the dashboard layout re-provisions on next login
  await admin
    .from('profiles')
    .update({
      crm_location_id: null,
      crm_contact_id: null,
      onboarding_complete: false,
      onboarding_completed: false,
      onboarding_step: 0,
      tier_level: 0,
      plan: 'free',
      welcome_email_sent: false,
      k_layer_initialized: false,
    })
    .eq('id', profile.id)
  log.profile_reset = true

  // 6. If a new sub-account name was requested, create it now
  if (subaccountName) {
    const r = await crmCreateLocation(subaccountName, profile.email!)
    if (r.ok && r.location_id) {
      await admin
        .from('profiles')
        .update({ crm_location_id: r.location_id })
        .eq('id', profile.id)
      log.new_subaccount = { name: subaccountName, crm_location_id: r.location_id }
    } else {
      log.new_subaccount_error = r.error
    }
  }

  return NextResponse.json({
    ok: true,
    ready_to_onboard: true,
    next_step: 'User signs in at https://0ncore.com/login — onboarding wizard will fire.',
    ...log,
  })
}
