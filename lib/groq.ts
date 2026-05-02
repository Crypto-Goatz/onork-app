/**
 * Groq client with automatic key fallback.
 *
 * If GROQ_API_KEY returns 401 (revoked / wrong account), retry once with
 * GROQ_API_KEY_FALLBACK before surfacing the error. Every other failure mode
 * (rate limit, model error, network) propagates immediately so callers can
 * decide what to do.
 *
 * Used by:
 *   - /api/reports/run         (Ultimate Report Builder)
 *   - /api/reports/synthesize  (cross-scan summarization)
 *   - any future scanner that wants LLM reasoning
 */

const GROQ_BASE = 'https://api.groq.com/openai/v1'

export type GroqModel =
  | 'llama-3.3-70b-versatile' // synthesis, default
  | 'llama-3.1-8b-instant'    // entity extraction, classifications
  | 'llama-3.1-70b-versatile' // legacy alias

export interface GroqChatRequest {
  model: GroqModel | string
  system?: string
  user: string
  temperature?: number
  max_tokens?: number
  json?: boolean
  /**
   * Optional explicit API key. When present, this key is used INSTEAD of
   * env vars and no env-var fallback is attempted. Use this for the
   * per-user bring-your-own-key path resolved via lib/groq/router.ts.
   */
  apiKey?: string
}

export interface GroqChatResult {
  text: string
  raw: unknown
  keyUsed: 'primary' | 'fallback'
}

function getKeys(): { primary: string; fallback: string } {
  return {
    primary: process.env.GROQ_API_KEY ?? '',
    fallback: process.env.GROQ_API_KEY_FALLBACK ?? '',
  }
}

/**
 * Single chat completion. Tries primary first, falls back on 401 only.
 *
 * @throws Error when both keys fail or when neither is configured.
 */
export async function groqChat(req: GroqChatRequest): Promise<GroqChatResult> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []
  if (req.system) messages.push({ role: 'system', content: req.system })
  messages.push({ role: 'user', content: req.user })

  const body: Record<string, unknown> = {
    model: req.model,
    messages,
    temperature: req.temperature ?? 0.4,
    max_tokens: req.max_tokens ?? 4000,
  }
  if (req.json) {
    body.response_format = { type: 'json_object' }
  }

  // ── Per-call key override (BYO via lib/groq/router.ts) ──
  if (req.apiKey) {
    const out = await callGroq(req.apiKey, body)
    if (out.ok) {
      return { text: out.text, raw: out.raw, keyUsed: 'primary' }
    }
    throw new Error(`Groq ${out.status}: ${out.errorMessage}`)
  }

  const { primary, fallback } = getKeys()
  if (!primary && !fallback) {
    throw new Error('Groq not configured — set GROQ_API_KEY or GROQ_API_KEY_FALLBACK.')
  }

  // Try primary
  if (primary) {
    const out = await callGroq(primary, body)
    if (out.ok) {
      return { text: out.text, raw: out.raw, keyUsed: 'primary' }
    }
    if (out.status !== 401) {
      throw new Error(`Groq ${out.status}: ${out.errorMessage}`)
    }
    // 401 → fall through to fallback
  }

  if (fallback) {
    const out = await callGroq(fallback, body)
    if (out.ok) {
      return { text: out.text, raw: out.raw, keyUsed: 'fallback' }
    }
    throw new Error(`Groq fallback ${out.status}: ${out.errorMessage}`)
  }

  throw new Error('Primary Groq key invalid and no GROQ_API_KEY_FALLBACK configured.')
}

async function callGroq(
  key: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; text: string; raw: unknown; errorMessage: string }> {
  try {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errBody = await res.text()
      let msg = errBody.slice(0, 200)
      try {
        const parsed = JSON.parse(errBody)
        msg = parsed?.error?.message || msg
      } catch {
        // not JSON — keep the truncated text
      }
      return { ok: false, status: res.status, text: '', raw: null, errorMessage: msg }
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content ?? ''
    return { ok: true, status: 200, text: content, raw: data, errorMessage: '' }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      text: '',
      raw: null,
      errorMessage: err instanceof Error ? err.message : 'unknown network error',
    }
  }
}

/**
 * Convenience wrapper that parses JSON output. Returns null on parse failure
 * so callers can decide whether to retry.
 */
export async function groqJson<T = unknown>(req: GroqChatRequest): Promise<T | null> {
  const result = await groqChat({ ...req, json: true })
  try {
    return JSON.parse(result.text) as T
  } catch {
    return null
  }
}
