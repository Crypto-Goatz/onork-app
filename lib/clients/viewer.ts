/**
 * Who is looking, which agency are they, and may they see THIS client?
 *
 * ONE GATE FOR EVERY UPSELL SURFACE. The client index, the management page, the
 * wallet routes and the upgrade route all resolve through here, so "is this my
 * client" has exactly one answer. A storefront that sells upgrades into a
 * customer account is the highest-consequence surface in the app: the failure
 * mode of getting this wrong is agency A crediting, charging or upgrading
 * agency B's client.
 *
 * MEMBERSHIP IS PROVEN FROM THE AGENCY'S OWN ROSTER, NOT FROM THE URL. The
 * locationId in the path is attacker-controlled. It is only ever used to look
 * up a row that is already filtered by the viewer's company_id — never to fetch
 * first and compare after.
 *
 * BOTH REGISTERS COUNT, AND THEY MEAN DIFFERENT THINGS.
 *   · agency_connections.locations — the CRM roster (87 sub-accounts for
 *     RocketOpp). These are accounts the agency owns but that 0nCORE may hold
 *     no key for. They can be SOLD to, listed and priced.
 *   · location_connections        — the accounts we hold a working credential
 *     for (6 of the 87). Only these can be ACTED in.
 * Collapsing the two is how a dashboard offers a one-click action against an
 * account it cannot reach. Both are returned, flagged, and the UI says which.
 *
 * TWO SIGN-IN LANES, BOTH ACCEPTED, IN THAT ORDER.
 *   1. the app JWT — what the CRM Custom Page iframe carries (Authorization:
 *      Bearer). This is how the agency dashboard on app.0ncore.com is used.
 *   2. the Supabase session — the standalone login on www.
 * Supporting only one of them is a real failure mode in this codebase, not a
 * hypothetical: /clients is REWRITTEN to /crm/clients on the app host, so a
 * surface built against the Supabase session alone works perfectly in the
 * codebase and is unreachable on the host the customer actually uses.
 *
 * getSession, NEVER getUser — getUser races the middleware cookie refresh and
 * signs people out. That bug has been paid for twice in this codebase.
 */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/connect/service-client'
import { isOwnerEmail } from '@/lib/owner'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'

export interface ClientRow {
  locationId: string
  name: string
  /** We hold a credential and can act inside this account. */
  connected: boolean
  /** The agency's one free client slot. */
  isFree: boolean
  billingStatus: string | null
  /** Non-null when a stored credential exists but has stopped working. */
  error: string | null
  verifiedAt: string | null
}

export interface AgencyViewer {
  userId: string
  email: string | null
  isOwner: boolean
  companyId: string
  companyName: string | null
  /** The whole roster, connected flag merged in. Sellable. */
  clients: ClientRow[]
  /** null when the roster read failed — never an empty list standing in for it. */
  rosterReadOk: boolean
  syncedAt: string | null
}

export type ViewerResult =
  | { ok: true; viewer: AgencyViewer }
  | { ok: false; reason: 'signed-out' | 'no-agency' | 'unavailable'; message: string }

/**
 * Resolve the signed-in user to their agency and its client roster.
 *
 * Returns a REASON rather than throwing, because the three failures need three
 * different pages: sign in, connect an agency, or "we could not read this" —
 * and the last of those must never be rendered as "you have no clients".
 */
export async function resolveAgencyViewer(req?: { headers: { get(name: string): string | null } }): Promise<ViewerResult> {
  let userId = ''
  let email: string | null = null
  /** Set when the iframe lane identified the agency directly. */
  let jwtCompanyId = ''

  // Lane 1 — the iframe's app JWT. It names the company outright, which is
  // stronger than looking one up: there is no row to be missing.
  if (req) {
    const claims = verifyAppJwt(bearer(req))
    if (claims.ok) {
      jwtCompanyId = claims.claims.companyId
      email = claims.claims.email ?? null
      userId = claims.claims.sub
    }
  }

  // Lane 2 — the standalone Supabase session.
  if (!jwtCompanyId) {
    try {
      const supabase = await createClient()
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user) {
        return { ok: false, reason: 'signed-out', message: 'Sign in to see your clients.' }
      }
      userId = session.user.id
      email = session.user.email ?? null
    } catch {
      return { ok: false, reason: 'unavailable', message: 'We could not check your session.' }
    }
  }

  const db = createServiceClient()
  if (!db) {
    return { ok: false, reason: 'unavailable', message: 'Storage is not configured.' }
  }

  const agencyQuery = db
    .from('agency_connections')
    .select('company_id, company_name, locations, locations_synced_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)

  const { data: agency, error: agencyErr } = await (
    jwtCompanyId
      ? agencyQuery.eq('company_id', jwtCompanyId)
      : agencyQuery.eq('user_id', userId)
  ).maybeSingle()

  if (agencyErr) {
    console.error('[clients/viewer] agency read failed:', agencyErr.message)
    return { ok: false, reason: 'unavailable', message: 'We could not read your agency connection.' }
  }
  if (!agency) {
    return { ok: false, reason: 'no-agency', message: 'Connect your agency to manage clients.' }
  }

  const { data: conns, error: connErr } = await db
    .from('location_connections')
    .select('location_id, location_name, is_free, billing_status, verified_at, last_error')
    .eq('company_id', agency.company_id)
    .eq('status', 'active')

  if (connErr) {
    console.error('[clients/viewer] connections read failed:', connErr.message)
  }

  const connected = new Map<string, Record<string, unknown>>(
    (conns ?? []).map((c: Record<string, unknown>) => [String(c.location_id).trim(), c]),
  )

  const roster = Array.isArray(agency.locations) ? (agency.locations as { id: string; name: string }[]) : []

  const clients: ClientRow[] = roster
    // '' is not a location. This database already carries a row with a blank
    // location_id that read as the newest install in its table.
    .filter((l) => l && typeof l.id === 'string' && l.id.trim() !== '')
    .map((l) => {
      const id = l.id.trim()
      const c = connected.get(id)
      return {
        locationId: id,
        name: (c?.location_name as string) || l.name || 'Untitled client',
        connected: Boolean(c),
        isFree: Boolean(c?.is_free),
        billingStatus: (c?.billing_status as string) ?? null,
        error: (c?.last_error as string) ?? null,
        verifiedAt: (c?.verified_at as string) ?? null,
      }
    })

  // A connected account that fell out of the roster (renamed, re-synced, or
  // provisioned after the last sync) must still be listed. It is one we can
  // ACT in — dropping it because a cached roster is stale is the worse error.
  for (const [id, c] of connected) {
    if (!clients.some((x) => x.locationId === id)) {
      clients.push({
        locationId: id,
        name: (c.location_name as string) || 'Untitled client',
        connected: true,
        isFree: Boolean(c.is_free),
        billingStatus: (c.billing_status as string) ?? null,
        error: (c.last_error as string) ?? null,
        verifiedAt: (c.verified_at as string) ?? null,
      })
    }
  }

  clients.sort((a, b) => Number(b.connected) - Number(a.connected) || a.name.localeCompare(b.name))

  return {
    ok: true,
    viewer: {
      userId,
      email,
      isOwner: isOwnerEmail(email),
      companyId: agency.company_id,
      companyName: agency.company_name ?? null,
      clients,
      rosterReadOk: !connErr,
      syncedAt: agency.locations_synced_at ?? null,
    },
  }
}

/**
 * The viewer AND the single client, or a refusal.
 *
 * The client is found in the roster this viewer's own agency returned. There is
 * no path here that reads a location by id alone, which is what makes an
 * IDOR against another agency's sub-account impossible rather than unlikely.
 */
export type ClientResult =
  | { ok: true; viewer: AgencyViewer; client: ClientRow }
  | { ok: false; reason: 'signed-out' | 'no-agency' | 'unavailable' | 'not-yours'; message: string }

export async function resolveClient(
  locationIdRaw: string,
  req?: { headers: { get(name: string): string | null } },
): Promise<ClientResult> {
  const locationId = (locationIdRaw ?? '').trim()
  if (!locationId) {
    return { ok: false, reason: 'not-yours', message: 'No client was named.' }
  }

  const v = await resolveAgencyViewer(req)
  if (!v.ok) return v

  const client = v.viewer.clients.find((c) => c.locationId === locationId)
  if (!client) {
    // Deliberately the same sentence whether the location does not exist or
    // belongs to someone else. A 404 that distinguishes the two is an oracle
    // for enumerating other agencies' sub-accounts.
    return { ok: false, reason: 'not-yours', message: 'That client is not on your account.' }
  }

  return { ok: true, viewer: v.viewer, client }
}
