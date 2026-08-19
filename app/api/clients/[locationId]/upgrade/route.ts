/**
 * POST /api/clients/[locationId]/upgrade — the one-click $5 → $10.
 *
 * The whole purchase is: debit the client wallet by the difference, write the
 * AI-layer entitlement, leave a receipt. All three live in
 * lib/clients/upgrade.ts so this route stays what a route should be — auth,
 * validation, and a status code.
 *
 * INSUFFICIENT FUNDS IS 402, NOT 500. It is a state the customer can fix in one
 * click on the same page, and rendering it as a server error sends them to
 * support instead of to the top-up button.
 *
 * The gate that matters is resolveClient(): the location must be in the
 * CALLER'S OWN agency roster. Selling an upgrade into a stranger's sub-account
 * is the worst thing this endpoint could do, so the id from the URL is never
 * used to fetch anything on its own.
 */
import { NextResponse } from 'next/server'
import { resolveClient } from '@/lib/clients/viewer'
import { upgradeClientToAi } from '@/lib/clients/upgrade'
import { getSubLocationTier, upgradeDeltaCents, testModeReason, usd } from '@/lib/client-tiers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUS: Record<string, number> = {
  'signed-out': 401, 'no-agency': 403, 'not-yours': 404, unavailable: 503,
}

export async function POST(req: Request, ctx: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await ctx.params
  const r = await resolveClient(locationId, req)
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: STATUS[r.reason] ?? 400 })

  let body: { ref?: unknown } = {}
  try { body = await req.json() } catch { /* ref is optional */ }

  const result = await upgradeClientToAi({
    locationId: r.client.locationId,
    companyId: r.viewer.companyId,
    actor: r.viewer.email ?? r.viewer.userId,
    ref: typeof body.ref === 'string' && body.ref ? `upgrade:${r.client.locationId}:${body.ref.slice(0, 64)}` : undefined,
  })

  if (!result.ok) {
    if (result.reason === 'insufficient') {
      return NextResponse.json(
        {
          error: result.message,
          needCents: result.needCents,
          needLabel: usd(result.needCents),
          insufficient: true,
        },
        { status: 402 },
      )
    }
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  const tier = getSubLocationTier('ai')
  return NextResponse.json({
    ok: true,
    tier: 'ai',
    tierName: tier.name,
    alreadyOwned: Boolean(result.alreadyOwned),
    chargedCents: result.chargedCents,
    chargedLabel: usd(result.chargedCents),
    deltaCents: upgradeDeltaCents(),
    balanceCents: result.balanceCents,
    mode: result.mode,
    testModeReason: testModeReason(),
  })
}
