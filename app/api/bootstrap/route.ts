import { NextRequest, NextResponse } from 'next/server'
import { METERS, formatPrice } from '@/lib/meters'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { getValidAgencyToken } from '@/lib/crm/agency-token'

/**
 * GET /api/bootstrap — everything the shell needs on first paint.
 *
 * ONE CALL, not six. The dashboard renders inside an iframe in someone else's
 * product; every extra round trip is visible as the shell assembling itself in
 * front of the user. Agency identity, activated locations, entitlements and the
 * usage summary arrive together so the shell paints once.
 *
 * SCOPED TO THE TOKEN, NEVER TO A QUERY PARAM. companyId comes out of the
 * signed JWT and nowhere else. The moment an agency id can be passed in, this
 * route becomes a way to read another agency's client list by editing a URL.
 *
 * NO TOKEN IS NOT AN ERROR. The shell paints before the SSO handshake finishes,
 * and it also runs outside the CRM while we develop it. Unauthenticated gets the
 * honest empty state — `connected: false`, no invented clients — rather than a
 * 401 that would render as a broken page inside a customer's CRM.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

interface CrmLocation { id?: string; _id?: string; name?: string }

/** The agency's sub-accounts, straight from the platform. */
async function fetchLocations(token: string, companyId: string): Promise<{ list: CrmLocation[]; error?: string }> {
  try {
    const res = await fetch(
      `${CRM_API}/locations/search?companyId=${encodeURIComponent(companyId)}&limit=200`,
      {
        headers: { Authorization: `Bearer ${token}`, Version: CRM_VERSION, Accept: 'application/json' },
        cache: 'no-store',
      },
    )
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[bootstrap] locations/search ${res.status}: ${body.slice(0, 200)}`)
      // A failed read is reported as a failed read. Falling back to an empty
      // list would render as "you have no clients", which is a different and
      // much more alarming claim than "we could not reach the CRM".
      return { list: [], error: 'Could not read your client list from the CRM.' }
    }
    const json = (await res.json()) as { locations?: CrmLocation[] }
    return { list: Array.isArray(json.locations) ? json.locations : [] }
  } catch (err) {
    console.error('[bootstrap] locations/search threw:', err)
    return { list: [], error: 'Could not reach the CRM.' }
  }
}

function emptyPayload(extra: Record<string, unknown>) {
  return {
    ok: true,
    connected: false,
    agency: { name: null, whiteLabelLogo: null },
    locations: [],
    entitlements: Object.fromEntries(METERS.map((m) => [m.key, false])),
    usage: {
      mtdCents: 0,
      mtdLabel: formatPrice(0),
      byMeter: METERS.map((m) => ({ key: m.key, label: m.label, count: 0, costCents: 0 })),
    },
    stats: { burstsToday: 0, provisionedThisWeek: 0, openTasks: 0, flowsActive: 0, growSignals: 0 },
    ...extra,
  }
}

export async function GET(req: NextRequest) {
  const verified = verifyAppJwt(bearer(req))

  if (!verified.ok) {
    return NextResponse.json(
      emptyPayload({ needs: 'Open 0nCORE from inside your CRM to connect an agency.' }),
    )
  }

  const { companyId, email, role } = verified.claims
  const agency = await getValidAgencyToken(companyId)

  if (!agency.token) {
    // The session is real; the install is not. That is a genuinely different
    // state from "not signed in" and the shell says so differently.
    return NextResponse.json(
      emptyPayload({
        session: { companyId, email: email ?? null, role: role ?? null },
        needs: agency.error || 'This agency has not connected 0nCORE yet.',
      }),
    )
  }

  const { list, error } = await fetchLocations(agency.token, companyId)

  return NextResponse.json({
    ok: true,
    connected: true,
    session: { companyId, email: email ?? null, role: role ?? null },
    agency: { name: null, whiteLabelLogo: null },
    locations: list
      .map((l) => ({ id: String(l.id || l._id || ''), name: l.name || 'Untitled client' }))
      .filter((l) => l.id),
    // Every meter is off until the billing gate lands. Reporting these as
    // enabled because a token exists would let a tile offer work that the
    // billing side has never agreed to.
    entitlements: Object.fromEntries(METERS.map((m) => [m.key, false])),
    usage: {
      mtdCents: 0,
      mtdLabel: formatPrice(0),
      byMeter: METERS.map((m) => ({ key: m.key, label: m.label, count: 0, costCents: 0 })),
    },
    stats: { burstsToday: 0, provisionedThisWeek: 0, openTasks: 0, flowsActive: 0, growSignals: 0 },
    ...(error ? { warning: error } : {}),
  })
}
