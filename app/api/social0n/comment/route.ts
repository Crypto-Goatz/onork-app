/**
 * POST /api/social0n/comment
 * Generates a LinkedIn comment using BE style + Flip Reframe technique.
 * Returns 3 variants scored by VPIS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scorePost, BE_STYLE_PROMPT } from '@/lib/social0n/vpis'

const GROQ_KEY = process.env.GROQ_API_KEY

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!GROQ_KEY) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })

  const { postContent, authorName, commentStyle, persona } = await req.json()
  if (!postContent) return NextResponse.json({ error: 'Missing post content' }, { status: 400 })

  const styleInstructions: Record<string, string> = {
    'flip-reframe': `Use the Flip Reframe technique:
1. Agree with the author's thesis
2. Extend it to a layer they didn't reach
3. Drop your value prop as the mechanism (subtle, not a pitch)
4. End with a question directed at the author`,

    'extend-thesis': `Extend the author's thesis:
1. Reference something SPECIFIC from their post (quote a phrase)
2. Add a data point or insight they missed
3. Share a brief related experience
4. Ask a follow-up question about their process`,

    'contrarian-respect': `Respectfully challenge one point:
1. Acknowledge the overall thesis is strong
2. Identify one angle that needs nuance
3. Provide specific evidence for your position
4. Ask if they've considered this angle`,

    'value-add': `Add pure value:
1. Share a specific framework, tool, or tactic related to their topic
2. Give the "how" they didn't include
3. Make it immediately actionable
4. End with how you've seen it work`,
  }

  const style = styleInstructions[commentStyle] || styleInstructions['flip-reframe']

  const systemPrompt = `You are generating a LinkedIn comment using the BE writing style.

COMMENT RULES:
- 100-200 words (surfaces to "Most Relevant")
- Adds a real insight the original post didn't reach
- References something SPECIFIC from the post (not generic praise)
- Contains substance — never just "Great post!"
- Ends with a question directed at the author
- No hashtags, no self-promotion without value first
- Short paragraphs, casual certainty, no corporate vocab

STYLE:
${style}

${persona ? `YOUR PERSONA: ${persona}` : ''}

ORIGINAL POST AUTHOR: ${authorName || 'the author'}

Generate ONLY the comment text. Nothing else.`

  // Generate 3 variants
  const variants: { text: string; score: ReturnType<typeof scorePost> }[] = []

  const temperatures = [0.7, 0.85, 0.95]
  for (const temp of temperatures) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
          reasoning_effort: 'low',
          max_tokens: 400,
          temperature: temp,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate a comment for this LinkedIn post:\n\n${postContent.slice(0, 2000)}` },
          ],
        }),
      })

      if (!res.ok) continue
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content || ''
      if (text) {
        variants.push({ text, score: scorePost(text) })
      }
    } catch { continue }
  }

  // Sort by VPIS score descending
  variants.sort((a, b) => b.score.total - a.score.total)

  return NextResponse.json({
    variants,
    postAuthor: authorName,
    commentStyle: commentStyle || 'flip-reframe',
  })
}
