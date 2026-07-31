/**
 * Daily LinkedIn Post Generator — Cron
 * GET /api/cron/daily-post — generates posts for all active bot_configs
 * Schedule: defined in vercel.json — e.g. "0 12 * * *" (8am EST)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generatePost } from '@/lib/claude/post-writer'
import { canPost } from '@/lib/linkedin/rate-limiter'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function notifySlack(text: string) {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) return
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).catch(() => {})
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Load all active bot configs
  const { data: configs, error } = await admin
    .from('bot_settings')
    .select('*')
    .eq('active', true)

  if (error || !configs?.length) {
    return NextResponse.json({ message: 'No active bots', generated: 0 })
  }

  const results: Array<{ configId: string; name: string; status: string; vpis?: number; error?: string }> = []

  for (const config of configs) {
    try {
      const rl = await canPost(config.id)
      if (!rl.allowed) {
        results.push({ configId: config.id, name: config.name, status: 'skipped', error: rl.reason })
        continue
      }

      const result = await generatePost({
        niche: config.niche,
        tone: config.tone,
        icpKeywords: config.icp_keywords,
        icpTitles: config.icp_titles,
        icpIndustries: config.icp_industries,
        botConfigId: config.id,
        vpisTarget: config.vpis_target,
        postHourEST: config.post_time_hour,
      })

      const status = config.auto_approve ? 'approved' : 'pending_approval'
      await admin.from('bot_queue').insert({
        bot_config_id: config.id,
        user_id: config.user_id,
        type: 'post',
        content: result.content,
        vpis_score: result.vpis.composite,
        vpis_breakdown: result.vpis,
        hook_archetype: result.hook_archetype,
        rewrite_count: result.rewrite_count,
        status,
      })

      results.push({ configId: config.id, name: config.name, status, vpis: result.vpis.composite })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ configId: config.id, name: config.name, status: 'error', error: msg })
    }
  }

  const generated = results.filter(r => r.status !== 'error' && r.status !== 'skipped').length
  const errors = results.filter(r => r.status === 'error').length
  const avgVpis = results.filter(r => r.vpis).reduce((sum, r) => sum + (r.vpis ?? 0), 0) / (generated || 1)

  const shouldNotify = configs.some(c => c.slack_notify) || errors > 0
  if (shouldNotify) {
    const lines = [
      `*0nLinkedIn Daily Run* — ${new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' })}`,
      `Posts generated: ${generated} | Errors: ${errors} | Avg VPIS: ${Math.round(avgVpis)}`,
      ...results.map(r => `• ${r.name}: ${r.status}${r.vpis ? ` (VPIS ${r.vpis})` : ''}${r.error ? ` — ${r.error}` : ''}`),
    ]
    await notifySlack(lines.join('\n'))
  }

  return NextResponse.json({ generated, errors, results, avg_vpis: Math.round(avgVpis) })
}
