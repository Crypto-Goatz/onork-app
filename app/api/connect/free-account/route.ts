/**
 * POST /api/connect/free-account — choose the one included account. Once.
 *
 * Separate from connecting it. Choosing is a decision the agency makes from a
 * dropdown; connecting needs them to go and generate a key in that sub-account.
 * Splitting them means the choice is recorded even if they close the tab before
 * fetching the key, and we can tell them exactly what is still missing instead
 * of starting over.
 *
 * THE CHOICE IS FINAL. The free slot is worth $5/month; if it could be moved it
 * would be moved to whichever client is billable this month and the included
 * account would stop meaning anything. Changing it is a support action.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import type { CrmLocation } from '@/lib/connect/pit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const locationId = typeof body?.locationId === 'string' ? body.locationId.trim() : ''
  if (!locationId) return NextResponse.json({ error: 'Choose an account first.' }, { status: 400 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage is not configured.' }, { status: 500 })

  const { data: agency } = await db
    .from('agency_connections')
    .select('company_id, locations, free_location_id, free_locked_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!agency) {
    return NextResponse.json({ error: 'Add your agency token first.' }, { status: 400 })
  }

  // Already chosen — say so plainly and name the way to change it.
  if (agency.free_locked_at) {
    const locked = ((agency.locations as CrmLocation[]) ?? []).find(
      (l) => l.id === agency.free_location_id,
    )
    return NextResponse.json(
      {
        error: `Your free account is already set to ${locked?.name ?? agency.free_location_id}. Email support to change it.`,
        locked: true,
        freeLocationId: agency.free_location_id,
      },
      { status: 409 },
    )
  }

  // Must be one of theirs. Without this, a valid-looking id outside the agency
  // would attach a free slot to an account they do not own.
  const match = ((agency.locations as CrmLocation[]) ?? []).find((l) => l.id === locationId)
  if (!match) {
    return NextResponse.json({ error: 'That account is not in your client list.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { error } = await db
    .from('agency_connections')
    .update({
      free_location_id: locationId,
      free_locked_at: now,
      onboarding_step: 'need_pit',
      updated_at: now,
    })
    .eq('company_id', agency.company_id)

  if (error) {
    console.error('[connect/free-account] update failed:', error.message)
    return NextResponse.json({ error: 'Could not save your choice.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    freeLocationId: locationId,
    freeLocationName: match.name,
    next: 'need_pit',
    // Handed to the UI so the instructions can name the exact account.
    instructions: {
      locationId,
      locationName: match.name,
    },
  })
}
