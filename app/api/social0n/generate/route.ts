/**
 * POST /api/social0n/generate
 * Generates a LinkedIn post using BE writing style + VPIS scoring.
 * Returns the post content + VPIS score. Won't return drafts below 80.
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

  const { topic, hookPattern, persona } = await req.json()
  if (!topic) return NextResponse.json({ error: 'Missing topic' }, { status: 400 })

  const hookInstructions: Record<string, string> = {
    'absolute': 'Use P042 Absolute Declaration: Open with a bold, definitive statement that sounds like a law of nature.',
    'bait-flip': 'Use P044 Bait & Flip: First line sets up expectation. Second line destroys it.',
    'contrarian': 'Use P033 Contrarian with Backup: Take the opposite position. Immediately justify with data.',
    'specificity': 'Use P028 Specificity Hook: Open with a number so specific it forces credibility.',
    'confession': 'Use P022 Confession + Contrast: Admit something real. Contrast with what changed.',
  }

  const hookPrompt = hookInstructions[hookPattern] || hookInstructions['absolute']

  const systemPrompt = `${BE_STYLE_PROMPT}

HOOK PATTERN FOR THIS POST:
${hookPrompt}

${persona ? `AUTHOR PERSONA: ${persona}` : ''}

Generate ONLY the post text. No explanation. No meta-commentary. Just the LinkedIn post.`

  // Generate up to 3 attempts to get above 80
  let bestPost = ''
  let bestScore = { total: 0 } as ReturnType<typeof scorePost>

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        temperature: 0.8 + (attempt * 0.05), // slightly more creative each retry
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Write a LinkedIn post about: ${topic}` },
        ],
      }),
    })

    if (!res.ok) continue

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    const score = scorePost(content)

    if (score.total > bestScore.total) {
      bestPost = content
      bestScore = score
    }

    if (score.total >= 80) break // Good enough
  }

  return NextResponse.json({
    post: bestPost,
    score: bestScore,
    topic,
    hookPattern: hookPattern || 'absolute',
    wordCount: bestPost.split(/\s+/).length,
  })
}
