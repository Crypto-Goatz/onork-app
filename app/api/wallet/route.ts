/**
 * GET /api/wallet → this user's balance + recent ledger.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { EXECUTION_COST_CENTS } from '@/lib/wallet'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: wallet }, { data: ledger }] = await Promise.all([
    admin.from('user_wallets').select('balance_cents, lifetime_topup_cents, lifetime_spent_cents').eq('user_id', user.id).maybeSingle(),
    admin.from('wallet_ledger').select('kind, delta_cents, balance_after, description, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(25),
  ])

  return NextResponse.json({
    balance_cents: wallet?.balance_cents ?? 0,
    lifetime_topup_cents: wallet?.lifetime_topup_cents ?? 0,
    lifetime_spent_cents: wallet?.lifetime_spent_cents ?? 0,
    execution_cost_cents: EXECUTION_COST_CENTS,
    ledger: ledger || [],
  })
}
