/**
 * POST /api/workspace/claim
 *
 * On-demand CRM sub-location provisioning, gated to the authenticated
 * user. Replaces the auto-queue that used to fire from postSignupProvision
 * for non-family users.
 *
 * Idempotent: if profile already has crm_location_id, returns existing.
 * Family-matched users get the family location instead (no new sub-location).
 *
 * Mike's "claim your workspace" pattern — every signup gets a CRM contact
 * automatically, but the workspace itself only spins up when the user
 * explicitly asks for it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { provisionSubLocation } from '@/lib/provision'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(_req: NextRequest) {
  // Cookie-only session check (per CLAUDE.md rule 12 — no getUser)
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
  }

  const sb = admin()

  // Idempotent: profile already has a workspace
  const { data: profile } = await sb
    .from('profiles')
    .select('id, email, crm_location_id, crm_contact_id, full_name, company')
    .eq('id', user.id)
    .maybeSingle<{
      id: string
      email: string | null
      crm_location_id: string | null
      crm_contact_id: string | null
      full_name: string | null
      company: string | null
    }>()

  if (profile?.crm_location_id) {
    return NextResponse.json({
      ok: true,
      status: 'existing',
      crm_location_id: profile.crm_location_id,
    })
  }

  // Provision now. provisionSubLocation reads the user's profile internally,
  // mints the sub-location via agency PIT, and writes crm_location_id back.
  try {
    const result = await provisionSubLocation(user.id)
    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          status: 'failed',
          errors: result.errors,
        },
        { status: 500 },
      )
    }

    // Re-read to surface the freshly-written location_id
    const { data: refreshed } = await sb
      .from('profiles')
      .select('crm_location_id')
      .eq('id', user.id)
      .maybeSingle<{ crm_location_id: string | null }>()

    return NextResponse.json({
      ok: true,
      status: 'provisioned',
      crm_location_id: refreshed?.crm_location_id ?? null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { ok: false, status: 'error', error: msg.slice(0, 300) },
      { status: 500 },
    )
  }
}
