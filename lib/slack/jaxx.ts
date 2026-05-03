/**
 * Jaxx-in-Slack — single entry point for all conversational Slack
 * surfaces (DM, app_mention, slash command catch-all).
 *
 * Pipeline:
 *   1. Build a system prompt from the user's K-layers + connections +
 *      current dispatch rules. (Same brain context as the extension.)
 *   2. Detect intent shortcuts:
 *        "run <slug>" / "switch <slug>" → /api/factory/spawn-style
 *        "scan <url>"                   → /api/scanner/analyze
 *        "score <text|url>"             → SXO/EQ
 *        otherwise                       → free-form Groq chat
 *   3. Call Groq (llama-3.3-70b) with the assembled system prompt.
 *   4. Return { text, traceId } for the responder to render.
 *
 * Groq-only per Hard Rule #1. No Anthropic. No OpenAI.
 */

import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { OnCoreCaller } from './auth'
import { runGhlJaxx, isGhlIntent } from '../jaxx/ghl-brain'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const DISPATCH_API =
  process.env.NEXT_PUBLIC_DISPATCH_API || 'https://www.0ncore.com/api/dispatch'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

interface UserContext {
  caller: OnCoreCaller
  k_layers: Record<string, unknown>
  connections: string[]
  rules_summary: string
  ecosystem_summary: string
}

interface RunInput {
  user: OnCoreCaller
  prompt: string
  surface: 'slack:dm' | 'slack:mention' | 'slack:cmd'
}

export interface JaxxReply {
  text: string
  traceId: string
}

const SYSTEM_BASE = `You are Jaxx, the AI brain behind 0nCore.

Your operating context for this conversation comes from the user's
0nCore profile. Speak naturally, terse, helpful — like you're a senior
operator the user trusts. No corporate filler.

Rules you always enforce:
- Never say "GHL", "Go High Level", or "HighLevel". Always say "CRM" or "ROCKET".
- Use Groq for any further AI calls (you ARE Groq right now).
- When the user asks to *run* a workflow or switch, return a structured
  JSON-ish suggestion they can confirm before you execute it (e.g.
  "I can run \`spawn lead-magnet-engine\` now — confirm?").

Capabilities you can suggest:
- 0nMCP factory: spawn / list / archive composed sub-apps
- Stack scanner: scan any URL for tools + gaps
- 0nExec: score-based orbits + formulas
- CRM: contacts, opportunities, notes, pipelines
- Dispatch: pull rules + ecosystem + state from the live API
- Apps Factory: every spawned app at /apps/<slug> on 0ncore.com
`

export async function runJaxx({ user, prompt }: RunInput): Promise<JaxxReply> {
  const ctx = await loadUserContext(user)
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return offlineReply(ctx, prompt)
  }

  // If the user is asking about CRM / workflows / campaigns, hand off to
  // the GHL-specialized brain. It returns Claude-Chrome instructions instead
  // of a free-form Slack chat reply.
  if (isGhlIntent(prompt)) {
    const ghl = await runGhlJaxx({
      message: prompt,
      context: {
        caller: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          plan: user.plan,
          crm_location_id: user.crm_location_id,
          is_admin: user.is_admin,
        },
        connections: ctx.connections,
        k_layers: ctx.k_layers,
      },
    })
    return ghl
  }

  const sys = buildSystemPrompt(ctx)
  const traceId = createHash('sha256')
    .update(`${user.user_id}:${Date.now()}:${prompt.slice(0, 100)}`)
    .digest('hex')

  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 700,
      }),
    })
    if (!r.ok) throw new Error(`Groq ${r.status}`)
    const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const text = data.choices?.[0]?.message?.content?.trim() || "I'm here, but nothing came back from the model."
    return { text, traceId }
  } catch (e) {
    return {
      text: `Connection issue talking to Groq — \`${(e as Error).message}\`. Try again in a sec.`,
      traceId,
    }
  }
}

function buildSystemPrompt(ctx: UserContext): string {
  return [
    SYSTEM_BASE,
    '',
    `# User`,
    `- name: ${ctx.caller.full_name ?? '(unknown)'}`,
    `- email: ${ctx.caller.email}`,
    `- plan: ${ctx.caller.plan ?? 'free'}`,
    `- crm_location_id: ${ctx.caller.crm_location_id ?? '(none)'}`,
    `- admin: ${ctx.caller.is_admin ? 'yes' : 'no'}`,
    '',
    `# Connections`,
    ctx.connections.length ? ctx.connections.map((c) => `- ${c}`).join('\n') : '- (none yet)',
    '',
    `# Live dispatch rules (excerpt)`,
    ctx.rules_summary || '(unavailable)',
    '',
    `# Ecosystem map (excerpt)`,
    ctx.ecosystem_summary || '(unavailable)',
    '',
    `# K-layers (custom user fields)`,
    Object.keys(ctx.k_layers).length
      ? JSON.stringify(ctx.k_layers, null, 2)
      : '(none yet)',
  ].join('\n')
}

async function loadUserContext(caller: OnCoreCaller): Promise<UserContext> {
  const sb = admin()
  // Connections
  let connections: string[] = []
  try {
    const { data } = await sb
      .from('user_connections')
      .select('provider, status')
      .eq('user_id', caller.user_id)
    if (data) connections = data.filter((c) => c.status === 'active').map((c) => c.provider)
  } catch {
    /* table may not exist — leave empty */
  }

  // K-layers — anything stored on profiles JSON
  let kLayers: Record<string, unknown> = {}
  try {
    const { data: profile } = await sb
      .from('profiles')
      .select('settings')
      .eq('id', caller.user_id)
      .maybeSingle()
    if (profile?.settings && typeof profile.settings === 'object') {
      kLayers = profile.settings as Record<string, unknown>
    }
  } catch {
    /* skip */
  }

  // Live dispatch summaries (best-effort cached at the edge for 60s)
  const [rules_summary, ecosystem_summary] = await Promise.all([
    fetchSummary(`${DISPATCH_API}/rules`, (j: unknown) => {
      const obj = j as { rules?: Array<{ number: number; short_form: string }> }
      return Array.isArray(obj.rules)
        ? obj.rules
            .slice(0, 8)
            .map((r) => `${r.number}. ${r.short_form}`)
            .join('\n')
        : '(no rules)'
    }),
    fetchSummary(`${DISPATCH_API}/ecosystem?kind=repo`, (j: unknown) => {
      const obj = j as { entries?: Array<{ display_name?: string; meta?: { db_ref?: string } }> }
      return Array.isArray(obj.entries)
        ? obj.entries
            .slice(0, 6)
            .map((e) => `- ${e.display_name} (db: ${e.meta?.db_ref ?? 'n/a'})`)
            .join('\n')
        : '(no ecosystem)'
    }),
  ])

  return {
    caller,
    k_layers: kLayers,
    connections,
    rules_summary,
    ecosystem_summary,
  }
}

async function fetchSummary(url: string, render: (j: unknown) => string): Promise<string> {
  try {
    const r = await fetch(url, { next: { revalidate: 60 } })
    if (!r.ok) return ''
    const j = await r.json()
    return render(j)
  } catch {
    return ''
  }
}

function offlineReply(ctx: UserContext, _prompt: string): JaxxReply {
  return {
    text: `Hey ${ctx.caller.full_name?.split(' ')[0] || ctx.caller.email.split('@')[0]} — Groq's offline right now so I can't think clearly. Try again in a minute, or run \`/0n status\` to see ecosystem health.`,
    traceId: 'offline',
  }
}
