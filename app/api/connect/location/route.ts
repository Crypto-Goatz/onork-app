/**
 * POST /api/connect/location — connect one client account.
 *
 * This is the billable act. Pasting an account's PIT IS connecting it: the
 * credential and the entitlement are the same gesture, so there is no separate
 * "activate" step that could drift out of sync with what we can actually do.
 *
 * The PIT is verified against THIS location before it is stored. A token that
 * belongs to a different sub-account will fail here rather than silently
 * writing a contact into the wrong client's CRM — the worst outcome this
 * product has.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import { verifyLocationPit, type CrmLocation } from '@/lib/connect/pit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Price per additional account, in cents. Configuration, not a constant. */
const DEFAULT_PRICE_CENTS = 899

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const locationId = typeof body?.locationId === 'string' ? body.locationId.trim() : ''
  const pit = typeof body?.pit === 'string' ? body.pit.trim() : ''
  const wantFree = body?.isFree === true

  if (!locationId || !pit) {
    return NextResponse.json({ error: 'Account and token are both required.' }, { status: 400 })
  }

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage is not configured.' }, { status: 500 })

  const { data: agency } = await db
    .from('agency_connections')
    .select('company_id, locations')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!agency) {
    return NextResponse.json({ error: 'Connect your agency first.' }, { status: 400 })
  }

  // The account must be one of theirs. Without this, a valid PIT for an account
  // outside this agency would attach to their workspace.
  const locations = (agency.locations as CrmLocation[]) ?? []
  const match = locations.find((l) => l.id === locationId)
  if (!match) {
    return NextResponse.json(
      { error: 'That account is not in your CRM client list.' },
      { status: 400 },
    )
  }

  const check = await verifyLocationPit(pit, locationId)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  // Exactly one free account per agency is a DB constraint. Clear the old one
  // first so choosing a new free account is a move, not a conflict.
  if (wantFree) {
    await db
      .from('location_connections')
      .update({ is_free: false, billing_status: 'pending', updated_at: new Date().toISOString() })
      .eq('company_id', agency.company_id)
      .eq('is_free', true)
  }

  const { error } = await db.from('location_connections').upsert(
    {
      company_id: agency.company_id,
      location_id: locationId,
      location_name: match.name,
      location_pit: pit,
      is_free: wantFree,
      billing_status: wantFree ? 'active' : 'pending',
      verified_at: new Date().toISOString(),
      last_error: null,
      status: 'active',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,location_id' },
  )
  if (error) {
    console.error('[connect/location] upsert failed:', error.message)
    return NextResponse.json({ error: 'Could not save that account.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    locationId,
    name: match.name,
    isFree: wantFree,
    priceCents: wantFree ? 0 : DEFAULT_PRICE_CENTS,
  })
}

/** DELETE — disconnect an account. Stops work immediately; keeps no token. */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const locationId = req.nextUrl.searchParams.get('locationId') || ''
  if (!locationId) return NextResponse.json({ error: 'Which account?' }, { status: 400 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage is not configured.' }, { status: 500 })

  const { data: agency } = await db
    .from('agency_connections')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!agency) return NextResponse.json({ error: 'No agency connection.' }, { status: 400 })

  await db
    .from('location_connections')
    .update({ status: 'disconnected', is_free: false, updated_at: new Date().toISOString() })
    .eq('company_id', agency.company_id)
    .eq('location_id', locationId)

  return NextResponse.json({ ok: true })
}
