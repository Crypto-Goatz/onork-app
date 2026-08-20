/**
 * AGENCY-LEVEL INSTALLS EXPOSE MANY WORKSPACES THROUGH ONE ROW.
 *
 * The workspace resolver reads `crm_installations` and skips any row with no
 * `location_id`. That is correct for what it knew, and it silently hid the
 * only working Course Builder install we have.
 *
 * What actually happens on a marketplace install: the operator picks a
 * sub-account in the CRM UI, the app requests `user_type=Location` — and the
 * platform issues a COMPANY token anyway. Measured on the 2026-08-20 install:
 *
 *   token response  →  userType: 'Company', locationId: '', isBulkInstallation: true
 *   access JWT      →  authClass: 'Company', authClassId: <companyId>
 *
 * So the install writes ONE row with `location_id = ''` (the established
 * agency-row convention — see lib/crm/agency-token.ts) while the app is in fact
 * installed across many sub-accounts. Reading that row as "no workspaces" is how
 * a successful install still produced an empty publish picker.
 *
 * WHAT `count` MEANS, because it has already been misread once. The endpoint
 * returns EVERY sub-account under the company with a per-entry `isInstalled`
 * flag — it is not a list of installs. Measured 2026-08-20 against
 * companyId bknfhTkdDLapbwfZqQNi:
 *
 *   count: 102        ← all sub-accounts, the number quoted as "101"
 *   isInstalled true  → 47   ← the app is actually here
 *   isInstalled false → 55   ← it is not
 *
 * 47 is therefore the correct and complete answer, not a page cap: paging saw
 * all 102 (100 + 2 then break). `notInstalled` is returned so the caller can
 * say that out loud instead of leaving a reader to guess at truncation.
 *
 * The locations are not inferable from our own tables. `GET
 * /oauth/installedLocations` is the platform's own answer to "where is this app
 * installed", it is measured at request time, and every entry carries
 * `isInstalled` — so nothing here is optimistic. A workspace appears because
 * the platform says the app is installed in it, or it does not appear.
 *
 * DEPRECATION NOTE: this endpoint was removed from the published docs on
 * 2026-06-11 with no deprecation period and still answers (see
 * lib/crm/deprecations.ts). A failure here degrades to "we could not tell",
 * never to a fabricated list.
 */
import { createServiceClient } from '@/lib/connect/service-client'
import { refreshInstall } from '@/lib/crm'

const CRM_BASE = 'https://services.leadconnectorhq.com'
const PAGE = 100

/**
 * Which marketplace app backs which add-on slug.
 *
 * Deliberately a allow-list and not a lookup with a default. An unknown slug
 * resolves to no agency fan-in at all, which shows the user fewer workspaces
 * than they may have — the safe direction. Guessing an app id here would offer
 * a publish target we never verified.
 */
const APP_FOR_ADDON: Record<string, string> = {
  'ai-course-builder': '69801f7a533633818a22921c',
  'course-builder': '69801f7a533633818a22921c',
}

export function appIdForAddon(slug: string): string | null {
  return APP_FOR_ADDON[slug] ?? null
}

export interface AgencyLocation {
  locationId: string
  name: string | null
  /** Street/city the platform has for this sub-account. Often ''. */
  address: string | null
  /** When this app was installed here. The only always-present distinguishing fact. */
  installedAt: string | null
}

export interface AgencyLocationResult {
  locations: AgencyLocation[]
  /** Null on success. A human-readable reason otherwise — never swallowed. */
  error: string | null
  /** True when the platform reported more than we fetched. Never silent. */
  truncated: boolean
  /**
   * What the platform said the total was. NOTE THE SEMANTICS: this is every
   * sub-account under the company, NOT the installed ones — measured
   * 2026-08-20, count=102 while only 47 carried isInstalled:true.
   */
  total: number | null
  /**
   * How many entries were dropped for `isInstalled: false`.
   *
   * This exists because it was previously dropped silently, and 55 of 102
   * vanishing with no note is exactly the "no silent caps" failure: a picker
   * showing 47 next to an install log saying 101 reads as truncation, and the
   * only way to tell it is not is to have this number.
   */
  notInstalled: number
}

const EMPTY: AgencyLocationResult = { locations: [], error: null, truncated: false, total: null, notInstalled: 0 }

/**
 * Every sub-account this app is installed in, for one agency.
 *
 * @param appId      the marketplace app whose install we are reading
 * @param maxPages   hard bound on paging. 101 locations today; an agency with
 *                   thousands must not turn one picker render into 40 requests.
 */
export async function listAgencyInstalledLocations(
  appId: string,
  maxPages = 5,
): Promise<AgencyLocationResult> {
  const db = createServiceClient()
  if (!db) return { ...EMPTY, error: 'Storage unavailable — cannot read the agency install.' }

  // The agency row for THIS app. `location_id = ''` is the convention; null is
  // tolerated because older rows predate it.
  const { data: row } = await db
    .from('crm_installations')
    .select('id, access_token, refresh_token, expires_at, company_id, status, metadata')
    .eq('app_id', appId)
    .eq('status', 'active')
    .or('location_id.is.null,location_id.eq.')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row?.access_token) {
    return { ...EMPTY, error: 'This app has no agency-level install on file.' }
  }
  const companyId = row.company_id
  if (!companyId) {
    return { ...EMPTY, error: 'The agency install has no company id, so its locations cannot be listed.' }
  }

  // Renew BEFORE using it, not after a 401. The stored user_type is passed
  // through because this token is Company-issued while the app requests
  // Location — refreshing with the wrong one fails for an invisible reason.
  let token = row.access_token as string
  const expiresAt = row.expires_at ? new Date(row.expires_at as string).getTime() : 0
  if (expiresAt <= Date.now() + 60_000) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>
    const fresh = await refreshInstall(
      row.id as string,
      (row.refresh_token as string) || '',
      appId,
      typeof meta.user_type === 'string' ? meta.user_type : undefined,
    )
    if (!fresh) {
      return { ...EMPTY, error: 'The agency install token expired and could not be renewed. Reinstall the app.' }
    }
    token = fresh
  }

  const locations: AgencyLocation[] = []
  let total: number | null = null
  let truncated = false
  // Counted, not discarded. See `notInstalled` on the result type.
  let notInstalled = 0

  for (let page = 0; page < maxPages; page++) {
    const url =
      `${CRM_BASE}/oauth/installedLocations` +
      `?companyId=${encodeURIComponent(companyId)}&appId=${encodeURIComponent(appId)}` +
      `&limit=${PAGE}&skip=${page * PAGE}`

    let res: Response
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', Accept: 'application/json' },
        cache: 'no-store',
      })
    } catch (err) {
      // Say the platform's own words. A generic string here is how an outage hides.
      return {
        locations,
        error: `Could not reach the CRM to list installed sub-accounts: ${(err as Error).message}`,
        truncated: true,
        total,
        notInstalled,
      }
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return {
        locations,
        error: `CRM answered ${res.status} listing installed sub-accounts: ${body.slice(0, 200)}`,
        truncated: true,
        total,
        notInstalled,
      }
    }

    const json = (await res.json()) as {
      locations?: {
        _id?: string
        name?: string
        address?: string
        isInstalled?: boolean
        installedAt?: string
      }[]
      count?: number
    }
    if (typeof json.count === 'number') total = json.count

    const batch = json.locations ?? []
    for (const l of batch) {
      // isInstalled is the whole point of asking. An entry that does not
      // assert it is not a workspace we may publish into. It is also the
      // majority of the payload — this endpoint answers with EVERY sub-account
      // under the company and flags which ones have the app, so the tally below
      // is what keeps "47 of 102" from reading as a truncated list.
      if (l.isInstalled === false) { notInstalled++; continue }
      if (!l._id) continue
      locations.push({
        locationId: l._id,
        name: l.name ?? null,
        address: l.address?.trim() || null,
        installedAt: l.installedAt ?? null,
      })
    }

    if (batch.length < PAGE) break
    if (page === maxPages - 1 && total !== null && locations.length < total) truncated = true
  }

  return { locations, error: null, truncated, total, notInstalled }
}
