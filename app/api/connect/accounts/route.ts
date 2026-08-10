/**
 * GET /api/connect/accounts — the client list, merged with connection state.
 *
 * One reader for the whole picker. The CRM list and the connection rows are
 * joined HERE rather than in the browser, because the two drifting apart is the
 * failure the UI cannot detect: an account that looks connected but has no
 * usable token renders identically to a working one.
 *
 * Tokens are never included in the response — not even for the agency that owns
 * them. The UI works entirely from status fields.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import type { CrmLocation, ConnectedAccount } from '@/lib/connect/pit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const db = createServiceClient()
  if (!db) return NextResponse.json({ error: 'Storage is not configured.' }, { status: 500 })

  const { data: agency } = await db
    .from('agency_connections')
    .select('company_id, company_name, locations, locations_synced_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!agency) {
    return NextResponse.json({ connected: false, accounts: [], freeAccountId: null })
  }

  const { data: rows } = await db
    .from('location_connections')
    .select('location_id, location_name, is_free, billing_status, status, verified_at, last_error')
    .eq('company_id', agency.company_id)
    .eq('status', 'active')

  const connections = new Map<string, ConnectedAccount>(
    ((rows as ConnectedAccount[]) ?? []).map((r) => [r.location_id, r]),
  )

  const locations = (agency.locations as CrmLocation[]) ?? []
  const accounts = locations.map((l) => {
    const c = connections.get(l.id)
    return {
      locationId: l.id,
      name: l.name,
      connected: Boolean(c),
      isFree: c?.is_free ?? false,
      billingStatus: c?.billing_status ?? null,
      verifiedAt: c?.verified_at ?? null,
      // An account with a stored token that later stopped working must be
      // visibly broken, never quietly absent.
      error: c?.last_error ?? null,
    }
  })

  const freeAccountId = accounts.find((a) => a.isFree)?.locationId ?? null

  return NextResponse.json({
    connected: true,
    companyId: agency.company_id,
    syncedAt: agency.locations_synced_at,
    freeAccountId,
    connectedCount: accounts.filter((a) => a.connected).length,
    accounts,
  })
}
