/**
 * GHL-specialized Jaxx brain.
 *
 * One job: turn a user's "I want to build X" brief into executable
 * Claude-Chrome instructions that build it directly in the CRM dashboard,
 * with 0nCore APIs embedded as Custom Code actions wherever they add
 * intelligence.
 *
 * Same Groq llama-3.3-70b-versatile call pattern as the existing Slack Jaxx.
 * Returns { text, traceId }.
 *
 * Hard rules enforced in the system prompt:
 *   - Never says GHL / Go High Level / HighLevel — always CRM or ROCKET.
 *   - Always Groq, never Anthropic / OpenAI in production paths.
 *   - Output is structured Claude-Chrome instructions.
 */

import { createHash } from 'node:crypto'
import { GHL_KNOWLEDGE } from './knowledge/ghl'
import { ONCORE_API_KNOWLEDGE } from './knowledge/0ncore-api'
import { PATTERNS_KNOWLEDGE } from './knowledge/patterns'
import { CHROME_PATTERNS_KNOWLEDGE } from './knowledge/chrome-patterns'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

export interface GhlBrainContext {
  caller?: {
    user_id?: string
    email?: string
    full_name?: string | null
    plan?: string | null
    crm_location_id?: string | null
    is_admin?: boolean
  }
  k_layers?: Record<string, unknown>
  connections?: string[]
}

export interface GhlBrainInput {
  message: string
  context?: GhlBrainContext
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface GhlBrainReply {
  text: string
  traceId: string
}

const HEADER = `You are Jaxx — the 0n AI workflow architect. You are an expert in
GoHighLevel (referred to as **CRM** or **ROCKET**, never GHL/GoHighLevel/High Level),
0nCore, and 0nMCP.

Your job: when the user describes what they want to build, you output step-by-step
Claude-Chrome instructions that build it directly in the CRM dashboard. Every
instruction is a specific browser action (click, type, select, navigate). The
instructions must be runnable verbatim by a Claude Chrome agent with no human
interpretation.

You know:
- Every CRM feature, trigger, action, and configuration option.
- Every 0nCore API endpoint and how to embed them as Custom Code in workflows.
- Every 0nMCP tool and how to chain them.
- Reusable campaign patterns (nurture sequences, lead scoring, content pipelines).
- How to structure tracking (trigger links, UTMs, tags, pixel events).

When generating workflow instructions:
- Always cite a starting pattern from the Patterns knowledge by name.
- Always include tracking (tags, trigger links, UTMs).
- Always include exit conditions (Goal step or End Workflow + tag).
- Always embed 0nCore API calls via Custom Code where they add intelligence
  (scoring, generation, scanning, recommendations).
- Always wrap Custom Code in try/catch with an error tag path.
- Always reference the Custom Value \`oncore_token\` for auth — never embed a
  literal token.
- Always structure for Claude Chrome execution:
   - SURFACE / PRECONDITIONS / STEPS / SUCCESS CHECK blocks.
   - Numbered steps; each step is one browser action.
   - UI labels in quotes.

Output format:
1. **Brief recap** — one sentence echoing what the user wants.
2. **Pattern** — which pattern from the Patterns knowledge you're starting from.
3. **Build plan** — bullet list of the major pieces (workflow name, triggers,
   custom values, custom fields, supporting assets).
4. **Claude Chrome instructions** — one or more SURFACE blocks with numbered
   steps. If multiple surfaces (e.g. Settings → Custom Values, then Workflows),
   emit one block per surface in the order they should be executed.
5. **Verification** — what the user should see when finished.

Do not invent CRM features. If the user asks for something the CRM cannot do
natively, say so and route it through 0nCore Custom Code or 0nMCP.

Never use the words "GHL", "Go High Level", "GoHighLevel", or "HighLevel".
Always say "CRM" or "ROCKET".`

const TRAILER_HINT = `If the user asks a non-build question (e.g. "what does X
trigger do?"), answer plainly without emitting a full instruction block. If the
user is mid-build and asks for a tweak, emit only the diff (the steps that
change). Default to terseness.`

export function buildGhlSystemPrompt(ctx?: GhlBrainContext): string {
  const blocks: string[] = [
    HEADER,
    '',
    GHL_KNOWLEDGE,
    '',
    ONCORE_API_KNOWLEDGE,
    '',
    PATTERNS_KNOWLEDGE,
    '',
    CHROME_PATTERNS_KNOWLEDGE,
    '',
    TRAILER_HINT,
  ]

  if (ctx?.caller) {
    blocks.push('')
    blocks.push('# Caller context')
    blocks.push(`- name: ${ctx.caller.full_name ?? '(unknown)'}`)
    blocks.push(`- email: ${ctx.caller.email ?? '(unknown)'}`)
    blocks.push(`- plan: ${ctx.caller.plan ?? 'free'}`)
    blocks.push(`- crm_location_id: ${ctx.caller.crm_location_id ?? '(none)'}`)
    blocks.push(`- admin: ${ctx.caller.is_admin ? 'yes' : 'no'}`)
  }

  if (ctx?.connections && ctx.connections.length > 0) {
    blocks.push('')
    blocks.push('# Connections')
    blocks.push(...ctx.connections.map((c) => `- ${c}`))
  }

  if (ctx?.k_layers && Object.keys(ctx.k_layers).length > 0) {
    blocks.push('')
    blocks.push('# K-layers (custom user fields)')
    blocks.push(JSON.stringify(ctx.k_layers, null, 2))
  }

  return blocks.join('\n')
}

export async function runGhlJaxx(input: GhlBrainInput): Promise<GhlBrainReply> {
  const groqKey = process.env.GROQ_API_KEY
  const traceId = createHash('sha256')
    .update(`ghl:${input.context?.caller?.user_id ?? 'anon'}:${Date.now()}:${input.message.slice(0, 100)}`)
    .digest('hex')

  if (!groqKey) {
    return {
      text: "Groq's offline right now so I can't think clearly. GROQ_API_KEY missing.",
      traceId,
    }
  }

  const system = buildGhlSystemPrompt(input.context)
  const messages = [
    { role: 'system', content: system },
    ...(input.history ?? []),
    { role: 'user', content: input.message },
  ]

  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 2400,
      }),
      cache: 'no-store',
    })

    if (!r.ok) {
      const errBody = await r.text().catch(() => '')
      throw new Error(`groq ${r.status}: ${errBody.slice(0, 200)}`)
    }

    const data = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text =
      data.choices?.[0]?.message?.content?.trim() ||
      "I'm here, but the model returned nothing."

    return { text, traceId }
  } catch (e) {
    return {
      text: `Connection issue talking to Groq — \`${(e as Error).message}\`. Try again in a sec.`,
      traceId,
    }
  }
}

/**
 * Heuristic intent detector — does this message want CRM/workflow build help?
 * Used by the Slack jaxx router to switch surfaces.
 */
export function isGhlIntent(message: string): boolean {
  const m = message.toLowerCase()
  const tokens = [
    'workflow',
    'workflows',
    'automation',
    'automations',
    'trigger',
    'campaign',
    'campaigns',
    'nurture',
    'sequence',
    'pipeline',
    'opportunity',
    'opportunities',
    'funnel',
    'landing page',
    'trigger link',
    'custom code',
    'custom field',
    'custom value',
    'custom values',
    'snapshot',
    'sub-account',
    'sub account',
    'subaccount',
    'crm',
    'rocket',
    'social planner',
    'reputation',
    'membership',
    'memberships',
    'course',
    'invoice',
    'invoices',
    'survey',
    'form submitted',
    'tag added',
    'pixel',
    'utm',
    'ghl', // user might still type it; we still route — we just don't reply with it
    'high level',
    'gohighlevel',
    'go high level',
    'highlevel',
  ]
  return tokens.some((t) => m.includes(t))
}
