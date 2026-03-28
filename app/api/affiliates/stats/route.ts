import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Generate referral link from user ID
  const refCode = Buffer.from(user.id.slice(0, 12)).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  const referralLink = `https://0ncore.com/signup?ref=${refCode}`

  // TODO: Pull real stats from CRM affiliate system or Supabase
  // For now return the referral link and placeholder stats
  return NextResponse.json({
    stats: {
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarnings: 0,
      pendingPayout: 0,
      conversionRate: 0,
      referralLink,
    }
  })
}
