/**
 * POST /api/bridge/crm-location — find-or-create a CRM sub-location and mint a
 * location-scoped token for it. Internal, shared-secret.
 *
 * WHY THIS LIVES IN 0nCORE AND NOT IN THE CALLER.
 * Minting a location token needs the AGENCY MARKETPLACE OAUTH TOKEN, which only
 * 0nCore holds (`crm_installations`, the row with an empty location_id, kept
 * fresh by refreshAgencyToken). An agency PIT cannot do it — `/oauth/locationToken`
 * answers 401 "not authorized for this scope" — so any other app that tried to
 * provision on its own would either fail or need a copy of credentials it has no
 * business holding. One owner of the agency credential, one door.
 *
 * app.0ntask.com calls this so a 0nTask account gets its OWN sub-location
 * instead of writing contacts into the shared agency location.
 *
 * IDEMPOTENT BY EMAIL. Searches existing sub-locations first and only creates
 * when there is genuinely nothing — creating a second location for someone who
 * already has one splits their contacts across two accounts, which is the kind
 * of mess that has to be unpicked by hand.
 *
 * Returns the minted token. That is deliberate and it is why the endpoint is
 * secret-gated and never reachable from a browser.
 */
import { NextRequest, NextResponse } from 'next/server'
import { ensureLocationInstall } from '@/lib/crm/location-token'

export const runtime = 'nodejs'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function POST(req: NextRequest) {
  if (req.headers.get('x-bridge-secret') !== process.env.INTERNAL_DISPATCH_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const email = String(body.email || '').trim().toLowerCase()
  const businessName = String(body.businessName || '').trim()
  const explicitLocation = String(body.locationId || '').trim()

  if (!email && !explicitLocation) {
    return NextResponse.json({ error: 'email or locationId required' }, { status: 400 })
  }

  const agencyPit = process.env.CRM_AGENCY_PIT
  const companyId = process.env.CRM_COMPANY_ID
  if (!agencyPit || !companyId) {
    return NextResponse.json({ error: 'agency credentials not configured' }, { status: 503 })
  }

  const agencyHeaders = {
    Authorization: `Bearer ${agencyPit}`,
    Version: CRM_VERSION,
    Accept: 'application/json',
  }

  try {
    let locationId = explicitLocation
    let locationName = ''
    let created = false

    // ── 1. Already have one? ──
    if (!locationId) {
      const search = await fetch(
        `${CRM_API}/locations/search?companyId=${encodeURIComponent(companyId)}&limit=200`,
        { headers: agencyHeaders },
      )
      if (search.ok) {
        const j = (await search.json()) as { locations?: { id: string; name?: string; email?: string }[] }
        const hit = (j.locations || []).find(
          (l) => String(l.email || '').trim().toLowerCase() === email,
        )
        if (hit) {
          locationId = hit.id
          locationName = hit.name || ''
        }
      }
    }

    // ── 2. Otherwise create it ──
    if (!locationId) {
      locationName = businessName ? `${businessName} — 0nTask` : `${email} — 0nTask`
      // Trailing slash is REQUIRED: `/locations` 404s, `/locations/` is canonical.
      const res = await fetch(`${CRM_API}/locations/`, {
        method: 'POST',
        headers: { ...agencyHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          name: locationName,
          email,
          country: 'US',
          timezone: 'America/New_York',
        }),
      })
      const text = await res.text()
      if (!res.ok) {
        return NextResponse.json(
          { error: `create location ${res.status}: ${text.slice(0, 300)}` },
          { status: 502 },
        )
      }
      const j = JSON.parse(text || '{}') as { id?: string; location?: { id?: string; name?: string } }
      locationId = j.id || j.location?.id || ''
      locationName = j.location?.name || locationName
      if (!locationId) {
        return NextResponse.json({ error: 'create returned no location id' }, { status: 502 })
      }
      created = true
    }

    // ── 3. Mint the location-scoped token (the part only 0nCore can do) ──
    const minted = await ensureLocationInstall(locationId)
    if (!minted.token) {
      return NextResponse.json(
        { error: `location token mint failed: ${minted.error || 'unknown'}`, locationId, created },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      locationId,
      locationName,
      created,
      token: minted.token,
      expiresAt: minted.expiresAt ?? null,
      source: minted.source,
      companyId,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[bridge/crm-location] failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
