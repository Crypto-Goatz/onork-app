/**
 * Groq tool-calls wrapper.
 *
 * Uses OpenAI-compatible chat completions on Groq's endpoint with
 * llama-3.3-70b-versatile. Tools are registered via the OpenAI tool-call
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
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

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

  const start = Date.now()
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const latencyMs = Date.now() - start

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`groq ${res.status}: ${errBody.slice(0, 300)}`)
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
