/**
 * GET /api/cron/provision-repair
 *
 * Guarantees every real signup ends up with a CRM location. The signup-time
 * after() provision can die on the serverless lambda; this worker is the safety
 * net — it finds profiles with no crm_location_id and (re)provisions them,
 * idempotently, until they succeed.
 *
 *  - Family-matched emails are LINKED to their existing location (no new one).
 *  - Everyone else gets a fresh sub-location via provisionSubLocation().
 *  - Obvious test/e2e emails are skipped so we don't create junk sub-accounts.
 *  - Batched + time-budgeted to stay under maxDuration; a 3-min backoff stops
 *    us from hammering an account that's mid-provision.
 *
 * Protected by CRON_SECRET. Runs every 2 minutes (vercel.json).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { provisionSubLocation } from '@/lib/provision'
import { findFamilyMatch } from '@/lib/family-locations'
import { ensureLocationInstall } from '@/lib/crm/location-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function admin() {
  return createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}` && req.nextUrl.searchParams.get('secret') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const db = admin()
  const backoff = new Date(Date.now() - 3 * 60_000).toISOString()

  // Candidates = REAL signups that failed to get a location. A genuine signup
  // runs post-signup which stamps provisioning_started_at; test scripts that
  // create users via the admin API bypass that, so provisioning_started_at IS
  // NULL for them — which is exactly how we avoid provisioning junk sub-accounts.
  // Plus an email denylist backstop, plus a 3-min backoff so we don't re-hit one
  // that's mid-provision.
  const { data: candidates, error } = await db
    .from('profiles')
    .select('id, email, provisioning_started_at')
    .is('crm_location_id', null)
    .not('provisioning_started_at', 'is', null) // proves the real signup pipeline ran
    .lt('provisioning_started_at', backoff)
    .not('email', 'ilike', '%e2e%')
    .not('email', 'ilike', '%@example.%')
    .not('email', 'ilike', '%+test%')
    .not('email', 'ilike', '%@test.%')
    .not('email', 'ilike', '%@evil.%')
    .order('provisioning_started_at', { ascending: true })
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!candidates || candidates.length === 0) return NextResponse.json({ ok: true, repaired: 0 })

  const startedAt = Date.now()
  const results: Array<{ id: string; ok: boolean; via: string; detail?: string }> = []

  for (const p of candidates) {
    if (Date.now() - startedAt > 42_000) break // leave buffer under maxDuration
    await db.from('profiles').update({ provisioning_started_at: new Date().toISOString() }).eq('id', p.id)

    // Family-matched → link to existing location instead of creating a new one.
    const family = findFamilyMatch(p.email || '')
    if (family?.location.locationId) {
      const loc = family.location.locationId
      await db.from('profiles').update({ crm_location_id: loc, provisioned_at: new Date().toISOString(), provisioning_error: null }).eq('id', p.id)
      ensureLocationInstall(loc).catch(() => {})
      results.push({ id: p.id, ok: true, via: 'family-link', detail: loc })
      continue
    }

    try {
      const r = await provisionSubLocation(p.id)
      if (r.success && r.locationId) {
        await db.from('profiles').update({ provisioning_error: null }).eq('id', p.id)
        results.push({ id: p.id, ok: true, via: 'provisioned', detail: r.locationId })
      } else {
        const e = r.errors.join('; ').slice(0, 500) || 'unknown failure'
        await db.from('profiles').update({ provisioning_error: e }).eq('id', p.id)
        results.push({ id: p.id, ok: false, via: 'provision', detail: e })
      }
    } catch (err) {
      const e = (err instanceof Error ? err.message : String(err)).slice(0, 500)
      await db.from('profiles').update({ provisioning_error: e }).eq('id', p.id)
      results.push({ id: p.id, ok: false, via: 'throw', detail: e })
    }
  }

  return NextResponse.json({ ok: true, repaired: results.filter((r) => r.ok).length, attempted: results.length, results })
}
