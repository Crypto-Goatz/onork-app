/**
 * POST /api/linkedin-bot — Universal endpoint for all 0nLinkedIn operations.
 * The GHL workflows call this with different action types.
 *
 * Actions:
 * - register-account: Provision a bot_config row + return api_key
 * - generate-post: Generate VPIS-scored LinkedIn post
 * - generate-comment: Generate engineered comment for a target post
 * - score-post: Score a target post for comment-worthiness
 * - schedule-post: Schedule a post via CRM Social Planner
 * - post-comment: Queue a comment for the Chrome extension to dispatch
 * - get-engagement: Fetch engagement metrics for a posted item
 * - feedback: Submit engagement data for learning loop
 * - generate-dm: Generate a DM after author reply
 * - weekly-report: Weekly intelligence summary
 * - publish / auto-publish / approve / crm-sync / status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { scoreContent } from '@/lib/vpis/formula'
import { postToLinkedIn, isLinkedInReady } from '@/lib/linkedin-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function groqGenerate(system: string, user: string): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: 1500,
    }),
  })
  if (!res.ok) throw new Error(`Groq error: ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

const VIBE_RULES = `Short sentences. Each line stands alone. Zero corporate vocabulary (never: leverage, synergy, stakeholder, utilize, robust, innovative, cutting-edge, game-changer). Casual certainty. No hashtags. No links in post body. End with specific practitioner question (never "thoughts?" or "agree?"). Use numbers, dollar amounts, time references.`

export async function POST(req: NextRequest) {
  // Verify API key
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  // For now, accept any valid 0n_ token or the service key
  // TODO: validate against user's subscription tier

  const body = await req.json()
  const action = body.action || req.nextUrl.searchParams.get('action') || 'generate-post'

  try {
    switch (action) {
      case 'generate-post': {
        const { topic, hook_archetype, icp_context, value_prop, brand_voice, target_keywords, target_score = 85 } = body

        const hookGuide: Record<string, string> = {
          absolute_declaration: 'Start with a bold, declarative statement. No qualifiers.',
          bait_and_flip: 'Start with something that sounds like one thing, then flip it.',
          specificity_spike: 'Start with an extremely specific number or data point.',
          authority_contrast: 'Contrast what experts say vs what actually works.',
          confession_contrast: 'Confess something unexpected, then pivot to insight.',
        }

        let bestText = ''
        let bestScores: Awaited<ReturnType<typeof scoreContent>> | null = null

        for (let i = 0; i < 3; i++) {
          const text = await groqGenerate(
            `You are a LinkedIn content writer. ${VIBE_RULES}`,
            `Write a LinkedIn post about: "${topic || 'AI automation'}"\nHook style: ${hookGuide[hook_archetype] || hookGuide.bait_and_flip}\n${icp_context ? `Audience: ${icp_context}` : ''}\n${value_prop ? `Value prop: ${value_prop}` : ''}\n${target_keywords ? `Keywords: ${target_keywords}` : ''}\nReturn ONLY the post text.`,
          )

          const scores = await scoreContent(text, 'post', { targetKeywords: target_keywords?.split(',').map((k: string) => k.trim()) })

          if (!bestScores || scores.adjusted_score > bestScores.adjusted_score) {
            bestText = text
            bestScores = scores
          }
          if (scores.adjusted_score >= target_score) break
        }

        // Save to queue
        const { data: queued } = await supabase.from('bot_queue').insert({
          content_type: 'post', content_text: bestText,
          vpis_score: bestScores?.adjusted_score, hook_score: bestScores?.hook,
          emotion_score: bestScores?.emotion, platform_score: bestScores?.platform,
          viral_score: bestScores?.viral, specificity_score: bestScores?.specificity,
          structure_score: bestScores?.structure, keyword_score: bestScores?.keywords,
          cta_score: bestScores?.cta, patterns_fired: bestScores?.patterns_fired,
          hook_archetype, status: 'pending_approval',
        }).select('id').single()

        return NextResponse.json({
          queue_id: queued?.id, post_text: bestText, scores: bestScores,
        })
      }

      case 'generate-comment': {
        const { target_post_text, target_post_author, icp_score, product_mention, icp_context, value_prop } = body

        const mentionGuide: Record<string, string> = {
          aggressive: 'Reference 0nmcp specifically. Include 0nmcp.com.',
          moderate: 'Reference "the orchestration layer" naturally.',
          subtle: 'Pure value add. No product mention.',
        }

        const text = await groqGenerate(
          `You write LinkedIn comments. ${VIBE_RULES} Add a SECOND FLIP — agree with their thesis, extend to a layer they missed. Reference something SPECIFIC from their post. Sound like a peer, not a fan. 100-180 words. End with a question about their PROCESS.`,
          `Post by ${target_post_author}:\n---\n${target_post_text}\n---\n${mentionGuide[product_mention] || mentionGuide.moderate}\n${icp_context ? `Our audience: ${icp_context}` : ''}\n${value_prop ? `Our value prop: ${value_prop}` : ''}\nReturn ONLY the comment text.`,
        )

        const scores = await scoreContent(text, 'comment')

        return NextResponse.json({ comment_text: text, scores })
      }

      case 'score-post': {
        const { post_text, post_url, post_author } = body
        const scores = await scoreContent(post_text || '', 'post')

        // Determine timing
        const postAge = body.post_age_hours || 0
        const timing = postAge < 2 ? 'POST_NOW' : postAge < 6 ? 'GOOD' : postAge < 12 ? 'AGING' : 'TOO_OLD'

        // ICP scoring (simplified)
        const icpKeywords = ['mcp', 'claude', 'ai', 'automation', 'workflow', 'crm', 'saas', 'founder']
        const lower = (post_text || '').toLowerCase()
        const icpMatches = icpKeywords.filter(k => lower.includes(k)).length
        const icpScore = Math.min(100, icpMatches * 15 + 20)

        return NextResponse.json({
          vpis_score: scores.adjusted_score, icp_score: icpScore,
          timing_status: timing, hook_archetype: scores.patterns_fired[0] || 'unknown',
          patterns_fired: scores.patterns_fired,
        })
      }

      case 'feedback': {
        const { queue_id, predicted_score, actual_score, score_delta, likes, comments, shares, impressions, patterns_fired, hook_archetype } = body

        await supabase.from('bot_engagement').insert({
          queue_id, predicted_score, actual_engagement_score: actual_score,
          score_delta, likes, comments: comments, reposts: shares, impressions,
        })

        // Feed into federated learning
        await supabase.from('k_social_federated').insert({
          location_id: body.location_id || 'direct',
          content_type: 'post', vpis_score: predicted_score,
          hook_archetype, patterns_fired,
          likes, comments, shares, impressions,
          engagement_rate: impressions > 0 ? (likes + comments * 3 + shares * 2) / impressions : 0,
          predicted_vs_actual_delta: score_delta,
        })

        return NextResponse.json({ recorded: true })
      }

      case 'generate-dm': {
        const { author_name, author_title, original_comment, author_reply, icp_context } = body

        const dm = await groqGenerate(
          `You write brief, peer-level LinkedIn DMs. Never salesy. Never mention features. Just connect as a human. 2-3 sentences max.`,
          `${author_name} (${author_title}) replied to your comment on their post.\nYour comment: "${original_comment}"\nTheir reply: "${author_reply}"\n${icp_context ? `Context: ${icp_context}` : ''}\nWrite a brief DM that continues the conversation naturally. Do NOT pitch anything. Just be human.`,
        )

        return NextResponse.json({ dm_text: dm })
      }

      case 'weekly-report': {
        const { account_id, week_ending } = body

        // Get this week's data
        const weekStart = new Date(week_ending)
        weekStart.setDate(weekStart.getDate() - 7)

        const { data: posts } = await supabase.from('bot_queue')
          .select('vpis_score, hook_archetype, patterns_fired, status')
          .eq('status', 'posted')
          .gte('created_at', weekStart.toISOString())

        const { data: engagement } = await supabase.from('bot_engagement')
          .select('predicted_score, actual_engagement_score, score_delta')
          .gte('measured_at', weekStart.toISOString())

        const { data: weights } = await supabase.from('vpis_formula_weights')
          .select('version, mean_absolute_error')
          .eq('is_active', true)
          .single()

        const avgActual = engagement?.length
          ? engagement.reduce((s, e) => s + (Number(e.actual_engagement_score) || 0), 0) / engagement.length
          : 0

        return NextResponse.json({
          posts_count: posts?.length || 0,
          avg_actual_score: Math.round(avgActual),
          formula_version: weights?.version || 1,
          mean_absolute_error: weights?.mean_absolute_error || 0,
          top_patterns: 'Analysis pending — need more data',
          bottom_patterns: 'Analysis pending — need more data',
        })
      }

      case 'publish': {
        // Publish an approved post to LinkedIn using the user's own OAuth token
        const { queue_id, user_id } = body

        if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

        // Get the post from queue
        const { data: post } = await supabase.from('bot_queue')
          .select('content_text, content_type, status')
          .eq('id', queue_id)
          .single()

        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        if (post.status !== 'approved' && post.status !== 'pending_approval') {
          return NextResponse.json({ error: `Post is ${post.status}, not approved` }, { status: 400 })
        }

        // Post to LinkedIn
        const result = await postToLinkedIn(user_id, post.content_text)

        if (result.success) {
          // Update queue status
          await supabase.from('bot_queue')
            .update({ status: 'posted', posted_at: new Date().toISOString() })
            .eq('id', queue_id)

          return NextResponse.json({
            success: true,
            post_id: result.postId,
            message: 'Posted to LinkedIn successfully',
          })
        }

        return NextResponse.json({ success: false, error: result.error }, { status: 502 })
      }

      case 'auto-publish': {
        // Auto-publish: checks score threshold + user setting, publishes if eligible
        // Called by cron or after approval timeout
        const { queue_id, user_id, auto_approve_threshold = 85 } = body
        if (!user_id || !queue_id) return NextResponse.json({ error: 'user_id and queue_id required' }, { status: 400 })

        const { data: post } = await supabase.from('bot_queue')
          .select('content_text, content_type, vpis_score, status')
          .eq('id', queue_id)
          .single()

        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        if (post.status !== 'pending_approval') return NextResponse.json({ skipped: true, reason: `Status is ${post.status}` })
        if ((post.vpis_score || 0) < auto_approve_threshold) return NextResponse.json({ skipped: true, reason: `Score ${post.vpis_score} below threshold ${auto_approve_threshold}` })

        // Check kill switch
        const { data: settings } = await supabase.from('bot_settings')
          .select('auto_post_enabled, auto_comment_enabled, emergency_pause')
          .eq('user_id', user_id)
          .single()

        if (settings?.emergency_pause) return NextResponse.json({ skipped: true, reason: 'Emergency pause active' })
        if (post.content_type === 'post' && !settings?.auto_post_enabled) return NextResponse.json({ skipped: true, reason: 'Auto-post disabled' })
        if (post.content_type === 'comment' && !settings?.auto_comment_enabled) return NextResponse.json({ skipped: true, reason: 'Auto-comment disabled' })

        // Publish
        const result = await postToLinkedIn(user_id, post.content_text)
        if (result.success) {
          await supabase.from('bot_queue')
            .update({ status: 'posted', posted_at: new Date().toISOString() })
            .eq('id', queue_id)

          // Push to CRM pipeline
          await pushToCRMPipeline(user_id, queue_id, post, 'Posted')

          return NextResponse.json({ success: true, post_id: result.postId, auto_published: true })
        }
        return NextResponse.json({ success: false, error: result.error }, { status: 502 })
      }

      case 'approve': {
        // Manual approve + optional immediate publish
        const { queue_id, user_id, publish_now = false } = body
        if (!queue_id) return NextResponse.json({ error: 'queue_id required' }, { status: 400 })

        await supabase.from('bot_queue')
          .update({ status: 'approved', approved_at: new Date().toISOString() })
          .eq('id', queue_id)

        if (publish_now && user_id) {
          const { data: post } = await supabase.from('bot_queue')
            .select('content_text, content_type, vpis_score')
            .eq('id', queue_id)
            .single()

          if (post) {
            const result = await postToLinkedIn(user_id, post.content_text)
            if (result.success) {
              await supabase.from('bot_queue')
                .update({ status: 'posted', posted_at: new Date().toISOString() })
                .eq('id', queue_id)
              await pushToCRMPipeline(user_id, queue_id, post, 'Posted')
              return NextResponse.json({ approved: true, published: true, post_id: result.postId })
            }
            return NextResponse.json({ approved: true, published: false, error: result.error })
          }
        }

        return NextResponse.json({ approved: true })
      }

      case 'get-engagement': {
        // Pull engagement data for a posted item
        const { queue_id } = body

        const { data: post } = await supabase.from('bot_queue')
          .select('content_text, vpis_score, posted_at, linkedin_post_id')
          .eq('id', queue_id)
          .single()

        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

        // Check if we already have engagement data
        const { data: existing } = await supabase.from('bot_engagement')
          .select('likes, comments, reposts, impressions, actual_engagement_score')
          .eq('queue_id', queue_id)
          .single()

        if (existing) {
          return NextResponse.json({
            likes: existing.likes, comments: existing.comments,
            shares: existing.reposts, impressions: existing.impressions,
            actual_score: existing.actual_engagement_score,
            predicted_score: post.vpis_score,
            delta: (post.vpis_score || 0) - (existing.actual_engagement_score || 0),
          })
        }

        // No engagement data yet — return predicted only
        return NextResponse.json({
          likes: 0, comments: 0, shares: 0, impressions: 0,
          actual_score: null, predicted_score: post.vpis_score,
          delta: null, message: 'Engagement data not yet collected',
        })
      }

      case 'crm-sync': {
        // Sync a queue item to CRM pipeline as an opportunity
        const { queue_id, user_id, stage = 'Pending Approval' } = body
        if (!queue_id || !user_id) return NextResponse.json({ error: 'queue_id and user_id required' }, { status: 400 })

        const { data: post } = await supabase.from('bot_queue')
          .select('content_text, content_type, vpis_score, hook_archetype, patterns_fired, status')
          .eq('id', queue_id)
          .single()

        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        await pushToCRMPipeline(user_id, queue_id, post, stage)
        return NextResponse.json({ synced: true })
      }

      case 'status': {
        // Check if LinkedIn is connected for a user
        const { user_id } = body
        if (!user_id) {
          // Try to get from session
          const serverSupabase = await createServerClient()
          const { data: { session } } = await serverSupabase.auth.getSession()
  const user = session?.user ?? null
          if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          const status = await isLinkedInReady(user.id)
          return NextResponse.json(status)
        }

        const status = await isLinkedInReady(user_id)
        return NextResponse.json(status)
      }

      case 'register-account': {
        const {
          user_id, ghl_location_id, icp_description, value_prop,
          target_keywords, brand_voice, tier = 'starter',
        } = body
        if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

        const apiKey = `0n_${crypto.randomUUID().replace(/-/g, '')}`

        const { data, error } = await supabase.from('bot_settings').upsert({
          user_id,
          location_id: ghl_location_id || null,
          icp_description: icp_description || null,
          value_prop: value_prop || null,
          target_keywords: Array.isArray(target_keywords)
            ? target_keywords
            : (target_keywords ? String(target_keywords).split(',').map((k: string) => k.trim()) : []),
          brand_voice: brand_voice || null,
          tier,
          api_key: apiKey,
        }, { onConflict: 'user_id' }).select('id, api_key, tier').single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({
          status: 'registered',
          bot_config_id: data.id,
          api_key: data.api_key,
          tier: data.tier,
        })
      }

      case 'schedule-post': {
        const { queue_id, linkedin_account_id, post_text, scheduled_time, location_id } = body
        if (!queue_id || !linkedin_account_id || !post_text) {
          return NextResponse.json({ error: 'queue_id, linkedin_account_id, post_text required' }, { status: 400 })
        }

        const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT_ROCKETOPP
        const locId = location_id || process.env.CRM_LOCATION_ID
        if (!pit || !locId) return NextResponse.json({ error: 'CRM credentials not configured' }, { status: 500 })

        const scheduleAt = scheduled_time || new Date().toISOString()

        const ghlRes = await fetch(
          `https://services.leadconnectorhq.com/social-media-posting/${locId}/posts`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${pit}`,
              'Content-Type': 'application/json',
              Version: '2021-07-28',
            },
            body: JSON.stringify({
              type: 'post',
              accountIds: [linkedin_account_id],
              summary: post_text.slice(0, 200),
              content: post_text,
              scheduleDate: scheduleAt,
              status: 'scheduled',
            }),
          },
        )

        const ghlData = await ghlRes.json().catch(() => ({}))
        if (!ghlRes.ok) {
          return NextResponse.json(
            { error: 'CRM scheduling failed', status: ghlRes.status, detail: ghlData },
            { status: 502 },
          )
        }

        const ghlPostId = ghlData?.postId || ghlData?.id || ghlData?.post?.id || null

        await supabase.from('bot_queue').update({
          status: 'scheduled',
          crm_post_id: ghlPostId,
          scheduled_at: scheduleAt,
        }).eq('id', queue_id)

        return NextResponse.json({ status: 'scheduled', ghl_post_id: ghlPostId, scheduled_at: scheduleAt })
      }

      case 'post-comment': {
        const { target_post_url, comment_text, linkedin_account_id, user_id, bot_config_id } = body
        if (!target_post_url || !comment_text) {
          return NextResponse.json({ error: 'target_post_url and comment_text required' }, { status: 400 })
        }
        if (!user_id || !bot_config_id) {
          return NextResponse.json({ error: 'user_id and bot_config_id required' }, { status: 400 })
        }

        // CRM Social Planner doesn't post comments — queue for Chrome extension dispatch
        const { data, error } = await supabase.from('bot_queue').insert({
          user_id,
          bot_config_id,
          content_type: 'comment',
          content_text: comment_text,
          target_post_url,
          linkedin_post_id: linkedin_account_id || null,
          status: 'pending_dispatch',
        }).select('id').single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ status: 'queued', comment_id: data.id })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[linkedin-bot] ${action} error:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── CRM Pipeline Sync ──
async function pushToCRMPipeline(
  userId: string,
  queueId: string,
  post: { content_text: string; content_type: string; vpis_score?: number; hook_archetype?: string; patterns_fired?: string[] },
  stage: string,
) {
  const CRM_BASE = 'https://services.leadconnectorhq.com'
  const PIT = process.env.CRM_PIT_RAW || process.env.CRM_PIT_ROCKETOPP
  const LOCATION = process.env.CRM_LOCATION_ID
  if (!LOCATION) return

  if (!PIT) return

  const headers = {
    Authorization: `Bearer ${PIT}`,
    'Content-Type': 'application/json',
    Version: '2021-07-28',
  }

  try {
    // Get content queue pipeline
    const pipeRes = await fetch(`${CRM_BASE}/opportunities/pipelines?locationId=${LOCATION}`, { headers })
    const pipeData = await pipeRes.json()
    const contentPipeline = pipeData?.pipelines?.find((p: { name: string }) => p.name?.includes('Content Queue'))
    if (!contentPipeline) return

    const targetStage = contentPipeline.stages?.find((s: { name: string }) => s.name === stage)
    if (!targetStage) return

    // Create or update opportunity
    await fetch(`${CRM_BASE}/opportunities/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        locationId: LOCATION,
        pipelineId: contentPipeline.id,
        pipelineStageId: targetStage.id,
        name: `${post.content_type === 'post' ? 'Post' : 'Comment'} — VPIS ${post.vpis_score || '?'} — ${new Date().toLocaleDateString()}`,
        status: 'open',
        customFields: [
          { key: 'post_text', field_value: post.content_text?.slice(0, 500) },
          { key: 'vpis_score', field_value: String(post.vpis_score || 0) },
          { key: 'content_type', field_value: post.content_type },
          { key: 'hook_archetype', field_value: post.hook_archetype || '' },
          { key: 'patterns_fired', field_value: post.patterns_fired?.join(', ') || '' },
          { key: 'content_status', field_value: stage.toLowerCase().replace(' ', '_') },
        ],
      }),
    })
  } catch (err) {
    console.warn('[linkedin-bot] CRM sync failed:', err)
  }
}
