/**
 * POST /api/connect/agency — step 1 of onboarding.
 *
 * The agency hands over their agency PIT and company ID. We prove the token
 * works by listing their sub-accounts, then store both. Success here means
 * "we can see your client list" and nothing more — connecting an individual
 * account is a separate, per-account act (POST /api/connect/location).
 *
 * The location list is cached on the row so the picker renders without a CRM
 * round trip, but it is advisory: appearing in this list means we can SEE an
 * account, never that we may act in it.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import { verifyAgencyPit } from '@/lib/connect/pit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const agencyPit = typeof body?.agencyPit === 'string' ? body.agencyPit.trim() : ''
  const companyId = typeof body?.companyId === 'string' ? body.companyId.trim() : ''

  if (!agencyPit || !companyId) {
    return NextResponse.json(
      { error: 'Both the agency token and the company ID are required.' },
      { status: 400 },
    )
  }

  // Prove it before we store it.
  const check = await verifyAgencyPit(agencyPit, companyId)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage is not configured.' }, { status: 500 })

  const { error } = await db.from('agency_connections').upsert(
    {
      user_id: user.id,
      company_id: companyId,
      agency_pit: agencyPit,
      locations: check.locations,
      locations_synced_at: new Date().toISOString(),
      status: 'active',
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id' },
  )
  if (error) {
    console.error('[connect/agency] upsert failed:', error.message)
    return NextResponse.json({ error: 'Could not save the connection.' }, { status: 500 })
  }

  // Never echo the token back.
  return NextResponse.json({
    ok: true,
    companyId,
    accountCount: check.locations.length,
    locations: check.locations,
  })
}
