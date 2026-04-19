/**
 * 0nAI Engine — External Access API
 *
 * Endpoint specifically for external software connecting via 0n_ token.
 * Any software can connect to the 0nAI Engine with just a token from 0ncore.com.
 *
 * POST /api/engine/external
 * Authorization: Bearer 0n_xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken } from '@/lib/0n-token'
import { buildEngineContext } from '@/lib/engine/context'
import { buildSystemPrompt } from '@/lib/engine/prompt'
import {
  createConversation,
  getHistory,
  addMessage,
  getConversation,
} from '@/lib/engine/conversation'
import { groqChat, type GroqMessage } from '@/lib/engine/groq'
import { detectIntent } from '@/lib/engine/intent'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    // Validate token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer 0n_')) {
      return NextResponse.json(
        { error: 'Invalid authorization. Use: Authorization: Bearer 0n_xxx' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const tokenCtx = await validateToken(token)
    if (!tokenCtx) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Resolve user profile and location
    const admin = getAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('crm_location_id')
      .eq('id', tokenCtx.userId)
      .single()

    if (!profile?.crm_location_id) {
      return NextResponse.json(
        { error: 'No location configured. Set up your CRM connection in 0nCore first.' },
        { status: 400 }
      )
    }

    const userId = tokenCtx.userId
    const locationId = profile.crm_location_id

    // Parse body
    const body = await request.json()
    const { message, conversationId: incomingConvId } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Resolve or create conversation
    let conversationId = incomingConvId as string | undefined
    if (conversationId) {
      const conv = await getConversation(conversationId)
      if (!conv || conv.user_id !== userId) {
        conversationId = undefined
      }
    }

    if (!conversationId) {
      conversationId = await createConversation(userId, locationId, 'engine', 'default')
    }

    // Store user message
    await addMessage(conversationId, 'user', message)

    // Build full K-layer context
    const context = await buildEngineContext(locationId, userId)

    // Detect intent
    const intent = await detectIntent(message)

    // Build messages
    const systemPrompt = buildSystemPrompt(context, 'engine')
    const history = await getHistory(conversationId, 20)

    const groqMessages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
    ]

    for (const msg of history.slice(0, -1)) {
      if (msg.role === 'system') continue
      groqMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }

    if (intent.isBridge && intent.confidence >= 0.7) {
      groqMessages.push({
        role: 'user',
        content: `${message}\n\n[SYSTEM NOTE: Action request detected (${intent.action || 'unclassified'}). Enter multi-turn planning mode. Ask clarifying questions before executing.]`,
      })
    } else {
      groqMessages.push({ role: 'user', content: message })
    }

    // Generate response
    const reply = await groqChat(groqMessages, {
      temperature: 0.7,
      maxTokens: 4096,
    })

    // Store response
    await addMessage(conversationId, 'assistant', reply, {
      persona: 'engine',
      channel: tokenCtx.channel,
      intent: intent.isBridge ? intent.action : 'conversation',
    })

    return NextResponse.json({
      reply,
      conversationId,
      intent: intent.isBridge ? {
        detected: true,
        action: intent.action,
        confidence: intent.confidence,
      } : { detected: false },
    })
  } catch (err) {
    console.error('[engine/external] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Engine error' },
      { status: 500 }
    )
  }
}
