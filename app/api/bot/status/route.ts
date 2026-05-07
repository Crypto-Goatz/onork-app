import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { nextPostTime } from '@/lib/linkedin/rate-limiter'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const botConfigId = searchParams.get('bot_config_id')

  // Load bot config(s) for this user
  const configQuery = admin
    .from('bot_config')
    .select('id, name, active, vpis_target')
    .eq('user_id', user.id)

  if (botConfigId) configQuery.eq('id', botConfigId)

  const { data: configs } = await configQuery

  if (!configs?.length) {
    return NextResponse.json({ configs: [], queue_depth: 0 })
  }

  const configIds = configs.map(c => c.id)

  // Queue depth
  const { count: pendingCount } = await admin
    .from('bot_queue')
    .select('id', { count: 'exact', head: true })
    .in('bot_config_id', configIds)
    .eq('status', 'pending_approval')

  // Recent published (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: publishedWeek } = await admin
    .from('bot_queue')
    .select('id', { count: 'exact', head: true })
    .in('bot_config_id', configIds)
    .eq('status', 'published')
    .gte('published_at', weekAgo)

  // Avg VPIS from last 20 posts
  const { data: recentVpis } = await admin
    .from('bot_queue')
    .select('vpis_score')
    .in('bot_config_id', configIds)
    .not('vpis_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20)

  const avgVpis = recentVpis?.length
    ? Math.round(recentVpis.reduce((sum, r) => sum + (r.vpis_score ?? 0), 0) / recentVpis.length)
    : null

  // Next fire time per active config
  const nextFireTimes: Record<string, string | null> = {}
  for (const cfg of configs.filter(c => c.active)) {
    const t = await nextPostTime(cfg.id)
    nextFireTimes[cfg.id] = t?.toISOString() ?? null
  }

  return NextResponse.json({
    configs: configs.map(c => ({
      ...c,
      next_fire_at: nextFireTimes[c.id] ?? null,
    })),
    queue_depth: pendingCount ?? 0,
    published_this_week: publishedWeek ?? 0,
    avg_vpis_score: avgVpis,
  })
}
