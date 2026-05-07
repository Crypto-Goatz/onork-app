import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1'

export async function POST(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic, audience, moduleCount } = await req.json()
  if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

  const prompt = `Generate a complete online course structure as JSON.

Topic: ${topic}
Target audience: ${audience || 'business professionals'}
Number of modules: ${moduleCount || 5}
Lessons per module: 3-5

Return ONLY valid JSON in this exact format:
{
  "title": "Course Title",
  "description": "One paragraph course description",
  "modules": [
    {
      "title": "Module 1 Title",
      "lessons": ["Lesson 1 title", "Lesson 2 title", "Lesson 3 title"]
    }
  ]
}

Make the course practical, actionable, and immediately useful. Each lesson title should be specific and outcome-oriented, not vague. The course should progressively build skills from beginner to advanced.`

  try {
    // Try Ollama first
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: 'You are a course curriculum designer. Return ONLY valid JSON.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
        options: { temperature: 0.4, num_predict: 4096 },
        format: 'json',
      }),
      signal: AbortSignal.timeout(60000),
    }).catch(() => null)

    if (ollamaRes?.ok) {
      const data = await ollamaRes.json()
      const text = data.message?.content || ''
      try {
        const course = JSON.parse(text)
        return NextResponse.json({ course, provider: 'ollama' })
      } catch {}
    }

    // Try Groq (FREE cloud fallback)
    const groqPool = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(',').filter(Boolean)
    if (groqPool.length > 0) {
      const groqKey = groqPool[Math.floor(Math.random() * groqPool.length)].trim()
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a course curriculum designer. Return ONLY valid JSON. No markdown, no explanation.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 4096,
          temperature: 0.4,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(60000),
      }).catch(() => null)

      if (groqRes?.ok) {
        const data = await groqRes.json()
        const text = data.choices?.[0]?.message?.content || ''
        try {
          const course = JSON.parse(text)
          return NextResponse.json({ course, provider: 'groq' })
        } catch {}
      }
    }

    // Fallback: generate a template
    const modules = []
    const count = parseInt(String(moduleCount)) || 5
    for (let i = 0; i < count; i++) {
      modules.push({
        title: `Module ${i + 1}: ${topic} — Part ${i + 1}`,
        lessons: [
          `Introduction to ${topic} concepts (Part ${i + 1})`,
          `Hands-on exercise: applying ${topic}`,
          `Common mistakes and how to avoid them`,
          `Assessment and next steps`,
        ],
      })
    }

    return NextResponse.json({
      course: {
        title: `Mastering ${topic}`,
        description: `A comprehensive course on ${topic} designed for ${audience || 'professionals'}. ${count} modules with practical, actionable lessons you can implement immediately.`,
        modules,
      },
      provider: 'template',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
