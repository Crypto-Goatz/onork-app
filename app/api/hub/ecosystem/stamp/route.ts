/**
 * GET /api/hub/ecosystem/stamp — when the ecosystem map was last true.
 *
 * PUBLIC AND UNAUTHENTICATED, DELIBERATELY, because the alternative was worse.
 * `/api/hub/ecosystem` is owner-gated and must stay that way — it exposes
 * internal architecture, health and row counts. But that gate made the fleet
 * sweep's stale-canonical check (13) permanently BLOCKED: an anonymous sweep
 * got a 404 and could not read the freshness of the one endpoint built to be
 * the honest successor to dispatch. The proposed fix was to hand the sweep a
 * credential. Handing a monitor a credential to read one timestamp is how a
 * monitor becomes a second thing worth stealing.
 *
 * So the timestamp — and ONLY the timestamp — comes out here. There is nothing
 * to gate: it is one date, it names no system, no count and no host.
 *
 * WHY IT IS DERIVED AND NOT `new Date()`. A stamp that always says "now" makes
 * check 13 incapable of ever failing, and a check that cannot fail is not a
 * check — it is a green light wired to nothing. That is precisely the failure
 * this endpoint exists to guard against, so building it that way would have
 * reproduced the incident inside its own detector.
 *
 * The map's structure is written down in lib/ecosystem/graph.ts, and every edge
 * there records HOW and WHEN it was last verified. The newest of those dates is
 * therefore the real answer to "when was this map last true", and it maintains
 * itself: verify an edge and the stamp advances; leave the map to rot and the
 * stamp ages past check 13's 30-day threshold on its own, with nobody having to
 * remember to update a constant. One value, one source.
 */
import { NextResponse } from 'next/server'
import { NODES, EDGES } from '@/lib/ecosystem/graph'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** ISO-ish dates as they appear in the graph's prose: 2026-08-18. */
const DATE = /\b(20\d{2})-(\d{2})-(\d{2})\b/g

function newestDateIn(values: unknown[]): string | null {
  let best: string | null = null
  for (const v of values) {
    if (typeof v !== 'string') continue
    for (const m of v.matchAll(DATE)) {
      const d = m[0]
      // Lexicographic comparison is correct for zero-padded ISO dates, and
      // avoids Date parsing turning a typo into a silent 1970.
      if (!best || d > best) best = d
    }
  }
  return best
}

export async function GET() {
  const strings: unknown[] = [
    ...NODES.flatMap((n) => Object.values(n as unknown as Record<string, unknown>)),
    ...EDGES.flatMap((e) => Object.values(e as unknown as Record<string, unknown>)),
  ]
  const newest = newestDateIn(strings)

  /**
   * `null` with a reason, never a fallback date. Returning today's date because
   * the scan found nothing would be the same lie as reporting "0 live installs"
   * from a failed query — confident, current-looking, and wrong.
   */
  if (!newest) {
    return NextResponse.json(
      { updated_at: null, why: 'No verification date found in the ecosystem graph — the map cannot say when it was last true.' },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=300' } },
    )
  }

  return NextResponse.json(
    {
      updated_at: `${newest}T00:00:00.000Z`,
      source: 'newest verified date in lib/ecosystem/graph.ts',
    },
    { status: 200, headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
