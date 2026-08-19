/**
 * POST /api/clients/[locationId]/wallet — add credits to a client wallet.
 * GET  /api/clients/[locationId]/wallet — balance + receipts.
 *
 * TEST MODE UNTIL TWO GATES OPEN. `moneyMode()` is the only thing that decides
 * whether a movement is real, and it needs BOTH the runtime-proven billing
 * rails and Mike's ratified prices. Until then this endpoint moves ledger
 * balance and charges no card — and says so in the response, so a caller cannot
 * mistake a test balance for money received.
 *
 * OWNERSHIP IS PROVEN BEFORE ANYTHING IS WRITTEN. resolveClient() finds the
 * location in the caller's OWN agency roster; the id in the URL never reaches a
 * query on its own.
 *
 * THE AMOUNT IS CHOSEN FROM THE CONFIGURED DENOMINATIONS, NOT SENT FREELY. An
 * arbitrary cent amount from the browser is how a wallet gets credited with
 * $10,000 by editing a form field. The floor is enforced too.
 */
import { NextResponse } from 'next/server'
import { resolveClient } from '@/lib/clients/viewer'
import { credit, getWallet, listLedger } from '@/lib/wallets/scoped'
import { WALLET, moneyMode, testModeReason } from '@/lib/client-tiers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUS: Record<string, number> = {
  'signed-out': 401, 'no-agency': 403, 'not-yours': 404, unavailable: 503,
}

export async function GET(req: Request, ctx: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await ctx.params
  const r = await resolveClient(locationId, req)
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: STATUS[r.reason] ?? 400 })

  const [wallet, ledger] = await Promise.all([
    getWallet('location', r.client.locationId, r.viewer.companyId),
    listLedger('location', r.client.locationId, 25),
  ])

  return NextResponse.json({
    locationId: r.client.locationId,
    // null means "we could not read it", and the UI must not print $0.00 for it.
    balanceCents: wallet ? wallet.balanceCents : null,
    walletReadOk: Boolean(wallet),
    ledger: ledger ?? [],
    ledgerReadOk: ledger !== null,
    mode: moneyMode(),
    testModeReason: testModeReason(),
    denominations: WALLET.topupCents,
    minTopupCents: WALLET.minTopupCents,
  })
}

export async function POST(req: Request, ctx: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await ctx.params
  const r = await resolveClient(locationId, req)
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: STATUS[r.reason] ?? 400 })

  let body: { cents?: unknown; ref?: unknown } = {}
  try { body = await req.json() } catch { /* an empty body is caught by the amount check below */ }

  const cents = Number(body.cents)
  if (!Number.isInteger(cents) || cents <= 0) {
    return NextResponse.json({ error: 'Choose an amount to add.' }, { status: 400 })
  }
  if (!WALLET.topupCents.includes(cents)) {
    return NextResponse.json(
      { error: 'That is not one of the available amounts.', denominations: WALLET.topupCents },
      { status: 400 },
    )
  }
  if (cents < WALLET.minTopupCents) {
    return NextResponse.json({ error: 'That is below the minimum top-up.' }, { status: 400 })
  }

  const result = await credit({
    scope: 'location',
    scopeId: r.client.locationId,
    companyId: r.viewer.companyId,
    cents,
    kind: 'topup',
    description: `Credits added by ${r.viewer.email ?? 'the agency'}`,
    // Client-supplied ref is accepted so a retried request replays instead of
    // double-crediting. It is namespaced so it can never collide with the
    // upgrade refs this same wallet uses.
    ref: typeof body.ref === 'string' && body.ref ? `topup:${r.client.locationId}:${body.ref.slice(0, 64)}` : undefined,
    actor: r.viewer.email ?? r.viewer.userId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'The credit could not be recorded.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    balanceCents: result.balanceCents,
    addedCents: cents,
    mode: moneyMode(),
    testModeReason: testModeReason(),
  })
}
