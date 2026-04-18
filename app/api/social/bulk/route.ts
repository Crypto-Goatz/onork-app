import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/social/bulk — AI-generate bulk posts from topics
// Takes a list of topics + schedule config, generates content, returns posts ready for CSV import
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    topics,
    tone = 'professional',
    postsPerTopic = 3,
    startDate,
    intervalHours = 24,
    hashtags = [],
    brand = '0nMCP',
  } = await req.json()

  if (!topics?.length) {
    return NextResponse.json({ error: 'topics array is required' }, { status: 400 })
  }

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const toneDesc: Record<string, string> = {
    professional: 'Professional, authoritative, data-driven.',
    casual: 'Casual, friendly, conversational.',
    'thought-leader': 'Visionary, insightful, challenges conventions.',
    hype: 'Energetic, exciting, uses strong CTAs and urgency.',
    educational: 'Informative, step-by-step, teaches something.',
  }

  const totalPosts = topics.length * postsPerTopic
  const prompt = `You are a world-class social media content strategist for ${brand}.

Generate ${totalPosts} unique social media posts across these topics:
${topics.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}

For each topic, create ${postsPerTopic} different posts with varied angles.

Tone: ${toneDesc[tone] || toneDesc.professional}
${hashtags.length ? `Include these hashtags where natural: ${hashtags.join(' ')}` : ''}

Each post should be:
- 100-280 characters (Twitter-friendly but works everywhere)
- Hook in the first line
- Include a CTA or question
- Mix formats: statements, questions, hot takes, tips, stats

RESPOND ONLY with valid JSON array:
[
  {
    "topic": "which topic this is for",
    "content": "the post text",
    "angle": "hook/question/tip/stat/hottake"
  }
]

Generate exactly ${totalPosts} posts.`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a social media content expert. Always respond with valid JSON arrays only. No markdown, no explanation.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 8000,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `AI generation failed: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    let responseText = data.choices?.[0]?.message?.content || ''

    // Parse JSON
    let posts: { topic: string; content: string; angle: string }[] = []
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        posts = JSON.parse(jsonMatch[0])
      }
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: responseText.slice(0, 500) }, { status: 502 })
    }

    // Add scheduling dates
    const baseDate = startDate ? new Date(startDate) : new Date(Date.now() + 24 * 60 * 60 * 1000) // tomorrow
    const scheduledPosts = posts.map((post, i) => {
      const scheduleDate = new Date(baseDate.getTime() + i * intervalHours * 60 * 60 * 1000)
      return {
        ...post,
        scheduleDate: scheduleDate.toISOString(),
        index: i,
      }
    })

    // Generate CSV
    const csvRows = ['summary,scheduleDate,status']
    for (const post of scheduledPosts) {
      const escaped = post.content.replace(/"/g, '""')
      csvRows.push(`"${escaped}","${post.scheduleDate}","scheduled"`)
    }

    return NextResponse.json({
      posts: scheduledPosts,
      csv: csvRows.join('\n'),
      total: scheduledPosts.length,
      startDate: baseDate.toISOString(),
      endDate: scheduledPosts[scheduledPosts.length - 1]?.scheduleDate,
      intervalHours,
    })
  } catch (err) {
    return NextResponse.json({
      error: `Generation failed: ${err instanceof Error ? err.message : 'Unknown'}`,
    }, { status: 500 })
  }
}
