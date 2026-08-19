import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GROQ_KEY = process.env.GROQ_API_KEY

/**
 * POST /api/extension/generate
 * AI content generation for the 0nCore Chrome Extension
 * Auth: Bearer token (Supabase session) or extension token
 */
export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null

  if (!user) {
    // Try bearer token from extension
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // For now, allow any bearer token — will add proper extension token validation later
  }

  if (!GROQ_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
  }

  const { prompt, system, max_tokens = 800 } = await req.json()

  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }

  const messages = []
  if (system) {
    messages.push({ role: 'system' as const, content: system })
  } else {
    messages.push({
      role: 'system' as const,
      content: 'You are 0nCore AI — a content generation engine for LinkedIn, X, Reddit, email, and blogs. Write for the specified platform. Be direct, human, and valuable. Never start with "Great post" or use filler. Return content only.',
    })
  }
  messages.push({ role: 'user' as const, content: prompt })

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        messages,
        temperature: 0.7,
        max_tokens,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `AI error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ content })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
