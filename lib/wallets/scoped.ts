/**
 * The wallet, at both levels, through one door.
 *
 * Everything money-shaped in the Client Upsell storefront goes through here:
 * a client top-up, an upgrade debit, an agency refill. Callers never touch
 * `scoped_wallets` directly, because the invariant that makes this safe — a
 * balance and a ledger row move together, atomically, or neither moves — lives
 * in the Postgres functions and is lost the moment somebody writes an UPDATE.
 *
 * INSUFFICIENT IS NOT AN ERROR, IT IS AN ANSWER. charge() returns
 * { ok: false, insufficient: true } and the caller shows "add credits", rather
 * than a 500 that looks like the site is broken when the customer is simply out
 * of money.
 *
 * A FAILED READ RETURNS null, NEVER 0. A balance of zero and "we could not read
 * the balance" produce opposite UI: one offers a top-up, the other must say the
 * wallet is unreadable. Collapsing them is how a paying customer gets told they
 * are broke.
 *
 * REF IS THE IDEMPOTENCY KEY and callers should always pass one for anything a
 * human can double-click. The database treats a repeat as a replay.
 */
import { createServiceClient } from '@/lib/connect/service-client'
import { moneyMode } from '@/lib/client-tiers'

export type WalletScope = 'location' | 'company'

export type LedgerKind = 'topup' | 'grant' | 'refill' | 'upgrade' | 'usage' | 'adjustment' | 'refund'

export interface Wallet {
  scope: WalletScope
  scopeId: string
  companyId: string
  balanceCents: number
  lifetimeCreditCents: number
  lifetimeDebitCents: number
  autorefill: { enabled: boolean; triggerCents: number | null; amountCents: number | null }
  updatedAt: string | null
}

export interface LedgerEntry {
  id: string
  deltaCents: number
  kind: LedgerKind
  mode: 'test' | 'live'
  description: string | null
  ref: string | null
  balanceAfter: number
  actor: string | null
  createdAt: string
}

export interface MoveResult {
  ok: boolean
  balanceCents: number | null
  insufficient?: boolean
  /** Present when ok is false for a reason the customer cannot fix themselves. */
  error?: string
}

/** An empty wallet that has never been used. Not a failure — a starting point. */
function emptyWallet(scope: WalletScope, scopeId: string, companyId: string): Wallet {
  return {
    scope, scopeId, companyId,
    balanceCents: 0, lifetimeCreditCents: 0, lifetimeDebitCents: 0,
    autorefill: { enabled: false, triggerCents: null, amountCents: null },
    updatedAt: null,
  }
}

/**
 * Read one wallet. Returns null ONLY when the read failed — a wallet that has
 * never been credited comes back as a real zero-balance wallet, because that is
 * what it is.
 */
export async function getWallet(
  scope: WalletScope, scopeId: string, companyId: string,
): Promise<Wallet | null> {
  const db = createServiceClient()
  if (!db) return null
  const { data, error } = await db
    .from('scoped_wallets')
    .select('scope, scope_id, company_id, balance_cents, lifetime_credit_cents, lifetime_debit_cents, autorefill_enabled, autorefill_trigger_cents, autorefill_amount_cents, updated_at')
    .eq('scope', scope)
    .eq('scope_id', scopeId)
    .maybeSingle()

  if (error) {
    console.error('[wallet] read failed:', error.message)
    return null
  }
  if (!data) return emptyWallet(scope, scopeId, companyId)

  return {
    scope: data.scope as WalletScope,
    scopeId: data.scope_id,
    companyId: data.company_id,
    balanceCents: data.balance_cents,
    lifetimeCreditCents: data.lifetime_credit_cents,
    lifetimeDebitCents: data.lifetime_debit_cents,
    autorefill: {
      enabled: data.autorefill_enabled,
      triggerCents: data.autorefill_trigger_cents,
      amountCents: data.autorefill_amount_cents,
    },
    updatedAt: data.updated_at,
  }
}

/** Every client wallet under one agency, keyed by location id, for the index. */
export async function getCompanyLocationWallets(
  companyId: string,
): Promise<Map<string, number> | null> {
  const db = createServiceClient()
  if (!db) return null
  const { data, error } = await db
    .from('scoped_wallets')
    .select('scope_id, balance_cents')
    .eq('company_id', companyId)
    .eq('scope', 'location')
  if (error) {
    console.error('[wallet] company wallets read failed:', error.message)
    return null
  }
  return new Map((data ?? []).map((r: { scope_id: string; balance_cents: number }) => [r.scope_id, r.balance_cents]))
}

export async function credit(args: {
  scope: WalletScope
  scopeId: string
  companyId: string
  cents: number
  kind?: LedgerKind
  description?: string
  ref?: string
  actor?: string
}): Promise<MoveResult> {
  if (!Number.isInteger(args.cents) || args.cents <= 0) {
    return { ok: false, balanceCents: null, error: 'Amount must be a positive whole number of cents.' }
  }
  const db = createServiceClient()
  if (!db) return { ok: false, balanceCents: null, error: 'Storage is not configured.' }

  const { data, error } = await db.rpc('scoped_wallet_credit', {
    p_scope: args.scope, p_scope_id: args.scopeId, p_company: args.companyId,
    p_cents: args.cents, p_kind: args.kind ?? 'topup', p_mode: moneyMode(),
    p_desc: args.description ?? null, p_ref: args.ref ?? null, p_actor: args.actor ?? null,
  })
  if (error) {
    console.error('[wallet] credit failed:', error.message)
    return { ok: false, balanceCents: null, error: 'The credit could not be recorded.' }
  }
  return { ok: true, balanceCents: data as number }
}

export async function charge(args: {
  scope: WalletScope
  scopeId: string
  companyId: string
  cents: number
  kind?: LedgerKind
  description?: string
  ref?: string
  actor?: string
}): Promise<MoveResult> {
  if (!Number.isInteger(args.cents) || args.cents <= 0) {
    return { ok: false, balanceCents: null, error: 'Amount must be a positive whole number of cents.' }
  }
  const db = createServiceClient()
  if (!db) return { ok: false, balanceCents: null, error: 'Storage is not configured.' }

  const { data, error } = await db.rpc('scoped_wallet_charge', {
    p_scope: args.scope, p_scope_id: args.scopeId, p_company: args.companyId,
    p_cents: args.cents, p_kind: args.kind ?? 'usage', p_mode: moneyMode(),
    p_desc: args.description ?? null, p_ref: args.ref ?? null, p_actor: args.actor ?? null,
  })
  if (error) {
    console.error('[wallet] charge failed:', error.message)
    return { ok: false, balanceCents: null, error: 'The charge could not be recorded.' }
  }
  // -1 is the function's "the wallet could not cover this, and nothing was
  // written". It is a state, not a fault.
  const bal = data as number
  if (bal < 0) return { ok: false, balanceCents: null, insufficient: true }
  return { ok: true, balanceCents: bal }
}

/** The receipts feed. Newest first, because that is the question being asked. */
export async function listLedger(
  scope: WalletScope, scopeId: string, limit = 25,
): Promise<LedgerEntry[] | null> {
  const db = createServiceClient()
  if (!db) return null
  const { data, error } = await db
    .from('scoped_wallet_entries')
    .select('id, delta_cents, kind, mode, description, ref, balance_after, actor, created_at')
    .eq('scope', scope)
    .eq('scope_id', scopeId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[wallet] ledger read failed:', error.message)
    return null
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    deltaCents: r.delta_cents as number,
    kind: r.kind as LedgerKind,
    mode: r.mode as 'test' | 'live',
    description: (r.description as string) ?? null,
    ref: (r.ref as string) ?? null,
    balanceAfter: r.balance_after as number,
    actor: (r.actor as string) ?? null,
    createdAt: r.created_at as string,
  }))
}

/**
 * Set the agency's auto-refill rule.
 *
 * Enabling with either value missing is refused HERE as well as by the check
 * constraint, so the caller gets a sentence instead of a Postgres error string.
 * A refill rule with no trigger is a rule that fires never or always, and which
 * of those it is would only be discovered by a customer.
 */
export async function setAutoRefill(args: {
  companyId: string
  enabled: boolean
  triggerCents: number | null
  amountCents: number | null
}): Promise<{ ok: boolean; error?: string }> {
  if (args.enabled) {
    if (!Number.isInteger(args.triggerCents ?? NaN) || (args.triggerCents ?? -1) < 0) {
      return { ok: false, error: 'Set the balance that should trigger a refill.' }
    }
    if (!Number.isInteger(args.amountCents ?? NaN) || (args.amountCents ?? 0) <= 0) {
      return { ok: false, error: 'Set how much to add when it refills.' }
    }
  }
  const db = createServiceClient()
  if (!db) return { ok: false, error: 'Storage is not configured.' }

  const { error } = await db.from('scoped_wallets').upsert(
    {
      scope: 'company',
      scope_id: args.companyId,
      company_id: args.companyId,
      autorefill_enabled: args.enabled,
      autorefill_trigger_cents: args.enabled ? args.triggerCents : null,
      autorefill_amount_cents: args.enabled ? args.amountCents : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'scope,scope_id' },
  )
  if (error) {
    console.error('[wallet] auto-refill config failed:', error.message)
    return { ok: false, error: 'The refill rule could not be saved.' }
  }
  return { ok: true }
}
