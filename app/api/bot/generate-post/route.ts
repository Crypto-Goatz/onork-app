import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { generatePost } from '@/lib/claude/post-writer'
import { canPost } from '@/lib/linkedin/rate-limiter'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { bot_config_id } = body

  // Load bot config
  const { data: config, error: configErr } = await admin
    .from('bot_config')
    .select('*')
    .eq('id', bot_config_id)
    .eq('user_id', user.id)
    .single()

  if (configErr || !config) {
    return NextResponse.json({ error: 'Bot config not found' }, { status: 404 })
  }

  // Rate limit check
  const rl = await canPost(config.id)
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.reason, next_allowed_at: rl.next_allowed_at }, { status: 429 })
  }

  // Generate post
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

  // Save to queue as pending_approval
  const { data: queueItem, error: queueErr } = await admin
    .from('bot_queue')
    .insert({
      bot_config_id: config.id,
      user_id: user.id,
      type: 'post',
      content: result.content,
      vpis_score: result.vpis.composite,
      vpis_breakdown: result.vpis,
      hook_archetype: result.hook_archetype,
      rewrite_count: result.rewrite_count,
      status: config.auto_approve ? 'approved' : 'pending_approval',
    })
    .select()
    .single()

  if (queueErr) {
    return NextResponse.json({ error: 'Failed to save to queue' }, { status: 500 })
  }

  return NextResponse.json({
    queue_item: queueItem,
    vpis: result.vpis,
    hook_archetype: result.hook_archetype,
    rewrite_count: result.rewrite_count,
    auto_approved: config.auto_approve,
  })
}
