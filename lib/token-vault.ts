/**
 * Unified Token-Vault System
 *
 * One call: validate 0n token → decrypt user's service credentials
 * Used by ALL channels (Slack, Telegram, Discord, WhatsApp, WordPress, Claude, Web)
 *
 * Security chain:
 *   Raw token → SHA-256 hash → api_tokens lookup → user_id
 *   → Vault decrypt → credentials returned → audit logged
 *   → credentials used once → never cached
 *
 * Token revocation instantly kills ALL credential access.
 */

import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface TokenVaultResult {
  userId: string
  scopes: string[]
  channel: string
  credentials: Record<string, string>
}

export interface UserVaultEntry {
  service: string
  status: string
  healthStatus: string
  credentials: Record<string, string>
  lastUsedAt: string | null
}

/**
 * Validate a 0n token AND decrypt credentials for a specific service.
 * Single database call via the validate_and_decrypt() function.
 *
 * @param token - Raw 0n token (0n_...)
 * @param service - Service to decrypt credentials for (e.g., 'stripe', 'sendgrid')
 * @returns TokenVaultResult or null if token is invalid/expired/revoked
 */
export async function validateAndDecrypt(
  token: string,
  service?: string
): Promise<TokenVaultResult | null> {
  if (!token || !token.startsWith('0n_')) return null

  const admin = getAdmin()
  const { data, error } = await admin.rpc('validate_and_decrypt', {
    p_token: token,
    p_service: service || null,
  })

  if (error || !data || !Array.isArray(data) || data.length === 0) return null

  const row = data[0]
  if (!row.user_id) return null

  return {
    userId: row.user_id,
    scopes: row.scopes || [],
    channel: row.channel || 'unknown',
    credentials: (row.credentials as Record<string, string>) || {},
  }
}

/**
 * Get ALL active service credentials for a user.
 * Used by bridge/message to know which services are available.
 *
 * @param userId - User ID (already validated)
 * @returns Array of service entries with decrypted credentials
 */
export async function getUserVault(userId: string): Promise<UserVaultEntry[]> {
  const admin = getAdmin()
  const { data, error } = await admin.rpc('get_user_vault', { p_user_id: userId })

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map(row => ({
    service: row.service as string,
    status: row.status as string,
    healthStatus: row.health_status as string,
    credentials: (row.credentials as Record<string, string>) || {},
    lastUsedAt: row.last_used_at as string | null,
  }))
}

/**
 * Extract token from request (header or query param)
 * Then validate + optionally decrypt a service.
 */
export async function authAndDecrypt(
  req: Request,
  service?: string
): Promise<TokenVaultResult | null> {
  const auth = req.headers.get('authorization')
  let token: string | null = null

  if (auth?.startsWith('Bearer 0n_')) {
    token = auth.slice(7)
  } else {
    const url = new URL(req.url)
    const q = url.searchParams.get('token')
    if (q?.startsWith('0n_')) token = q
  }

  if (!token) return null
  return validateAndDecrypt(token, service)
}
