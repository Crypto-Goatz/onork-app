import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are 0nAI, the business operating system. Execute first, confirm second. Keep responses under 3 sentences. Never say GHL.

You have access to 1,171 tools across 54 services through the 0nMCP orchestration engine. You can score leads, send emails, manage pipelines, build automations, generate courses, and run any business task.

When asked to do something, act decisively. You are not an assistant — you are the AI that runs their business.`

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history } = await req.json()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  // Build conversation messages
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
  ]

  // Include conversation history if provided (last 20 messages max)
  if (Array.isArray(history)) {
    const recent = history.slice(-20)
    for (const msg of recent) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content })
      }
    }
  }

  messages.push({ role: 'user', content: message })

  // Try Groq API pool
  const pool = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(',').filter(Boolean)

  if (pool.length > 0) {
    const key = pool[Math.floor(Math.random() * pool.length)].trim()
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 2048,
          messages,
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text) {
          return NextResponse.json({
            response: text,
            source: 'groq',
            model: 'llama-3.3-70b',
          })
        }
      }
    } catch (err) {
      console.error('[ai/chat] Groq error:', err instanceof Error ? err.message : err)
    }
  }

  // Fallback: smart response
  return NextResponse.json({
    response: 'I\'m ready to help run your business. Connect a Groq API key to unlock full AI responses, or ask me about what I can do.',
    source: 'fallback',
  })
}
