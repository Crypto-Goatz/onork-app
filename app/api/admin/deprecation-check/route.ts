/**
 * GET /api/admin/deprecation-check — are we exposed to a removed endpoint?
 *
 * Turns "did anyone re-read the changelog" into a query. Pair it with the
 * runtime env audit on the release checklist.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { DEPRECATED_ENDPOINTS, locationsAtRisk } from '@/lib/crm/deprecations'
import { pastedKeyExposure } from '@/lib/crm/pasted-key-fallback'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { atRisk, safe } = await locationsAtRisk(s.claims.companyId)
  // Every location, not just this agency's connected ones. locationsAtRisk
  // iterates location_connections, so a provisioned or family-link account we
  // resolve for but nobody connected is invisible to it — and that is exactly
  // the kind with no pasted key.
  const exposure = await pastedKeyExposure()
  const undocumented = DEPRECATED_ENDPOINTS.filter((e) => e.status === 'removed-undocumented')
  const inUse = DEPRECATED_ENDPOINTS.filter((e) => (e.usedBy?.length ?? 0) > 0)

  return NextResponse.json({
    healthy: atRisk.length === 0 && exposure.connectedOnMint.length === 0,
    // The switch, and whether anything still needs the removed endpoint.
    fallback: {
      armed: exposure.armed,
      mintDisposition: exposure.disposition,
      locationsKnown: exposure.total,
      onPastedKey: exposure.onPastedKey,
      onInstall: exposure.onInstall,
      // Split because they are different problems. A connected account on the
      // mint is a customer outage the day the vendor decides; a dormant one is
      // a retired install nothing routine touches.
      connectedOnMint: exposure.connectedOnMint,
      dormantOnMint: exposure.dormantOnMint.map((r) => r.locationId),
      note: exposure.connectedOnMint.length
        ? `${exposure.connectedOnMint.length} CONNECTED account(s) have no pasted key and no live install — they resolve through the removed endpoint and break the day it goes. Paste keys at /connect now.`
        : exposure.dormantOnMint.length
          ? `No connected account depends on the mint. ${exposure.dormantOnMint.length} dormant location(s) (retired installs, no pasted key) would fall through to it if something touched them — worth a key each, not an emergency.`
          : 'No location depends on POST /oauth/locationToken. The fallback can be armed at any time with no loss of service.',
      howToArm:
        "update public.crm_endpoint_state set fallback_armed = true, armed_at = now(), armed_by = 'operator' where endpoint = 'POST /oauth/locationToken'; -- takes effect within 60s, no deploy. CRM_REQUIRE_PASTED_KEY=1 is the env override if the database is the unreachable thing.",
    },
    locations: {
      safe,
      atRisk,
      note: atRisk.length
        ? 'These locations have no pasted key and no live install, so credential resolution falls through to POST /oauth/locationToken — removed from the docs with no deprecation period. Paste a key for each.'
        : 'Every active location resolves on a pasted key or a live install. The removed mint endpoint is never reached.',
    },
    endpoints: {
      total: DEPRECATED_ENDPOINTS.length,
      removedUndocumented: undocumented.length,
      inUseByUs: inUse.map((e) => `${e.method} ${e.path}`),
      detail: DEPRECATED_ENDPOINTS,
    },
  })
}
