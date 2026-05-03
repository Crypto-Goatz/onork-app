import { NextRequest, NextResponse } from 'next/server'
import { drAdmin } from '@/lib/dr/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DailyRow = {
  date: string
  total_sessions: number
  grade_a: number
  grade_b: number
  grade_c: number
  grade_d: number
  grade_f: number
  grade_x: number
  avg_score: number | null
  top_referrer: string | null
  top_ad_platform: string | null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params
  if (!siteId) {
    return NextResponse.json({ ok: false, error: 'siteId required' }, { status: 400 })
  }

  const days = Math.min(90, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') || '7', 10)))
  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  const sinceISO = since.toISOString().slice(0, 10)

  const supabase = drAdmin()

  const [statsRes, platformRes, referrerRes, todayRes, yesterdayRes] = await Promise.all([
    supabase
      .from('dr_daily_stats')
      .select('*')
      .eq('site_id', siteId)
      .gte('date', sinceISO)
      .order('date', { ascending: true }),
    supabase
      .from('dr_events')
      .select('ad_platform')
      .eq('site_id', siteId)
      .eq('event_type', 'grade')
      .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
      .limit(5000),
    supabase
      .from('dr_events')
      .select('referrer')
      .eq('site_id', siteId)
      .eq('event_type', 'grade')
      .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
      .not('referrer', 'is', null)
      .limit(5000),
    supabase
      .from('dr_daily_stats')
      .select('total_sessions')
      .eq('site_id', siteId)
      .eq('date', new Date().toISOString().slice(0, 10))
      .maybeSingle(),
    supabase
      .from('dr_daily_stats')
      .select('total_sessions')
      .eq('site_id', siteId)
      .eq('date', new Date(Date.now() - 86400000).toISOString().slice(0, 10))
      .maybeSingle(),
  ])

  const stats = (statsRes.data ?? []) as DailyRow[]

  // Grade totals across the window
  const totals = stats.reduce(
    (acc, r) => {
      acc.sessions += r.total_sessions
      acc.a += r.grade_a
      acc.b += r.grade_b
      acc.c += r.grade_c
      acc.d += r.grade_d
      acc.f += r.grade_f
      acc.x += r.grade_x
      if (r.avg_score != null) {
        acc.scoreSum += Number(r.avg_score) * r.total_sessions
        acc.scoreWeight += r.total_sessions
      }
      return acc
    },
    { sessions: 0, a: 0, b: 0, c: 0, d: 0, f: 0, x: 0, scoreSum: 0, scoreWeight: 0 },
  )

  const avgScore = totals.scoreWeight > 0
    ? Math.round((totals.scoreSum / totals.scoreWeight) * 10) / 10
    : 0

  const platforms: Record<string, number> = {}
  for (const r of (platformRes.data ?? []) as Array<{ ad_platform: string | null }>) {
    const k = r.ad_platform || 'direct'
    platforms[k] = (platforms[k] || 0) + 1
  }

  const referrerCounts: Record<string, number> = {}
  for (const r of (referrerRes.data ?? []) as Array<{ referrer: string | null }>) {
    const host = hostnameOf(r.referrer)
    if (!host) continue
    referrerCounts[host] = (referrerCounts[host] || 0) + 1
  }
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([host, count]) => ({ host, count }))

  const todaySessions = (todayRes.data as { total_sessions?: number } | null)?.total_sessions ?? 0
  const yesterdaySessions = (yesterdayRes.data as { total_sessions?: number } | null)?.total_sessions ?? 0

  return NextResponse.json({
    ok: true,
    days,
    daily: stats,
    totals: {
      sessions: totals.sessions,
      gradeA: totals.a,
      gradeB: totals.b,
      gradeC: totals.c,
      gradeD: totals.d,
      gradeF: totals.f,
      gradeX: totals.x,
      avgScore,
    },
    todaySessions,
    yesterdaySessions,
    platforms,
    topReferrers,
  })
}

function hostnameOf(ref: string | null): string | null {
  if (!ref) return null
  try {
    return new URL(ref).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
