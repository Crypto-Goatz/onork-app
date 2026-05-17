/**
 * POST /api/workspace/claim
 *
 * On-demand workspace provisioning, authenticated. Wraps the canonical
 * `provisionSubLocation` from @/lib/provision which already does:
 *   1. Create CRM sub-location (CRITICAL)
 *   2. Mint location-scoped marketplace token (best-effort)
 *   3. Deploy master snapshot — pipeline + fields + tags + workflows
 *      (best-effort; partial deploys surface in `errors[]`)
 *   4. Save crm_location_id to profile (immediate, after step 1)
 *   5. Write dashboard_notifications row
 *
 * Idempotent: if profile.crm_location_id is already set, returns
 * `existing` and the UI just reloads into the workspace.
 *
 * UX contract (Mike's "save and proceed" pattern):
 *   - If step 1 succeeds, the user proceeds even if snapshot is partial.
 *     The workspace is real; pipelines/workflows can be retried later
 *     by re-clicking the claim button (idempotent on location_id).
 *   - Critical failure (step 1) returns ok:false so the banner shows
 *     a retry button.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { provisionSubLocation } from '@/lib/provision'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(_req: NextRequest) {
  // Cookie-only session check (CLAUDE.md rule 12 — no getUser)
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
  }

  // Stamp provisioning_started_at + clear any previous error BEFORE firing —
  // covers the manual retry path where a row may not yet have this set, and
  // ensures the polling UI sees a fresh in_progress state. Service-role
  // client because RLS on profiles is locked down.
  const sb = admin()
  try {
    await sb
      .from('profiles')
      .update({
        provisioning_started_at: new Date().toISOString(),
        provisioning_error: null,
      })
      .eq('id', user.id)
  } catch (err) {
    console.error('[workspace/claim] failed to stamp provisioning_started_at:', err)
    // Continue — non-fatal. Provisioning can still proceed.
  }

  const result = await provisionSubLocation(user.id)

  if (!result.success) {
    const errMsg = result.errors.join('; ').slice(0, 1000) || 'unknown failure'
    try {
      await sb
        .from('profiles')
        .update({ provisioning_error: errMsg })
        .eq('id', user.id)
    } catch (err) {
      console.error('[workspace/claim] failed to write provisioning_error:', err)
    }
    return NextResponse.json(
      {
        ok: false,
        status: 'failed',
        errors: result.errors,
      },
      { status: 500 },
    )
  }

  // Success — leave provisioning_error null (the update above already cleared it)
  return NextResponse.json({
    ok: true,
    status: result.locationName === 'existing' ? 'existing' : 'created',
    crm_location_id: result.locationId,
    workspace_name: result.locationName,
    snapshot_deployed: result.snapshotDeployed,
    // Surface non-fatal errors only in dev for debugging
    ...(process.env.VERCEL_ENV !== 'production' && result.errors.length > 0
      ? { warnings: result.errors }
      : {}),
  })
}
