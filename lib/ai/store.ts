/**
 * Supabase data accessors for the AI Agent engine.
 *
 * All callers run on the server (API routes) and use the service-role key.
 * RLS denies anon / authenticated direct access — the engine is the only
 * reader/writer of these tables.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AgentRow } from './k-layers/location'
import { ALL_PACK_IDS, isPackId, type PackId } from './k-layers/packs'

export type StoredAgent = AgentRow & {
  id: string
  location_id: string
  agent_name: string
  base_prompt: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface StoredPack {
  id: string
  location_id: string
  pack_id: PackId
  is_active: boolean
  activated_at: string
  expires_at: string | null
}

export interface StoredConversation {
  id: string
  location_id: string
  user_id: string | null
  channel: string
  messages: ConversationMessage[]
  actions_taken: unknown[]
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  ts: string
}

export function adminSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Fetch the agent row for a location. Creates an empty row on first read
 * so callers always get a stable shape — this matches the spec's
 * "Snapshot import auto-creates the agent" behavior.
 */
export async function getOrCreateAgent(locationId: string): Promise<StoredAgent> {
  const sb = adminSupabase()
  const existing = await sb.from('ai_agents').select('*').eq('location_id', locationId).maybeSingle()
  if (existing.data) return existing.data as StoredAgent

  const inserted = await sb
    .from('ai_agents')
    .insert({ location_id: locationId })
    .select('*')
    .single()
  if (inserted.error) throw new Error(`ai_agents insert failed: ${inserted.error.message}`)
  return inserted.data as StoredAgent
}

export async function getAgent(locationId: string): Promise<StoredAgent | null> {
  const sb = adminSupabase()
  const { data, error } = await sb.from('ai_agents').select('*').eq('location_id', locationId).maybeSingle()
  if (error) throw new Error(`ai_agents read failed: ${error.message}`)
  return (data as StoredAgent | null) ?? null
}

export type AgentPatch = Partial<Pick<StoredAgent,
  | 'agent_name'
  | 'brand_tone'
  | 'brand_phrases'
  | 'brand_avoid'
  | 'services'
  | 'pricing'
  | 'faq'
  | 'competitors'
  | 'business_name'
  | 'business_address'
  | 'business_phone'
  | 'business_website'
  | 'business_hours'
  | 'booking_url'
  | 'onboarding_completed'
>>

export async function upsertAgent(locationId: string, patch: AgentPatch): Promise<StoredAgent> {
  const sb = adminSupabase()
  const { data, error } = await sb
    .from('ai_agents')
    .upsert({ location_id: locationId, ...patch }, { onConflict: 'location_id' })
    .select('*')
    .single()
  if (error) throw new Error(`ai_agents upsert failed: ${error.message}`)
  return data as StoredAgent
}

export async function getActivePacks(locationId: string): Promise<PackId[]> {
  const sb = adminSupabase()
  const { data, error } = await sb
    .from('ai_prompt_packs')
    .select('pack_id, is_active, expires_at')
    .eq('location_id', locationId)
    .eq('is_active', true)
  if (error) throw new Error(`ai_prompt_packs read failed: ${error.message}`)
  const now = Date.now()
  const out: PackId[] = []
  for (const row of data ?? []) {
    const id = String(row.pack_id ?? '')
    if (!isPackId(id)) continue
    const exp = row.expires_at ? Date.parse(row.expires_at) : null
    if (exp !== null && Number.isFinite(exp) && exp <= now) continue
    out.push(id)
  }
  return out
}

export async function listPacks(locationId: string): Promise<{
  available: { id: PackId; display: string }[]
  active: PackId[]
}> {
  const active = await getActivePacks(locationId)
  // Display names live with the pack defs; we re-import lazily to avoid
  // a circular dependency.
  const { PACK_DEFS } = await import('./k-layers/packs')
  return {
    available: ALL_PACK_IDS.map((id) => ({ id, display: PACK_DEFS[id].display })),
    active,
  }
}

export async function activatePack(locationId: string, packId: PackId, expiresAt: string | null = null): Promise<StoredPack> {
  const sb = adminSupabase()
  const { data, error } = await sb
    .from('ai_prompt_packs')
    .upsert(
      { location_id: locationId, pack_id: packId, is_active: true, expires_at: expiresAt },
      { onConflict: 'location_id,pack_id' },
    )
    .select('*')
    .single()
  if (error) throw new Error(`ai_prompt_packs upsert failed: ${error.message}`)
  return data as StoredPack
}

export async function deactivatePack(locationId: string, packId: PackId): Promise<void> {
  const sb = adminSupabase()
  const { error } = await sb
    .from('ai_prompt_packs')
    .update({ is_active: false })
    .eq('location_id', locationId)
    .eq('pack_id', packId)
  if (error) throw new Error(`ai_prompt_packs deactivate failed: ${error.message}`)
}

export async function getOrCreateConversation(
  locationId: string,
  conversationId: string | null,
  channel: string,
  userId: string | null,
): Promise<StoredConversation> {
  const sb = adminSupabase()
  if (conversationId) {
    const existing = await sb.from('ai_conversations').select('*').eq('id', conversationId).maybeSingle()
    if (existing.data) return normalizeConvo(existing.data)
  }
  const inserted = await sb
    .from('ai_conversations')
    .insert({ location_id: locationId, channel, user_id: userId, messages: [] })
    .select('*')
    .single()
  if (inserted.error) throw new Error(`ai_conversations insert failed: ${inserted.error.message}`)
  return normalizeConvo(inserted.data)
}

function normalizeConvo(row: unknown): StoredConversation {
  const r = row as Record<string, unknown>
  const msgs = Array.isArray(r.messages) ? (r.messages as ConversationMessage[]) : []
  const actions = Array.isArray(r.actions_taken) ? (r.actions_taken as unknown[]) : []
  return {
    id: String(r.id),
    location_id: String(r.location_id),
    user_id: r.user_id ? String(r.user_id) : null,
    channel: String(r.channel ?? 'admin'),
    messages: msgs,
    actions_taken: actions,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

export async function appendConversation(
  conversationId: string,
  newMessages: ConversationMessage[],
  newActions: unknown[],
): Promise<void> {
  const sb = adminSupabase()
  const existing = await sb.from('ai_conversations').select('messages,actions_taken').eq('id', conversationId).single()
  if (existing.error) throw new Error(`ai_conversations read failed: ${existing.error.message}`)
  const currentMessages = Array.isArray(existing.data?.messages) ? (existing.data.messages as ConversationMessage[]) : []
  const currentActions = Array.isArray(existing.data?.actions_taken) ? (existing.data.actions_taken as unknown[]) : []
  const { error } = await sb
    .from('ai_conversations')
    .update({
      messages: [...currentMessages, ...newMessages],
      actions_taken: [...currentActions, ...newActions],
    })
    .eq('id', conversationId)
  if (error) throw new Error(`ai_conversations update failed: ${error.message}`)
}

export async function logAction(row: {
  location_id: string
  conversation_id: string | null
  action_type: string
  action_params: Record<string, unknown>
  result: unknown
  success: boolean
}): Promise<void> {
  const sb = adminSupabase()
  const { error } = await sb.from('ai_action_log').insert(row)
  if (error) throw new Error(`ai_action_log insert failed: ${error.message}`)
}
