/**
 * /api/ai/chat — 3-layer AI Agent endpoint.
 *
 * Per docs/0ncore-ai-agent-architecture.md:
 *   1. Resolve agent + active packs for the locationId.
 *   2. Build the system prompt (Layer 1 + Layer 2 + Layer 3).
 *   3. Append conversation history + new user message.
 *   4. Call Groq (openai/gpt-oss-120b by default; configurable via bot_settings).
 *   5. Parse [ACTION:...] declarations off the front of the reply.
 *   6. Execute / record actions.
 *   7. Persist conversation + return { response, actions, conversationId }.
 *
 * Critical Rule #6 — Groq only (no Anthropic SDK in production paths).
 * Critical Rule #2 — action identifiers are snake_case; non-allowlisted
 * action declarations are dropped.
 * Critical Rule #1 — model + behavior knobs come from bot_settings, not
 * literals.
 */

import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { buildSystemPrompt } from '@/lib/ai/prompt'
import { activeActionSet } from '@/lib/ai/k-layers/packs'
import { groqCall, type ChatMessage } from '@/lib/ai/groq'
import { parseActions, executeActions } from '@/lib/ai/actions'
import {
  getOrCreateAgent,
  getActivePacks,
  getOrCreateConversation,
  appendConversation,
  logAction,
} from '@/lib/ai/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const HISTORY_LIMIT = 20

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { locationId?: string; message?: string; conversationId?: string; channel?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const locationId = body.locationId?.trim()
  const message = body.message?.trim()
  const channel = (body.channel?.trim() || 'admin').toLowerCase()
  const incomingConversationId = body.conversationId?.trim() || null

  if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })

  // 1. Resolve agent + active packs
  const agent = await getOrCreateAgent(locationId)
  const activePacks = await getActivePacks(locationId)

  // 2. Build the 3-layer system prompt
  const systemPrompt = buildSystemPrompt({ agent, activePacks })

  // 3. Load conversation history
  const conversation = await getOrCreateConversation(locationId, incomingConversationId, channel, user.id)
  const recentHistory = conversation.messages.slice(-HISTORY_LIMIT)

  const userTs = new Date().toISOString()
  const userMessage: ChatMessage = { role: 'user', content: message }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    userMessage,
  ]

  // 4. Call Groq
  let groqResult
  try {
    groqResult = await groqCall(messages)
  } catch (err) {
    return NextResponse.json(
      {
        error: 'groq_unavailable',
        message: err instanceof Error ? err.message : 'Groq call failed',
      },
      { status: 502 },
    )
  }

  // 5. Parse actions
  const allowed = activeActionSet(activePacks)
  const { actions: parsed, reply } = parseActions(groqResult.text, allowed)
  const finalReply = reply || groqResult.text

  // 6. Execute actions (Phase 1 stubs — recorded for future routing)
  const executed = await executeActions(parsed, {
    locationId,
    conversationId: conversation.id,
    logger: (row) => logAction(row),
  })

  // 7. Persist conversation
  const assistantTs = new Date().toISOString()
  await appendConversation(
    conversation.id,
    [
      { role: 'user', content: message, ts: userTs },
      { role: 'assistant', content: finalReply, ts: assistantTs },
    ],
    executed.map((a) => ({ ...a, ts: assistantTs })),
  )

  return NextResponse.json({
    response: finalReply,
    actions: executed,
    conversationId: conversation.id,
    activePacks,
    model: groqResult.model,
    usage: {
      prompt_tokens: groqResult.prompt_tokens,
      completion_tokens: groqResult.completion_tokens,
      latency_ms: groqResult.latency_ms,
    },
  })
}
