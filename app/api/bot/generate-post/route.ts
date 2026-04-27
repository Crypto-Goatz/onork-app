import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { scoreContent } from '@/lib/vpis/formula'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const VIBE_STYLE = `WRITING RULES:
1. Short sentences. Each line stands alone.
2. Zero corporate vocabulary: never use leverage, synergy, stakeholder, utilize, robust, innovative, cutting-edge, game-changer
3. Casual certainty — confident without hype
4. No hashtags. No external links in the post body.
5. End with a specific question directed at practitioners — not "thoughts?"
6. Use numbers, dollar amounts, and time references for specificity`

const HOOK_STYLES: Record<string, string> = {
  absolute_declaration: 'Start with a bold, declarative statement. No qualifiers. "You are the integration layer."',
  bait_and_flip: 'Start with something that sounds like one thing, then flip it. "I used to think X. Then I realized Y."',
  specificity: 'Start with an extremely specific number or data point. "$4,280 in revenue from one API call."',
  question: 'Start with a provocative question. "What happens when your CRM goes down at 2am?"',
  pattern_interrupt: 'Start with something unexpected. Break the scroll pattern. "Stop. Read this before you install anything."',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: config } = await admin.from('bot_config').select('*').eq('user_id', user.id).single()
  const body = await req.json()
  const { topic, hook_archetype = 'bait_and_flip', product_mention = 'moderate' } = body

  const hookGuide = HOOK_STYLES[hook_archetype] || HOOK_STYLES.bait_and_flip

  const mentionGuide: Record<string, string> = {
    aggressive: 'Mention 0nmcp specifically with a concrete capability (1,554 tools, one MCP install). Include 0nmcp.com.',
    moderate: 'Reference "the orchestration layer" or "connecting AI tools" and mention 0nmcp naturally. Include 0nmcp.com if natural.',
    subtle: 'Focus on the problem. Only mention 0nmcp if completely natural.',
    none: 'Do not mention any specific product.',
  }

  const prompt = `${VIBE_STYLE}

Write a LinkedIn post about: ${topic}

Hook style: ${hookGuide}

${mentionGuide[product_mention] || mentionGuide.moderate}

${config?.target_keywords?.length ? `Keywords to weave in: ${config.target_keywords.join(', ')}` : ''}
${config?.icp_description ? `Target audience: ${config.icp_description}` : ''}

Return ONLY the post text. No intro, no explanation, no quotation marks.`

  // Generate with Groq (NEVER Anthropic in production)
  let bestText = ''
  let bestScores: Awaited<ReturnType<typeof scoreContent>> | null = null
  const maxRewrites = 3

  for (let i = 0; i <= maxRewrites; i++) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a LinkedIn content writer. Follow the rules exactly.' },
            { role: 'user', content: i === 0 ? prompt : `${prompt}\n\nPrevious version scored ${bestScores?.composite}/100. Rewrite to score higher. Strengthen the hook and make the closing question more specific.` },
          ],
          temperature: 0.7 + (i * 0.05),
          max_tokens: 1000,
        }),
      })

      if (!groqRes.ok) break
      const data = await groqRes.json()
      const text = data.choices?.[0]?.message?.content?.replace(/^["']|["']$/g, '').trim() || ''
      if (!text) break

      const scores = await scoreContent(text, 'post', { targetKeywords: config?.target_keywords })

      if (!bestScores || scores.adjusted_score > bestScores.adjusted_score) {
        bestText = text
        bestScores = scores
      }

      // If score is good enough, stop rewriting
      if (scores.adjusted_score >= 85) break
    } catch { break }
  }

  if (!bestText || !bestScores) {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }

  // Save to queue
  const { data: queued, error: dbErr } = await admin.from('bot_queue').insert({
    user_id: user.id,
    content_type: 'post',
    content_text: bestText,
    vpis_score: bestScores.adjusted_score,
    hook_score: bestScores.hook,
    emotion_score: bestScores.emotion,
    platform_score: bestScores.platform,
    viral_score: bestScores.viral,
    specificity_score: bestScores.specificity,
    structure_score: bestScores.structure,
    keywords_score: bestScores.keywords,
    cta_score: bestScores.cta,
    patterns_fired: bestScores.patterns_fired,
    hook_archetype,
    product_mention,
    status: 'pending_approval',
  }).select().single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ queue_id: queued?.id, text: bestText, scores: bestScores, status: 'pending_approval' })
}
