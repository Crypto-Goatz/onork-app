/**
 * Groq client for the 0nAI Engine — all AI generation uses
 * Groq with openai/gpt-oss-120b.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GroqOptions {
  temperature?: number
  maxTokens?: number
  json?: boolean
}

export async function groqChat(
  messages: GroqMessage[],
  options: GroqOptions = {}
): Promise<string> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY not configured')

  const { temperature = 0.7, maxTokens = 4096, json = false } = options

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}
