import { NextResponse } from 'next/server'
import { createClient as createServer } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function refCodeFor(userId: string): string {
  return Buffer.from(userId.slice(0, 12))
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
}

export async function GET() {
  const supabase = await createServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user
  const refCode = refCodeFor(user.id)
  const referralLink = `https://0ncore.com/signup?ref=${refCode}`

  // Pull real stats from profiles where referred_by_code matches this user.
  const sb = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: referrals, error } = await sb
    .from('profiles')
    .select('id, plan, tier_level, created_at, onboarding_completed')
    .eq('referred_by', refCode)

  if (error) {
    console.warn('[affiliates/stats] referral query failed:', error.message)
  }

  const list = referrals ?? []
  const totalReferrals = list.length
  const activeReferrals = list.filter(
    (r) => (r.tier_level ?? 0) > 0 || ['starter', 'pro', 'agency', 'enterprise'].includes(r.plan ?? ''),
  ).length

  // Earnings come from CRM affiliate workflow (Stripe webhook → CRM workflow
  // "Add Manual Sales For An Affiliate"). For now, mirror confirmed-active count
  // × $30 first-month rev share until the CRM affiliate read API is wired.
  const ESTIMATE_PER_ACTIVE = 30
  const totalEarnings = activeReferrals * ESTIMATE_PER_ACTIVE
  const pendingPayout = totalEarnings // unpaid until first payout cycle

  const conversionRate = totalReferrals > 0
    ? Math.round((activeReferrals / totalReferrals) * 100)
    : 0

  return NextResponse.json({
    stats: {
      totalReferrals,
      activeReferrals,
      totalEarnings,
      pendingPayout,
      conversionRate,
      referralLink,
      refCode,
    },
  })
}
