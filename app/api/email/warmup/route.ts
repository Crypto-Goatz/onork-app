import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { domain, target } = await req.json()
  if (!domain || !target) return NextResponse.json({ error: 'domain and target required' }, { status: 400 })

  const days = 30
  const dailyTarget = target
  const schedule = []

  for (let day = 1; day <= days; day++) {
    const pct = Math.min(1, Math.pow(day / days, 1.5))
    const volume = Math.max(10, Math.round(dailyTarget * pct))
    const phase = day <= 7 ? 'cautious' : day <= 14 ? 'building' : day <= 21 ? 'accelerating' : 'full'

    schedule.push({
      day,
      volume,
      phase,
      engagement_target: phase === 'cautious' ? '>30% open rate' : phase === 'building' ? '>25% open rate' : '>20% open rate',
      action: phase === 'cautious'
        ? 'Send to most engaged contacts only (opened in last 30 days)'
        : phase === 'building'
        ? 'Expand to contacts who opened in last 90 days'
        : phase === 'accelerating'
        ? 'Include contacts who opened in last 180 days'
        : 'Full list — monitor bounce rate (<2%) and spam rate (<0.1%)',
      pause_if: 'Bounce rate >5% OR spam complaints >0.3% OR open rate drops below 15%',
    })
  }

  return NextResponse.json({ domain, target: dailyTarget, days, schedule })
}
