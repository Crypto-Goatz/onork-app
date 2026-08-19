/**
 * Tiny Groq JSON helper. All Service Packager generators use this to call
 * openai/gpt-oss-120b and get a structured JSON response with one
 * stricter retry on parse failure.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

async function rawCall(messages: GroqMessage[], temperature = 0.4, maxTokens = 4096): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY missing')

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: maxTokens }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Groq ${res.status}: ${errBody.slice(0, 300)}`)
  }
  const data = (await res.json()) as { choices?: Array<{ message: { content: string } }> }
  return data.choices?.[0]?.message?.content ?? ''
}

/**
 * Call Groq with a system + user prompt and parse JSON. One stricter retry
 * on parse failure.
 */
export async function groqJSON<T>(systemPrompt: string, userPrompt: string, opts?: { temperature?: number; maxTokens?: number }): Promise<T> {
  const t = opts?.temperature ?? 0.4
  const max = opts?.maxTokens ?? 4096
  const first = await rawCall(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    t,
    max
  )

  try {
    return JSON.parse(stripFences(first)) as T
  } catch {
    // Retry with stricter instruction
    const retry = await rawCall(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: first },
        {
          role: 'user',
          content: 'That was not valid JSON. Return ONLY the JSON object — no prose, no markdown fences, no comments.',
        },
      ],
      0.2,
      max
    )
    return JSON.parse(stripFences(retry)) as T
  }
}

/**
 * Plain text completion (for landing page copy, descriptions, etc. when
 * we just want markdown back).
 */
export async function groqText(systemPrompt: string, userPrompt: string, opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
  return rawCall(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    opts?.temperature ?? 0.5,
    opts?.maxTokens ?? 2048
  )
}
