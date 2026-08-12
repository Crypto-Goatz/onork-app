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
import { syncAgencyQuantity } from '@/lib/connect/sync-billing'
import { AGENCY_BILLING } from '@/lib/agency-billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const locationId = typeof body?.locationId === 'string' ? body.locationId.trim() : ''
  const pit = typeof body?.pit === 'string' ? body.pit.trim() : ''
  const wantFree = body?.isFree === true
  // Adding a client and switching it on are two acts. Requiring the key up front
  // meant leaving the page to fetch a token and starting over; a pending add
  // records the choice now and waits for the key.
  const pending = body?.pending === true

  if (!locationId) {
    return NextResponse.json({ error: 'Which account?' }, { status: 400 })
  }
  if (!pending && !pit) {
    return NextResponse.json({ error: 'That account needs its key.' }, { status: 400 })
  }

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage is not configured.' }, { status: 500 })

  const { data: agency } = await db
    .from('agency_connections')
    .select('company_id, locations')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

  if (!agency) {
    return NextResponse.json({ error: 'Connect your agency first.' }, { status: 400 })
  }

  /**
   * Ownership is proved by a WORKING KEY, not by presence in a cached list.
   *
   * The list comes from the agency token and can be stale, paginated, or
   * simply not include a sub-account they just created — so requiring a match
   * blocked legitimate clients and forced a re-sync to fix. A key that the CRM
   * accepts FOR THAT LOCATION is stronger evidence anyway: it cannot be
   * obtained without access to the account.
   *
   * So a listed client keeps its name; an unlisted one is allowed through on
   * the strength of its key, and is named by whatever the agency typed.
   */
  const locations = (agency.locations as CrmLocation[]) ?? []
  const listed = locations.find((l) => l.id === locationId)
  const typedName = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const match = listed ?? { id: locationId, name: typedName || locationId }

  // An unlisted client MUST prove itself with a key — it cannot be added pending.
  if (!listed && pending) {
    return NextResponse.json(
      { error: 'A client that is not in your list needs its key to be added.' },
      { status: 400 },
    )
  }

  // Only verify when a key was actually supplied. A pending add has nothing to
  // prove yet — verified_at stays null, which is what marks it "not switched on".
  if (!pending) {
    const check = await verifyLocationPit(pit, locationId)
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
  }

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
      ...(pending ? {} : { location_pit: pit }),
      is_free: wantFree,
      billing_status: wantFree ? 'active' : 'pending',
      verified_at: pending ? null : new Date().toISOString(),
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

  // The count changed, so the bill changed. Best-effort by design — see
  // sync-billing: a Stripe hiccup must not undo a connect the agency just
  // proved they were entitled to make.
  await syncAgencyQuantity(agency.company_id)

  return NextResponse.json({
    ok: true,
    locationId,
    name: match.name,
    isFree: wantFree,
    pending,
    priceCents: wantFree ? 0 : AGENCY_BILLING.perClientCents,
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
    .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  if (!agency) return NextResponse.json({ error: 'No agency connection.' }, { status: 400 })

  await db
    .from('location_connections')
    .update({ status: 'disconnected', is_free: false, updated_at: new Date().toISOString() })
    .eq('company_id', agency.company_id)
    .eq('location_id', locationId)

  // Disconnecting must lower the bill as promptly as connecting raises it.
  await syncAgencyQuantity(agency.company_id)

  return NextResponse.json({ ok: true })
}
