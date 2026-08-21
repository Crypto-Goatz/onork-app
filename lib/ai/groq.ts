/**
 * Groq client for the AI Agent engine.
 *
 * Critical Rule #6 — Groq for ALL production AI calls. Model selection
 * lives in bot_settings; we read it lazily and fall back to
 * openai/gpt-oss-120b (the spec default).
 */

import { createClient } from '@supabase/supabase-js'
import { recordAiUsage } from '@/lib/billing/ai-meter'

const GROQ_BASE = 'https://api.groq.com/openai/v1'
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GroqCallResult {
  text: string
  model: string
  prompt_tokens?: number
  completion_tokens?: number
  latency_ms: number
}

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Read bot_settings.ai_chat_model if configured; otherwise fall back to the
 * spec default. Critical Rule #1 — never hardcode the model in the chat
 * endpoint itself.
 */
export async function resolveChatModel(): Promise<string> {
  try {
    const { data } = await adminSupabase()
      .from('bot_settings')
      .select('value')
      .eq('key', 'ai_chat_model')
      .maybeSingle()
    const v = (data?.value as string | undefined)?.trim()
    if (v) return v
  } catch {
    // bot_settings may not have this row yet — fall through.
  }
  return DEFAULT_MODEL
}

function getApiKey(): string {
  const pool = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(',').filter(Boolean)
  if (pool.length === 0) return ''
  if (pool.length === 1) return pool[0].trim()
  return pool[Math.floor(Math.random() * pool.length)].trim()
}

export async function groqCall(
  messages: ChatMessage[],
  opts: {
    model?: string
    maxTokens?: number
    temperature?: number
    /** Metering context — see lib/billing/ai-meter.ts. */
    surface?: string
    companyId?: string | null
    locationId?: string | null
    userId?: string | null
  } = {},
): Promise<GroqCallResult> {
  const key = getApiKey()
  if (!key) throw new Error('Groq not configured — set GROQ_API_KEY or GROQ_API_KEYS.')

  const model = opts.model || (await resolveChatModel())
  const started = Date.now()

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.4,
    }),
    signal: AbortSignal.timeout(45000),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content ?? ''
  const result: GroqCallResult = {
    text,
    model,
    prompt_tokens: data?.usage?.prompt_tokens,
    completion_tokens: data?.usage?.completion_tokens,
    latency_ms: Date.now() - started,
  }

  // This function already had the token counts and the latency and threw them
  // away on every call. Recording them costs nothing extra and is the whole
  // reason a price can be worked out later instead of guessed.
  await recordAiUsage({
    surface: opts.surface || 'ai-agent-engine',
    model,
    provider: 'groq',
    companyId: opts.companyId,
    locationId: opts.locationId,
    userId: opts.userId,
    promptTokens: result.prompt_tokens ?? null,
    completionTokens: result.completion_tokens ?? null,
    latencyMs: result.latency_ms,
  })

  return result
}
