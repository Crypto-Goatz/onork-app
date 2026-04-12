/**
 * Channel Adapter — unified interface for external channel communication
 *
 * Every external channel (Telegram, Slack, WordPress, Claude, Discord, WhatsApp)
 * authenticates via a 0n token and routes through the same request pipeline:
 *
 *   Channel message → validate token → resolve user → K-layer routing
 *   → generate .0n file → radial burst execution → response to channel
 */

import { createClient } from '@supabase/supabase-js'
import { validateToken, type TokenContext } from './0n-token'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type ChannelType = 'telegram' | 'slack' | 'wordpress' | 'claude' | 'discord' | 'whatsapp' | 'web' | 'crm'

export interface ChannelMessage {
  channel: ChannelType
  channelIdentity: string
  channelWorkspace?: string
  text: string
  attachments?: { type: string; url: string }[]
  replyTo?: string
  metadata?: Record<string, unknown>
}

export interface ChannelSession {
  id: string
  userId: string
  channel: ChannelType
  channelIdentity: string
  permissions: string[]
  messageCount: number
}

export interface ChannelResponse {
  text: string
  workflowGenerated?: { id: string; name: string; dotOnFile: Record<string, unknown> }
  executionResults?: Record<string, unknown>[]
  error?: string
}

export async function resolveChannelSession(
  channel: ChannelType,
  channelIdentity: string
): Promise<ChannelSession | null> {
  const admin = getAdmin()
  const { data } = await admin
    .from('channel_sessions')
    .select('id, user_id, channel, channel_identity, permissions, message_count')
    .eq('channel', channel)
    .eq('channel_identity', channelIdentity)
    .eq('status', 'active')
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    userId: data.user_id,
    channel: data.channel,
    channelIdentity: data.channel_identity,
    permissions: data.permissions || [],
    messageCount: data.message_count || 0,
  }
}

export async function authenticateChannel(
  token: string,
  channel: ChannelType,
  channelIdentity: string,
  channelWorkspace?: string
): Promise<ChannelSession | null> {
  const ctx = await validateToken(token)
  if (!ctx) return null

  const admin = getAdmin()
  const { data, error } = await admin
    .from('channel_sessions')
    .upsert({
      user_id: ctx.userId,
      channel,
      channel_identity: channelIdentity,
      channel_workspace: channelWorkspace || null,
      token_id: null,
      status: 'active',
      permissions: ctx.scopes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'channel,channel_identity' })
    .select('id, user_id, channel, channel_identity, permissions, message_count')
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    userId: data.user_id,
    channel: data.channel,
    channelIdentity: data.channel_identity,
    permissions: data.permissions || [],
    messageCount: data.message_count || 0,
  }
}

export async function recordMessage(sessionId: string): Promise<void> {
  const admin = getAdmin()
  const { data } = await admin
    .from('channel_sessions')
    .select('message_count')
    .eq('id', sessionId)
    .single()

  await admin
    .from('channel_sessions')
    .update({
      last_message_at: new Date().toISOString(),
      message_count: (data?.message_count || 0) + 1,
    })
    .eq('id', sessionId)
}

export async function getUserConnections(userId: string) {
  const admin = getAdmin()

  const [crm, mcp, channels] = await Promise.all([
    admin
      .from('crm_installations')
      .select('id, location_id, status, health_status, last_health_check, expires_at')
      .eq('user_id', userId)
      .eq('status', 'active'),
    admin
      .from('mcp_connections')
      .select('id, server_id, server_name, status, health_status, last_health_check, call_count')
      .eq('user_id', userId)
      .eq('status', 'active'),
    admin
      .from('channel_sessions')
      .select('id, channel, channel_identity, status, last_message_at, message_count')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ])

  return {
    crm: crm.data || [],
    mcp: mcp.data || [],
    channels: channels.data || [],
    totalConnections: (crm.data?.length || 0) + (mcp.data?.length || 0) + (channels.data?.length || 0),
  }
}

export async function disconnectChannel(
  userId: string,
  channel: ChannelType,
  channelIdentity: string
): Promise<boolean> {
  const admin = getAdmin()
  const { error } = await admin
    .from('channel_sessions')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('channel', channel)
    .eq('channel_identity', channelIdentity)
  return !error
}
