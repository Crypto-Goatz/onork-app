import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GROQ_KEY = process.env.GROQ_API_KEY

// POST /api/brand/extract — AI brand extraction from URL (using Groq — FREE)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, text } = await req.json()

  if (!GROQ_KEY) {
    return NextResponse.json({ error: 'AI not configured (GROQ_API_KEY missing)' }, { status: 500 })
  }

  const prompt = url
    ? `You are a brand analyst. Based on your knowledge of the website at ${url}, extract brand information and return ONLY raw JSON (no markdown, no code fences) with these fields: name (string), tagline (string or null), description (string or null), phone (string or null), primary_color (hex string or null), secondary_color (hex string or null), accent_color (hex string or null), background_color (hex string or null), text_color (hex string or null), display_font (string or null), body_font (string or null), industry (string or null), services (array of {name, description} or empty array). Return ONLY the JSON object, nothing else.`
    : `Extract brand data from this text and return ONLY raw JSON (no markdown, no code fences) with these fields: name, tagline, description, phone, primary_color (hex), secondary_color (hex), accent_color (hex), background_color (hex), text_color (hex), display_font, body_font, industry, services (array of {name, description}). Return ONLY the JSON object.\n\nText:\n${(text || '').slice(0, 4000)}`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[Brand Extract] Groq error: ${res.status} — ${err.substring(0, 300)}`)
      return NextResponse.json({ error: `AI error: ${res.status}`, details: err.substring(0, 200) }, { status: 502 })
    }

    const data = await res.json()
    const txt = data.choices?.[0]?.message?.content || ''

    const match = txt.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: 'Could not extract brand data', raw: txt.substring(0, 500) }, { status: 422 })
    }

    const parsed = JSON.parse(match[0])
    return NextResponse.json({ brand: parsed })
  } catch (err: any) {
    console.error('[Brand Extract] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
