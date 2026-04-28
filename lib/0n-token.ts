/**
 * 0n Token System — unified public credential.
 *
 *   locationId = public ID
 *   0n token   = public secret (format: 0n_live_<48 hex>, 51 chars total)
 *
 * The token is bound to a (user_id, location_id) pair. Server-side, S3 router
 * (lib/crm-router.ts) picks the right underlying CRM credential per operation
 * — sub-location OAuth vs agency PIT vs PIT fallback — invisibly.
 *
 * Token storage: SHA-256 hash only. Raw token returned exactly once at
 * generation; the user must store it.
 */

import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const TOKEN_PREFIX = '0n_live_'
const RAW_BYTES = 24 // → 48 hex chars
const PREFIX_DISPLAY_LEN = 12 // for UI display in token list

export interface TokenContext {
  tokenId: string
  userId: string
  locationId: string
  scopes: string[]
  channel: string
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function generateRawToken(): string {
  return TOKEN_PREFIX + crypto.randomBytes(RAW_BYTES).toString('hex')
}

// ─────────────────────────────────────────────────────────────────────────
// generateToken — returns raw token ONCE. Caller must show + advise to store.
// ─────────────────────────────────────────────────────────────────────────
export interface GenerateArgs {
  userId: string
  locationId: string
  name?: string
  channel?: string
  scopes?: string[]
  metadata?: Record<string, unknown>
  expiresAt?: Date | null
}

export async function generateToken(args: GenerateArgs): Promise<string> {
  const raw = generateRawToken()
  const hash = hashToken(raw)
  const prefix = raw.slice(0, PREFIX_DISPLAY_LEN) // e.g. '0n_live_aabb'

  const { error } = await admin().from('api_tokens').insert({
    user_id: args.userId,
    location_id: args.locationId,
    name: args.name ?? null,
    token_prefix: prefix,
    token_hash: hash,
    scopes: args.scopes ?? ['read', 'write', 'execute'],
    channel: args.channel ?? 'api',
    metadata: args.metadata ?? {},
    expires_at: args.expiresAt ? args.expiresAt.toISOString() : null,
  })

  if (error) throw new Error(`Token generation failed: ${error.message}`)
  return raw
}

// ─────────────────────────────────────────────────────────────────────────
// validateToken — hash lookup, expiry/revoke check, last_used_at bump
// ─────────────────────────────────────────────────────────────────────────
export async function validateToken(raw: string): Promise<TokenContext | null> {
  if (!raw || !raw.startsWith(TOKEN_PREFIX)) return null

  const hash = hashToken(raw)
  const sb = admin()

  const { data, error } = await sb
    .from('api_tokens')
    .select('id, user_id, location_id, scopes, channel, expires_at, revoked')
    .eq('token_hash', hash)
    .maybeSingle()

  if (error || !data) return null
  if (data.revoked) return null
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null

  // Bump last_used_at (best-effort, non-blocking)
  void sb
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return {
    tokenId: data.id,
    userId: data.user_id,
    locationId: data.location_id,
    scopes: data.scopes ?? [],
    channel: data.channel ?? 'api',
  }
}

// ─────────────────────────────────────────────────────────────────────────
// revokeToken — flag, don't delete. Audit trail preserved.
// ─────────────────────────────────────────────────────────────────────────
export async function revokeToken(tokenId: string, requestingUserId: string): Promise<boolean> {
  const { error } = await admin()
    .from('api_tokens')
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .eq('user_id', requestingUserId)
  return !error
}

// ─────────────────────────────────────────────────────────────────────────
// listUserTokens — for the dashboard token-management UI.
// ─────────────────────────────────────────────────────────────────────────
export async function listUserTokens(userId: string) {
  const { data } = await admin()
    .from('api_tokens')
    .select('id, name, token_prefix, location_id, scopes, channel, last_used_at, expires_at, revoked, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}

// ─────────────────────────────────────────────────────────────────────────
// extractToken — pull from Authorization header or ?token= query.
// Header is preferred. X-Location-Id is required when using a 0n token in
// public/MCP contexts where the location can't be inferred.
// ─────────────────────────────────────────────────────────────────────────
export function extractToken(req: Request): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ' + TOKEN_PREFIX)) return auth.slice(7)

  const url = new URL(req.url)
  const query = url.searchParams.get('token')
  if (query?.startsWith(TOKEN_PREFIX)) return query

  return null
}

export function extractLocationOverride(req: Request): string | null {
  // X-Location-Id is honored only if it matches the token's bound location.
  // The handler must verify; this is just extraction.
  return req.headers.get('x-location-id')
}
