/**
 * GET /api/admin/deprecation-check — are we exposed to a removed endpoint?
 *
 * Turns "did anyone re-read the changelog" into a query. Pair it with the
 * runtime env audit on the release checklist.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { DEPRECATED_ENDPOINTS, locationsAtRisk } from '@/lib/crm/deprecations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { atRisk, safe } = await locationsAtRisk(s.claims.companyId)
  const undocumented = DEPRECATED_ENDPOINTS.filter((e) => e.status === 'removed-undocumented')
  const inUse = DEPRECATED_ENDPOINTS.filter((e) => (e.usedBy?.length ?? 0) > 0)

  return NextResponse.json({
    healthy: atRisk.length === 0,
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
