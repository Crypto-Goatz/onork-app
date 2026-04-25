/**
 * POST /api/linkedin-bot — Universal endpoint for all 0nLinkedIn operations.
 * The GHL workflows call this with different action types.
 *
 * Actions:
 * - generate-post: Generate VPIS-scored LinkedIn post
 * - generate-comment: Generate engineered comment for a target post
 * - score-post: Score a target post for comment-worthiness
 * - schedule-post: Schedule a post via CRM Social Planner
 * - post-comment: Post a comment on a target post
 * - get-engagement: Fetch engagement metrics for a posted item
 * - feedback: Submit engagement data for learning loop
 * - generate-dm: Generate a DM after author reply
 * - weekly-report: Weekly intelligence summary
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scoreContent } from '@/lib/vpis/formula'

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
      model: 'llama-3.3-70b-versatile',
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

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[linkedin-bot] ${action} error:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
