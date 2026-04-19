/**
 * Engine Conversation Store — persists multi-turn conversations
 * in Supabase for the 0nAI Engine.
 */

import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  location_id: string
  persona: string
  security_level: string
  created_at: string
  last_message_at: string
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export async function createConversation(
  userId: string,
  locationId: string,
  persona: string = 'engine',
  securityLevel: string = 'default'
): Promise<string> {
  const admin = getAdmin()
  const { data, error } = await admin
    .from('engine_conversations')
    .insert({
      user_id: userId,
      location_id: locationId,
      persona,
      security_level: securityLevel,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create conversation: ${error.message}`)
  return data.id
}

export async function getHistory(
  conversationId: string,
  limit: number = 50
): Promise<Message[]> {
  const admin = getAdmin()
  const { data, error } = await admin
    .from('engine_messages')
    .select('id, role, content, metadata, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Failed to load history: ${error.message}`)
  return (data || []) as Message[]
}

export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const admin = getAdmin()

  const [msgResult] = await Promise.all([
    admin
      .from('engine_messages')
      .insert({ conversation_id: conversationId, role, content, metadata })
      .select('id')
      .single(),
    admin
      .from('engine_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId),
  ])

  if (msgResult.error) throw new Error(`Failed to add message: ${msgResult.error.message}`)
  return msgResult.data.id
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const admin = getAdmin()
  const { data } = await admin
    .from('engine_conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  return data as Conversation | null
}

export async function getRecentConversation(
  userId: string,
  locationId: string
): Promise<Conversation | null> {
  const admin = getAdmin()
  const { data } = await admin
    .from('engine_conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as Conversation | null
}
