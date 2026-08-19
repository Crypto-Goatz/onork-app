/**
 * GET  /api/agency/wallet — the agency's own wallet, receipts and refill rule.
 * POST /api/agency/wallet — add credits, or set the auto-refill rule.
 *
 * SAME MACHINERY AS A CLIENT WALLET, DIFFERENT SCOPE. scope='company' rather
 * than 'location'. One ledger, one charge function, one set of invariants — the
 * alternative is two wallets that eventually disagree about what a receipt
 * looks like.
 *
 * AUTO-REFILL IS THE AGENCY'S RULE, NOT OURS. Trigger and amount are both set
 * by the agency and stored per wallet. The defaults offered in the form come
 * from lib/client-tiers WALLET, which is config — no threshold is hardcoded
 * into a page, and enabling a rule without both numbers is refused rather than
 * guessed.
 *
 * Nothing here charges a card yet: moneyMode() stays 'test' until the billing
 * rails are runtime-proven and the prices ratified.
 */
import { NextResponse } from 'next/server'
import { resolveAgencyViewer } from '@/lib/clients/viewer'
import { credit, getWallet, listLedger, setAutoRefill } from '@/lib/wallets/scoped'
import { WALLET, moneyMode, testModeReason } from '@/lib/client-tiers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUS: Record<string, number> = {
  'signed-out': 401, 'no-agency': 403, unavailable: 503,
}

export async function GET(req: Request) {
  const v = await resolveAgencyViewer(req)
  if (!v.ok) return NextResponse.json({ error: v.message }, { status: STATUS[v.reason] ?? 400 })

  const [wallet, ledger] = await Promise.all([
    getWallet('company', v.viewer.companyId, v.viewer.companyId),
    listLedger('company', v.viewer.companyId, 25),
  ])

  return NextResponse.json({
    companyId: v.viewer.companyId,
    balanceCents: wallet ? wallet.balanceCents : null,
    walletReadOk: Boolean(wallet),
    autorefill: wallet?.autorefill ?? { enabled: false, triggerCents: null, amountCents: null },
    defaults: { triggerCents: WALLET.refillTriggerCents, amountCents: WALLET.refillAmountCents },
    denominations: WALLET.topupCents,
    ledger: ledger ?? [],
    ledgerReadOk: ledger !== null,
    mode: moneyMode(),
    testModeReason: testModeReason(),
  })
}

export async function POST(req: Request) {
  const v = await resolveAgencyViewer(req)
  if (!v.ok) return NextResponse.json({ error: v.message }, { status: STATUS[v.reason] ?? 400 })

  let body: { action?: unknown; cents?: unknown; enabled?: unknown; triggerCents?: unknown; amountCents?: unknown; ref?: unknown } = {}
  try { body = await req.json() } catch { /* validated below */ }

  if (body.action === 'autorefill') {
    const result = await setAutoRefill({
      companyId: v.viewer.companyId,
      enabled: Boolean(body.enabled),
      triggerCents: Number.isInteger(Number(body.triggerCents)) ? Number(body.triggerCents) : null,
      amountCents: Number.isInteger(Number(body.amountCents)) ? Number(body.amountCents) : null,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  const cents = Number(body.cents)
  if (!WALLET.topupCents.includes(cents)) {
    return NextResponse.json(
      { error: 'That is not one of the available amounts.', denominations: WALLET.topupCents },
      { status: 400 },
    )
  }

  const result = await credit({
    scope: 'company',
    scopeId: v.viewer.companyId,
    companyId: v.viewer.companyId,
    cents,
    kind: 'topup',
    description: `Agency credits added by ${v.viewer.email ?? 'the agency'}`,
    ref: typeof body.ref === 'string' && body.ref ? `topup:${v.viewer.companyId}:${body.ref.slice(0, 64)}` : undefined,
    actor: v.viewer.email ?? v.viewer.userId,
  })
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'The credit could not be recorded.' }, { status: 500 })

  return NextResponse.json({
    ok: true, balanceCents: result.balanceCents, addedCents: cents,
    mode: moneyMode(), testModeReason: testModeReason(),
  })
}
