/**
 * Groq tool-calls wrapper.
 *
 * Uses OpenAI-compatible chat completions on Groq's endpoint with
 * openai/gpt-oss-120b. Tools are registered via the OpenAI tool-call
 * schema, NOT via free-text [ACTION:] parsing.
 *
 * The caller passes:
 *   - messages: full conversation
 *   - tools: tool catalog (subset of automation surface, gated by config)
 *
 * The model returns either content (a reply to send), or tool_calls
 * (structured JSON the caller dispatches via lib/jaxx/tools).
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  name?: string
  tool_call_id?: string
  tool_calls?: GroqToolCall[]
}

export interface GroqToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string
  }
}

export interface GroqToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export interface GroqResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    message: GroqMessage
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface CompletionArgs {
  systemPrompt: string
  messages: GroqMessage[]
  tools?: GroqToolDef[]
  toolChoice?: 'auto' | 'none'
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface CompletionResult {
  content: string | null
  toolCalls: GroqToolCall[]
  promptTokens: number
  completionTokens: number
  latencyMs: number
  model: string
  finishReason: string
}

export async function completion(args: CompletionArgs): Promise<CompletionResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY missing')

  const model = args.model || DEFAULT_MODEL
  const messages: GroqMessage[] = [
    { role: 'system', content: args.systemPrompt },
    ...args.messages,
  ]

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: args.temperature ?? 0.4,
    max_tokens: args.maxTokens ?? 1024,
  }

  if (args.tools && args.tools.length > 0) {
    body.tools = args.tools
    body.tool_choice = args.toolChoice ?? 'auto'
  }

  // Groq's on-demand tier caps this key at 8k TPM (x-ratelimit-limit-tokens). When a course
  // generation issues several lessons in a row, the bucket throttles and
  // returns 429 with a `retry-after` header (seconds). Honor it. Without
  // this loop, every paced lesson call still loses the race on the second
  // request because the bucket is already empty.
  //
  // Also retry transient 5xx (502/503/504) twice — those happen sporadically
  // and a short backoff usually clears them.
  const start = Date.now()
  let res: Response
  let attempts = 0
  const maxAttempts = 4
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempts++
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    if (res.ok) break

    const isRateLimit = res.status === 429
    const isTransient = res.status === 502 || res.status === 503 || res.status === 504
    if ((!isRateLimit && !isTransient) || attempts >= maxAttempts) break

    // retry-after may be a number of seconds OR an HTTP date. Groq returns
    // seconds (sometimes fractional). Cap to a sane ceiling.
    const ra = res.headers.get('retry-after') || ''
    let waitMs = 0
    const asNum = Number(ra)
    if (Number.isFinite(asNum) && asNum > 0) {
      waitMs = Math.min(asNum * 1000, 60_000)
    } else if (ra) {
      const t = Date.parse(ra)
      if (!Number.isNaN(t)) waitMs = Math.max(0, Math.min(t - Date.now(), 60_000))
    }
    if (waitMs <= 0) waitMs = isRateLimit ? 8_000 : 1_500
    // exponential backoff jitter for transient, additive for rate-limit
    if (isTransient) waitMs *= attempts
    waitMs = Math.min(waitMs, 60_000)

    // Drain the body so the connection can be reused.
    await res.text().catch(() => '')
    await new Promise<void>((r) => setTimeout(r, waitMs))
  }
  const latencyMs = Date.now() - start

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`groq ${res.status} after ${attempts} attempt(s): ${errBody.slice(0, 300)}`)
  }

  const data = (await res.json()) as GroqResponse
  const choice = data.choices?.[0]
  if (!choice) throw new Error('groq: no choice returned')

  return {
    content: choice.message.content ?? null,
    toolCalls: choice.message.tool_calls ?? [],
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
    latencyMs,
    model: data.model,
    finishReason: choice.finish_reason,
  }
}
