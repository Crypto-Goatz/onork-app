/**
 * One AI client for everything. Canonical copy: web0n/lib/ai/index.ts.
 *
 * Copied rather than imported because these are separate repos. If a third
 * place needs it, publish it instead of making a fourth copy — that is the
 * problem this file was written to end.
 *
 * WHY THIS EXISTS. The same Gemini→Groq fallback had been written four times —
 * website-builder, web0n-builder, web0n/lib/struktur/ai.ts, and the plan
 * configurator. Four copies of retry logic that drift, and when one of them
 * gets a model name wrong you find out from a customer.
 *
 * Vercel AI Gateway replaces the hand-rolled half: one OpenAI-compatible
 * endpoint, provider failover built in, no token markup, and spend visible in
 * one place. Since every one of these projects already deploys to Vercel, it is
 * a base-URL swap rather than a rewrite.
 *
 * THE PART THE GATEWAY DOES NOT SOLVE. It reaches Anthropic and OpenAI as
 * easily as Groq — `model: 'anthropic/…'` is one string away. The house rule is
 * Groq for production paths, and a rule that lives only in someone's memory
 * gets broken by the next person in a hurry. So the allow-list below is
 * enforced here, at the only door.
 */

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1'
const GROQ_URL = 'https://api.groq.com/openai/v1'

/**
 * Models a production path may use.
 *
 * Groq only, deliberately. Adding a provider here is a decision someone makes
 * on purpose, in a diff, rather than by typing a different string at a call
 * site. `xai/` is listed because Grok is the sanctioned fallback; Anthropic and
 * OpenAI are absent on purpose.
 */
export const ALLOWED_MODEL_PREFIXES = ['groq/', 'xai/'] as const

/** What callers ask for, by job rather than by model name. */
export type Job = 'fast' | 'reasoning' | 'json'

const MODEL_FOR: Record<Job, string> = {
  fast: process.env.AI_MODEL_FAST || 'groq/llama-3.3-70b-versatile',
  reasoning: process.env.AI_MODEL_REASONING || 'groq/llama-3.3-70b-versatile',
  json: process.env.AI_MODEL_JSON || 'groq/llama-3.3-70b-versatile',
}

export class DisallowedModelError extends Error {
  constructor(model: string) {
    super(
      `Model "${model}" is not on the allow-list. Production paths use Groq — ` +
        `see ALLOWED_MODEL_PREFIXES in lib/ai. Add a provider deliberately, not at a call site.`
    )
    this.name = 'DisallowedModelError'
  }
}

export function assertAllowed(model: string): void {
  if (!ALLOWED_MODEL_PREFIXES.some((p) => model.startsWith(p))) throw new DisallowedModelError(model)
}

export interface GenerateOptions {
  prompt: string
  system?: string
  /** Pick by job; `model` overrides and is still allow-list checked. */
  job?: Job
  model?: string
  temperature?: number
  json?: boolean
  maxTokens?: number
  signal?: AbortSignal
}

export interface GenerateResult {
  text: string
  model: string
  /** Which transport answered — a silent downgrade should be visible. */
  via: 'gateway' | 'groq-direct'
}

interface Transport {
  name: 'gateway' | 'groq-direct'
  url: string
  key: string
  /** Direct Groq wants the bare model id; the Gateway wants provider/model. */
  strip: boolean
}

/**
 * Gateway when configured, direct Groq otherwise.
 *
 * The direct path is not legacy cruft — it is what keeps this safe to adopt.
 * Switching every product onto a single new dependency with no way back is how
 * one outage becomes a total outage.
 */
function transports(): Transport[] {
  const out: Transport[] = []
  const gw = process.env.AI_GATEWAY_API_KEY
  if (gw) out.push({ name: 'gateway', url: GATEWAY_URL, key: gw, strip: false })
  const groq = process.env.GROQ_API_KEY
  if (groq) out.push({ name: 'groq-direct', url: GROQ_URL, key: groq, strip: true })
  return out
}

export function aiConfigured(): boolean {
  return transports().length > 0
}

export async function generate(o: GenerateOptions): Promise<GenerateResult> {
  const model = o.model || MODEL_FOR[o.job || 'fast']
  assertAllowed(model)

  const available = transports()
  if (!available.length) {
    throw new Error('No AI transport configured. Set AI_GATEWAY_API_KEY (preferred) or GROQ_API_KEY.')
  }

  const failures: string[] = []
  for (const t of available) {
    // Direct Groq does not understand the provider prefix the Gateway requires.
    const modelId = t.strip ? model.replace(/^[^/]+\//, '') : model
    try {
      const res = await fetch(`${t.url}/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${t.key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          temperature: o.temperature ?? 0.7,
          ...(o.maxTokens ? { max_tokens: o.maxTokens } : {}),
          ...(o.json ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            ...(o.system ? [{ role: 'system', content: o.system }] : []),
            { role: 'user', content: o.prompt },
          ],
        }),
        signal: o.signal ?? AbortSignal.timeout(45000),
      })

      if (!res.ok) {
        failures.push(`${t.name} ${res.status}: ${(await res.text()).slice(0, 140)}`)
        continue
      }
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content ?? ''
      if (!text) {
        failures.push(`${t.name}: empty response`)
        continue
      }
      return { text, model: modelId, via: t.name }
    } catch (err) {
      failures.push(`${t.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Name every transport that failed. "AI unavailable" sends someone hunting.
  throw new Error(`All AI transports failed — ${failures.join(' | ')}`)
}

/**
 * Parse a response that should be JSON.
 *
 * JSON mode is reliable most of the time, not always: a model that wraps its
 * answer in a ```json fence would otherwise throw a SyntaxError that reads to
 * the user as a broken feature.
 */
export function parseJson<T = unknown>(text: string): T {
  const raw = (text || '').trim()
  return JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) as T
}

/** Convenience for the common "give me JSON" call. */
export async function generateJson<T = unknown>(o: Omit<GenerateOptions, 'json'>): Promise<T> {
  const { text } = await generate({ ...o, job: o.job ?? 'json', json: true })
  return parseJson<T>(text)
}
