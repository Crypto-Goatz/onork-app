/**
 * 0nAI Engine — Main conversational API endpoint.
 *
 * Accepts dashboard requests (Supabase session) and external token requests.
 * Uses Groq (llama-3.3-70b-versatile) for ALL generation.
 * Multi-turn, K-layer aware, bridge-capable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { validateToken } from '@/lib/0n-token'
import { buildEngineContext } from '@/lib/engine/context'
import { buildSystemPrompt } from '@/lib/engine/prompt'
import {
  createConversation,
  getHistory,
  addMessage,
  getConversation,
  getRecentConversation,
} from '@/lib/engine/conversation'
import { groqChat, type GroqMessage } from '@/lib/engine/groq'
import { detectIntent } from '@/lib/engine/intent'

function getAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ---------------------------------------------------------------------------
// Auth resolution — supports Supabase session, Bearer token, webhook secret
// ---------------------------------------------------------------------------

interface AuthResult {
  userId: string
  locationId: string
}

async function resolveAuth(request: NextRequest): Promise<AuthResult | null> {
  // 1. Bearer token (0n_ prefix)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer 0n_')) {
    const token = authHeader.slice(7)
    const ctx = await validateToken(token)
    if (!ctx) return null

    // Resolve locationId from profile
    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('crm_location_id')
      .eq('id', ctx.userId)
      .single()

    return {
      userId: ctx.userId,
      locationId: profile?.crm_location_id || '',
    }
  }

  // 2. Webhook secret (CRM Agent Studio)
  const webhookSecret = request.headers.get('x-webhook-secret')
  if (webhookSecret && webhookSecret === process.env.ENGINE_WEBHOOK_SECRET) {
    const body = await request.clone().json()
    return {
      userId: body.userId || 'webhook',
      locationId: body.locationId || '',
    }
  }

  // 3. Supabase session (dashboard)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = getAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    locationId: profile?.crm_location_id || '',
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      message,
      conversationId: incomingConvId,
      securityLevel,
      persona = 'engine',
    } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const { userId, locationId } = auth

    // -------------------------------------------------------------------
    // 1. Resolve or create conversation
    // -------------------------------------------------------------------
    let conversationId = incomingConvId as string | undefined
    if (conversationId) {
      // Validate it belongs to this user
      const conv = await getConversation(conversationId)
      if (!conv || conv.user_id !== userId) {
        conversationId = undefined
      }
    }

    if (!conversationId) {
      // Try to resume the most recent conversation (within last 30 min)
      const recent = await getRecentConversation(userId, locationId)
      if (recent) {
        const age = Date.now() - new Date(recent.last_message_at).getTime()
        if (age < 30 * 60 * 1000) {
          conversationId = recent.id
        }
      }
    }

    if (!conversationId) {
      conversationId = await createConversation(
        userId,
        locationId,
        persona,
        securityLevel || 'default'
      )
    }

    // -------------------------------------------------------------------
    // 2. Store user message
    // -------------------------------------------------------------------
    await addMessage(conversationId, 'user', message)

    // -------------------------------------------------------------------
    // 3. Build context from all K-layers
    // -------------------------------------------------------------------
    const context = await buildEngineContext(locationId, userId)
    if (securityLevel) {
      context.securityLevel = securityLevel as 'low' | 'default' | 'strict'
    }

    // -------------------------------------------------------------------
    // 4. Detect intent — bridge action or conversation?
    // -------------------------------------------------------------------
    const intent = await detectIntent(message)

    // -------------------------------------------------------------------
    // 5. Build messages array for Groq
    // -------------------------------------------------------------------
    const systemPrompt = buildSystemPrompt(context, persona)
    const history = await getHistory(conversationId, 30)

    // Build the Groq messages array
    const groqMessages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
    ]

    // Add conversation history (skip the message we just added)
    for (const msg of history.slice(0, -1)) {
      if (msg.role === 'system') continue
      groqMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }

    // Add current message with intent context if it's a bridge request
    if (intent.isBridge && intent.confidence >= 0.7) {
      groqMessages.push({
        role: 'user',
        content: `${message}\n\n[SYSTEM NOTE: This appears to be an action request (${intent.action || 'unclassified'}). Enter multi-turn planning mode. Ask clarifying questions before executing. Suggested questions: ${intent.clarifyingQuestions?.join('; ') || 'Ask what specifics they need.'}]`,
      })
    } else {
      groqMessages.push({ role: 'user', content: message })
    }

    // -------------------------------------------------------------------
    // 6. Generate response via Groq
    // -------------------------------------------------------------------
    const reply = await groqChat(groqMessages, {
      temperature: 0.7,
      maxTokens: 4096,
    })

    // -------------------------------------------------------------------
    // 7. Store assistant response
    // -------------------------------------------------------------------
    await addMessage(conversationId, 'assistant', reply, {
      persona,
      intent: intent.isBridge ? intent.action : 'conversation',
      model: 'llama-3.3-70b-versatile',
    })

    // -------------------------------------------------------------------
    // 8. Generate contextual suggested replies
    // -------------------------------------------------------------------
    let suggestions: string[] = []
    try {
      const sugRaw = await groqChat(
        [
          {
            role: 'system',
            content: 'Generate 3 short follow-up suggestions (max 8 words each) the user might want to say next based on the conversation. Output JSON: { "suggestions": ["s1", "s2", "s3"] }',
          },
          { role: 'user', content: `User said: "${message}"\nAssistant replied: "${reply.slice(0, 500)}"` },
        ],
        { temperature: 0.8, maxTokens: 256, json: true }
      )
      const parsed = JSON.parse(sugRaw)
      suggestions = parsed.suggestions || []
    } catch {
      suggestions = ['Tell me more', 'What else can you do?', 'Help me build something']
    }

    return NextResponse.json({
      reply,
      conversationId,
      persona,
      intent: intent.isBridge ? {
        detected: true,
        action: intent.action,
        confidence: intent.confidence,
      } : { detected: false },
      suggestions,
    })
  } catch (err) {
    console.error('[engine] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Engine error' },
      { status: 500 }
    )
  }
}
