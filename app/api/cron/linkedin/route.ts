// GET /api/cron/linkedin — Daily LinkedIn content engine
// Called by Vercel cron at 6am ET (configurable)
// Generates VPIS-scored posts for all active users, queues for approval or auto-publishes
//
// Cron config in vercel.json:
// { "path": "/api/cron/linkedin", "schedule": "0 10 * * 2,3,4" }
// (10:00 UTC = 6am ET on Tue/Wed/Thu)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Array<{ user_id: string; status: string; queue_id?: string; score?: number }> = []

  try {
    // Get all users with bot settings that have auto or manual post generation enabled
    const { data: users } = await supabase
      .from('bot_settings')
      .select('user_id, auto_post_enabled, emergency_pause, target_vpis_score, content_pillars, icp_description, value_prop, brand_voice')
      .eq('emergency_pause', false)

    if (!users?.length) {
      return NextResponse.json({ message: 'No active users', results: [] })
    }

    for (const user of users) {
      try {
        // Check daily limit (max 1 auto-generated post per day)
        const today = new Date().toISOString().split('T')[0]
        const { count } = await supabase
          .from('bot_queue')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.user_id)
          .gte('created_at', `${today}T00:00:00Z`)
          .eq('content_type', 'post')

        if ((count || 0) >= 1) {
          results.push({ user_id: user.user_id, status: 'skipped_daily_limit' })
          continue
        }

        // Pick a topic from content pillars or default
        const pillars = user.content_pillars || ['AI automation', 'workflow optimization', 'tool integration']
        const topic = pillars[Math.floor(Math.random() * pillars.length)]

        // Pick a hook archetype randomly
        const archetypes = ['absolute_declaration', 'bait_and_flip', 'specificity_spike', 'authority_contrast', 'confession_contrast']
        const hookArchetype = archetypes[Math.floor(Math.random() * archetypes.length)]

        // Generate via the linkedin-bot API
        const genRes = await fetch(`${SITE_URL}/api/linkedin-bot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-post',
            topic,
            hook_archetype: hookArchetype,
            icp_context: user.icp_description || '',
            value_prop: user.value_prop || '',
            brand_voice: user.brand_voice || 'vibe',
            target_score: user.target_vpis_score || 85,
          }),
        })

        const genData = await genRes.json()

        if (!genData.queue_id) {
          results.push({ user_id: user.user_id, status: 'generation_failed' })
          continue
        }

        // Tag with user_id
        await supabase.from('bot_queue')
          .update({ user_id: user.user_id })
          .eq('id', genData.queue_id)

        const score = genData.scores?.adjusted_score || 0

        // If auto-post enabled and score above threshold, schedule auto-publish
        if (user.auto_post_enabled && score >= (user.target_vpis_score || 85)) {
          // Auto-publish after 15 minute approval window
          // Fire-and-forget — the auto-publish endpoint handles the rest
          setTimeout(async () => {
            try {
              await fetch(`${SITE_URL}/api/linkedin-bot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'auto-publish',
                  queue_id: genData.queue_id,
                  user_id: user.user_id,
                  auto_approve_threshold: user.target_vpis_score || 85,
                }),
              })
            } catch {}
          }, 15 * 60 * 1000) // 15 minutes

          results.push({ user_id: user.user_id, status: 'generated_auto_scheduled', queue_id: genData.queue_id, score })
        } else {
          results.push({ user_id: user.user_id, status: 'generated_pending_approval', queue_id: genData.queue_id, score })
        }
      } catch (err) {
        results.push({ user_id: user.user_id, status: `error: ${(err as Error).message}` })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
