/**
 * GET /api/profile/provision-status
 *
 * Polling endpoint for the /welcome page to show the user real-time progress
 * on background CRM sub-location provisioning.
 *
 * State derivation:
 *   - crm_location_id set                                     → 'completed'
 *   - provisioning_error set + crm_location_id null           → 'failed'
 *   - provisioning_started_at set + no error + no location    → 'in_progress'
 *   - provisioning_started_at null + no location              → 'pending'
 *
 * Read-only. Does NOT trigger provisioning — that's done by /api/auth/signup
 * (auto, at signup) or /api/workspace/claim (manual retry).
 *
 * Cookie-only session check (CLAUDE.md rule 12 — never getUser outside
 * middleware). Trusts the cookie that middleware has already validated.
 */

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

type ProvisionState = 'pending' | 'in_progress' | 'completed' | 'failed'

interface StatusResponse {
  state: ProvisionState
  crm_location_id: string | null
  crm_contact_id: string | null
  provisioning_started_at: string | null
  provisioning_error: string | null
  elapsed_seconds: number | null
}

export async function GET() {
  // Cookie-only session check — never getUser
  const supabase = await createServerClient()

  let session
  try {
    const result = await supabase.auth.getSession()
    session = result.data.session
  } catch (err) {
    console.error('[provision-status] getSession failed:', err)
    return NextResponse.json({ error: 'session_unavailable' }, { status: 500 })
  }

  const user = session?.user
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const sb = admin()

  let profile: {
    crm_location_id: string | null
    crm_contact_id: string | null
    provisioning_started_at: string | null
    provisioning_error: string | null
  } | null = null

  try {
    const { data, error } = await sb
      .from('profiles')
      .select(
        'crm_location_id, crm_contact_id, provisioning_started_at, provisioning_error',
      )
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[provision-status] profile fetch error:', error)
      return NextResponse.json({ error: 'profile_fetch_failed' }, { status: 500 })
    }
    profile = data
  } catch (err) {
    console.error('[provision-status] profile fetch threw:', err)
    return NextResponse.json({ error: 'profile_fetch_failed' }, { status: 500 })
  }

  if (!profile) {
    // Profile row hasn't been created yet — treat as pending.
    const body: StatusResponse = {
      state: 'pending',
      crm_location_id: null,
      crm_contact_id: null,
      provisioning_started_at: null,
      provisioning_error: null,
      elapsed_seconds: null,
    }
    return NextResponse.json(body)
  }

  const startedAt = profile.provisioning_started_at
  const elapsedSeconds = startedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    : null

  let state: ProvisionState
  if (profile.crm_location_id) {
    state = 'completed'
  } else if (profile.provisioning_error) {
    state = 'failed'
  } else if (startedAt) {
    state = 'in_progress'
  } else {
    state = 'pending'
  }

  const body: StatusResponse = {
    state,
    crm_location_id: profile.crm_location_id,
    crm_contact_id: profile.crm_contact_id,
    provisioning_started_at: startedAt,
    provisioning_error: profile.provisioning_error,
    elapsed_seconds: elapsedSeconds,
  }

  return NextResponse.json(body, {
    headers: { 'cache-control': 'no-store' },
  })
}
