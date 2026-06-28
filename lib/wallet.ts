/**
 * Prepaid USD wallet — the metering layer.
 *
 * Balance is integer cents. Each billable API execution costs EXECUTION_COST_CENTS
 * ($0.05). Users top up via Stripe (MIN_TOPUP_CENTS = $5). All mutations go through
 * the atomic Postgres functions wallet_charge / wallet_credit so concurrent
 * executions can never double-spend or go negative.
 *
 * This replaces the old Spark/Run "credit" system (which granted but never spent).
 */

import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const EXECUTION_COST_CENTS = 5   // $0.05 per API execution
export const MIN_TOPUP_CENTS = 500      // $5.00 minimum top-up

export async function getBalanceCents(userId: string): Promise<number> {
  const { data } = await admin.from('user_wallets').select('balance_cents').eq('user_id', userId).maybeSingle()
  return data?.balance_cents ?? 0
}

export interface ChargeResult { ok: boolean; balanceCents: number; insufficient?: boolean }

/** Charge for one execution. Returns ok:false + insufficient:true when the balance won't cover it. */
export async function chargeExecution(
  userId: string,
  opts: { cents?: number; description?: string; ref?: string } = {},
): Promise<ChargeResult> {
  const cents = opts.cents ?? EXECUTION_COST_CENTS
  const { data, error } = await admin.rpc('wallet_charge', {
    p_user: userId, p_cents: cents, p_kind: 'execution',
    p_desc: opts.description ?? null, p_ref: opts.ref ?? null,
  })
  if (error) return { ok: false, balanceCents: 0 }
  const bal = data as number
  if (bal < 0) return { ok: false, balanceCents: 0, insufficient: true }
  return { ok: true, balanceCents: bal }
}

/** Credit the wallet (top-up from Stripe, or a grant). Returns the new balance in cents. */
export async function creditWallet(
  userId: string,
  cents: number,
  opts: { kind?: string; description?: string; ref?: string } = {},
): Promise<number> {
  const { data } = await admin.rpc('wallet_credit', {
    p_user: userId, p_cents: cents, p_kind: opts.kind ?? 'topup',
    p_desc: opts.description ?? null, p_ref: opts.ref ?? null,
  })
  return (data as number) ?? 0
}

export function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
