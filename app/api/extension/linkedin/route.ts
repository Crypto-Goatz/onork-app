import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

/**
 * POST /api/extension/linkedin
 * LinkedIn Snip & Reply — uses Anthropic with web_search to read LinkedIn posts
 * This is the ONE exception to "Groq only" — Groq cannot do web search.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Allow bearer token from extension
  if (!user) {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!ANTHROPIC_KEY) {
    return NextResponse.json({ error: 'Anthropic API not configured' }, { status: 500 })
  }

  const { url, mode = 'comment', persona = '' } = await req.json()

  if (!url) {
    return NextResponse.json({ error: 'Missing URL or post text' }, { status: 400 })
  }

  const modeInstructions: Record<string, string> = {
    comment: `Write a SHORT public LinkedIn comment (2-3 punchy paragraphs max).
- Open with a genuine insight or empathetic observation — NEVER pitch
- Subtly signal authority through the way you frame the problem
- End with one open question or statement that invites a reply or DM
- Sound like a real human, not AI copy`,

    dm: `Write a LinkedIn DM (4-5 sentences MAX).
- Reference a specific detail from their post so they know you read it
- Connect their stated pain to a direction — without selling anything
- Sound warm, direct, peer-to-peer — not salesy
- End with ONE low-friction conversational question`,

    post: `Write MY OWN LinkedIn post (150-200 words) inspired by their post.
- Do NOT mention the original author or their post directly
- Take their observation and elevate it with a fresh angle or contrarian POV
- Strong opening hook (first line must stop the scroll)
- Short punchy paragraphs — no walls of text
- End with a thought-provoking question to drive engagement`,
  }

  const systemPrompt = `You are an expert LinkedIn ghostwriter and B2B consultant.

Your writing rules:
- Sounds like a sharp human, never like AI
- Never opens with "I" — hook first
- Never pitches or mentions services in opening
- Leads with insight, empathy, or a contrarian angle
- Concise and punchy — LinkedIn is not a blog
- Creates natural curiosity that invites conversation

Return ONLY valid JSON. No markdown. No preamble. No explanation.`

  const userPrompt = `Use web_search to fetch and read the LinkedIn post at this URL:
${url}

After reading the post content:
1. Identify: the author's name, their core argument or pain point
2. Generate a response in this mode: ${(mode || 'comment').toUpperCase()}

Mode instructions:
${modeInstructions[mode] || modeInstructions.comment}

${persona ? `My consulting persona (use to inform positioning — do NOT pitch it directly):\n"${persona}"` : ''}

Return ONLY this JSON:
{
  "author": "author name extracted from the post",
  "hook": "one sentence summary of their core point",
  "response": "the exact LinkedIn text ready to copy-paste"
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: errData.error?.message || `Anthropic error: ${res.status}` },
        { status: 502 }
      )
    }

    const data = await res.json()

    // Get the last text block (appears after web_search tool use blocks)
    const textBlock = [...(data.content || [])].reverse().find((b: any) => b.type === 'text')
    if (!textBlock?.text) {
      return NextResponse.json({ error: 'Could not read the post — LinkedIn may require login' }, { status: 422 })
    }

    // Parse JSON from response
    try {
      const clean = textBlock.text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
      const parsed = JSON.parse(clean)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ author: '', hook: '', response: textBlock.text })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
