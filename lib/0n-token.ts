/**
 * 0n Token System — persistent auth tokens for cross-channel access
 *
 * Token format: 0n_ + 96 hex chars (48 random bytes)
 * Storage: SHA-256 hash in api_tokens, raw token returned once at creation
 * Validation: hash lookup, update last_used_at, return user context
 */

import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface TokenContext {
  userId: string
  scopes: string[]
  channel: string
}

export async function generateToken(
  userId: string,
  channel: string = 'dashboard',
  scopes: string[] = ['read', 'write', 'execute'],
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const admin = getAdmin()
  const { data, error } = await admin.rpc('generate_0n_token', {
    p_user_id: userId,
    p_channel: channel,
    p_scopes: scopes,
    p_metadata: metadata,
  })
  if (error) throw new Error(`Token generation failed: ${error.message}`)
  return data as string
}

export async function validateToken(token: string): Promise<TokenContext | null> {
  if (!token || !token.startsWith('0n_')) return null
  const admin = getAdmin()
  const { data, error } = await admin.rpc('validate_0n_token', { p_token: token })
  if (error || !data || !Array.isArray(data) || data.length === 0) return null
  const row = data[0]
  return {
    userId: row.user_id,
    scopes: row.scopes || [],
    channel: row.channel || 'unknown',
  }
}

export async function revokeToken(tokenPrefix: string, userId: string): Promise<boolean> {
  const admin = getAdmin()
  const { error } = await admin
    .from('api_tokens')
    .update({ revoked: true })
    .eq('token_prefix', tokenPrefix)
    .eq('user_id', userId)
  return !error
}

export async function listUserTokens(userId: string) {
  const admin = getAdmin()
  const { data } = await admin
    .from('api_tokens')
    .select('id, name, token_prefix, scopes, channel, last_used_at, created_at, revoked')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data || []
}

export function extractToken(req: Request): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer 0n_')) return auth.slice(7)

  const url = new URL(req.url)
  const query = url.searchParams.get('token')
  if (query?.startsWith('0n_')) return query

  return null
}
