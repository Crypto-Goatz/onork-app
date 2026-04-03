import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

// POST /api/brand/extract — AI-powered brand extraction from URL
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, text } = await req.json()

  if (!ANTHROPIC_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
  }

  const prompt = url
    ? `Search for the brand at ${url} and return ONLY raw JSON (no markdown, no code fences) with these fields: name, tagline, description, founded, phone, primary_color (hex), secondary_color (hex), accent_color (hex), background_color (hex), text_color (hex), display_font, body_font, logo_primary_url, logo_icon_url, services (array of {name, description, price, price_type}). If you can't find a field, use null.`
    : `Extract brand data from this text and return ONLY raw JSON (no markdown, no code fences) with these fields: name, tagline, description, founded, phone, primary_color (hex), secondary_color (hex), accent_color (hex), background_color (hex), text_color (hex), display_font, body_font, logo_primary_url, logo_icon_url, services (array of {name, description, price, price_type}). If you can't find a field, use null.\n\nText:\n${(text || '').slice(0, 5000)}`

  try {
    const body: Record<string, unknown> = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }

    // Enable web search for URL mode
    if (url) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `AI error: ${res.status}`, details: err }, { status: 502 })
    }

    const data = await res.json()
    const txt = data.content
      ?.filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('') || ''

    const match = txt.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: 'Could not extract brand data', raw: txt }, { status: 422 })
    }

    const parsed = JSON.parse(match[0])
    return NextResponse.json({ brand: parsed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
