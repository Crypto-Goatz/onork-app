/**
 * 0n Token System — universal public credential.
 *
 * Format (v2 — checksum-bearing):
 *   0n_live_{user_id_hash}_{random}_{checksum}
 *     user_id_hash : first 8 hex chars of SHA256(profile_id)
 *     random       : 16 random alphanumeric chars [A-Za-z0-9]
 *     checksum     : last 4 hex chars of SHA256("0n_live_" + user_hash + "_" + random)
 *   Total length: 38 chars. Example:
 *     0n_live_a1b2c3d4_xK9mP2qR7tW4vB8n_f5e6
 *
 * Storage models (both supported — pick at call site):
 *
 *   A) profiles.access_token  (universal — one token per user)
 *      One row, raw token stored. Best for MCP/Slack/WordPress/extension/API
 *      where a single user-scoped credential is what every platform expects.
 *      Functions: generateProfileToken / validateProfileToken / rotateProfileToken
 *
 *   B) api_tokens             (legacy — many per user, hashed, scoped)
 *      Multiple tokens per (user, location), hashed at rest, with scopes,
 *      revocation, expiry, last_used_at, channel attribution.
 *      Functions: generateToken / validateToken / revokeToken / listUserTokens
 *
 * Format-level helpers (parseToken, verifyTokenFormat) work on the raw string
 * without DB access — useful for fast-fail on obviously-malformed tokens.
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
const USER_HASH_LEN = 8
const RANDOM_LEN = 16
const CHECKSUM_LEN = 4
const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const PREFIX_DISPLAY_LEN = 12

// ─────────────────────────────────────────────────────────────────────────
// Format primitives — pure, no DB.
// ─────────────────────────────────────────────────────────────────────────

function userIdHash(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, USER_HASH_LEN)
}

function randomSegment(): string {
  const buf = crypto.randomBytes(RANDOM_LEN)
  let out = ''
  for (let i = 0; i < RANDOM_LEN; i++) {
    out += ALPHANUM[buf[i] % ALPHANUM.length]
  }
  return out
}

function computeChecksum(prefix: string, userHash: string, random: string): string {
  const body = `${prefix}${userHash}_${random}`
  return crypto.createHash('sha256').update(body).digest('hex').slice(-CHECKSUM_LEN)
}

export interface ParsedToken {
  prefix: string
  userHash: string
  random: string
  checksum: string
}

/**
 * Parse a v2 token into its components. Returns null if the string does not
 * match the v2 shape. Does NOT verify the checksum — call verifyTokenFormat
 * for that.
 */
export function parseToken(raw: string): ParsedToken | null {
  if (!raw || !raw.startsWith(TOKEN_PREFIX)) return null
  const rest = raw.slice(TOKEN_PREFIX.length)
  const parts = rest.split('_')
  if (parts.length !== 3) return null
  const [userHash, random, checksum] = parts
  if (userHash.length !== USER_HASH_LEN) return null
  if (random.length !== RANDOM_LEN) return null
  if (checksum.length !== CHECKSUM_LEN) return null
  if (!/^[0-9a-f]+$/.test(userHash)) return null
  if (!/^[A-Za-z0-9]+$/.test(random)) return null
  if (!/^[0-9a-f]+$/.test(checksum)) return null
  return { prefix: TOKEN_PREFIX, userHash, random, checksum }
}

/**
 * Verify a token's checksum without hitting the database. Useful as a fast
 * fail before a DB lookup — rejects malformed/typo'd tokens immediately.
 */
export function verifyTokenFormat(raw: string): boolean {
  const parsed = parseToken(raw)
  if (!parsed) return false
  return computeChecksum(parsed.prefix, parsed.userHash, parsed.random) === parsed.checksum
}

function buildToken(userId: string): string {
  const userHash = userIdHash(userId)
  const random = randomSegment()
  const checksum = computeChecksum(TOKEN_PREFIX, userHash, random)
  return `${TOKEN_PREFIX}${userHash}_${random}_${checksum}`
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// ─────────────────────────────────────────────────────────────────────────
// Profile-token API (Model A — universal, one per user)
// ─────────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email?: string | null
  full_name?: string | null
  is_admin?: boolean | null
  location_id?: string | null
  [key: string]: unknown
}

export interface ProfileValidateResult {
  valid: boolean
  profile?: Profile
  error?: string
}

/**
 * Generate (or rotate) the universal access token for a user. Writes raw
 * token to profiles.access_token. Returns the raw token — the caller must
 * surface it to the user (it's the credential they need to paste into MCP
 * configs, the extension, Slack, etc.).
 */
export async function generateProfileToken(userId: string): Promise<string> {
  if (!userId) throw new Error('userId required')
  const raw = buildToken(userId)
  const { data: profile, error } = await admin()
    .from('profiles')
    .update({ access_token: raw, access_token_rotated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('crm_location_id')
    .maybeSingle()
  if (error) throw new Error(`generateProfileToken failed: ${error.message}`)

  // ONE TOKEN, BOTH VALIDATORS. See registerForExchange for why this is not
  // optional — without it the key we just handed the user works on some routes
  // and not others, which is indistinguishable from a broken product.
  await registerForExchange(userId, raw, profile?.crm_location_id ?? '')
  return raw
}

/**
 * Also record this token in `api_tokens`, hashed, so the device-exchange path
 * accepts it.
 *
 * THE BUG THIS EXISTS TO KILL. There are two validators in this file and they
 * read two different stores:
 *
 *   validateProfileToken  → profiles.access_token   (the raw string, Model A)
 *   validateToken         → api_tokens.token_hash   (sha256, Model B)
 *
 * Both take the same `0n_live_…` string, so the two are impossible to tell
 * apart by looking at the credential. But this function used to write only the
 * profile column, so the key shown on the hub would:
 *
 *   · PASS  /api/auth/extension-login   (reads profiles.access_token)
 *   · FAIL  /api/auth/device/exchange   (reads api_tokens.token_hash)
 *
 * The extension therefore connected happily and then 401'd on every feature
 * that needed a real app JWT — the CRM panel, contact lookup, the LinkedIn
 * draft exchange. Measured 2026-08-18: 2 of 2 profiles holding a 0n_live_ key
 * had ZERO matching api_tokens row. "Connected" and "working" were two
 * different states for exactly this reason, and the client-side fix of writing
 * one value into two storage slots could never have reached it, because the
 * split was here on the server.
 *
 * ROTATION REVOKES THE OLD ROW. A rotated key that still exchanged would mean
 * "rotate" quietly left the previous credential live, which is worse than not
 * offering rotation at all.
 */
async function registerForExchange(userId: string, raw: string, locationId: string): Promise<void> {
  const db = admin()

  // Retire any previous profile-channel token for this user first.
  await db
    .from('api_tokens')
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('channel', 'profile')
    .eq('revoked', false)

  const { error } = await db.from('api_tokens').insert({
    user_id: userId,
    // NOT NULL on this table. An empty string is the honest value when the
    // profile has no CRM location yet — inventing one would bind the token to
    // an account that is not theirs.
    location_id: locationId || '',
    name: 'Universal 0n key',
    token_prefix: raw.slice(0, 16),
    token_hash: hashToken(raw),
    channel: 'profile',
  })

  // Deliberately not fatal. The profile column is already written, so the user
  // has a working key for everything in Model A; throwing here would turn a
  // partial success into a failed signup. It is logged loudly instead.
  if (error) {
    console.error(
      `[0n-token] Token minted for ${userId} but NOT registered for device exchange: ${error.message}. ` +
      `This key will authenticate against profiles.access_token and 401 on /api/auth/device/exchange.`
    )
  }
}

/**
 * Validate a token against profiles.access_token. Performs:
 *   1) Format + checksum check (fast fail, no DB).
 *   2) Lookup of the raw token in profiles.access_token.
 *   3) Cross-check: the embedded user_hash must match SHA256(profile.id).
 *      (Catches tokens forged or moved between profile rows.)
 */
export async function validateProfileToken(token: string): Promise<ProfileValidateResult> {
  if (!token) return { valid: false, error: 'no token' }
  if (!verifyTokenFormat(token)) return { valid: false, error: 'bad format' }

  const parsed = parseToken(token)!
  const { data, error } = await admin()
    .from('profiles')
    .select('*')
    .eq('access_token', token)
    .maybeSingle()

  if (error) return { valid: false, error: error.message }
  if (!data) return { valid: false, error: 'token not found' }
  if (userIdHash(data.id) !== parsed.userHash) {
    return { valid: false, error: 'user_hash mismatch' }
  }

  return { valid: true, profile: data as Profile }
}

export async function rotateProfileToken(userId: string): Promise<string> {
  return generateProfileToken(userId)
}

export async function revokeProfileToken(userId: string): Promise<void> {
  const { error } = await admin()
    .from('profiles')
    .update({ access_token: null, access_token_rotated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw new Error(`revokeProfileToken failed: ${error.message}`)
}

// ─────────────────────────────────────────────────────────────────────────
// Legacy api_tokens API (Model B — multi-token, hashed, scoped)
// ─────────────────────────────────────────────────────────────────────────

export interface TokenContext {
  tokenId: string
  userId: string
  locationId: string
  scopes: string[]
  channel: string
}

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
  const raw = buildToken(args.userId)
  const hash = hashToken(raw)
  const prefix = raw.slice(0, PREFIX_DISPLAY_LEN)

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

export async function revokeToken(tokenId: string, requestingUserId: string): Promise<boolean> {
  const { error } = await admin()
    .from('api_tokens')
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .eq('user_id', requestingUserId)
  return !error
}

export async function listUserTokens(userId: string) {
  const { data } = await admin()
    .from('api_tokens')
    .select('id, name, token_prefix, location_id, scopes, channel, last_used_at, expires_at, revoked, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}

// ─────────────────────────────────────────────────────────────────────────
// Unified resolver — try profile token first, fall back to api_tokens.
// Use this in surfaces (MCP, public API) that accept either model.
// ─────────────────────────────────────────────────────────────────────────

export interface UnifiedResolveResult {
  valid: boolean
  source?: 'profile' | 'api_tokens'
  userId?: string
  profile?: Profile
  context?: TokenContext
  error?: string
}

export async function resolveToken(raw: string): Promise<UnifiedResolveResult> {
  if (!raw) return { valid: false, error: 'no token' }
  if (!raw.startsWith(TOKEN_PREFIX)) return { valid: false, error: 'bad prefix' }

  if (verifyTokenFormat(raw)) {
    const r = await validateProfileToken(raw)
    if (r.valid && r.profile) {
      return { valid: true, source: 'profile', userId: r.profile.id, profile: r.profile }
    }
  }

  const ctx = await validateToken(raw)
  if (ctx) {
    return { valid: true, source: 'api_tokens', userId: ctx.userId, context: ctx }
  }

  return { valid: false, error: 'token not found' }
}

// ─────────────────────────────────────────────────────────────────────────
// Request helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Pull a token from the request. Order: Authorization: Bearer <token>,
 * then x-0n-token header, then ?token= query param.
 */
export function extractToken(req: Request): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ' + TOKEN_PREFIX)) return auth.slice(7)

  const header = req.headers.get('x-0n-token')
  if (header?.startsWith(TOKEN_PREFIX)) return header

  const url = new URL(req.url)
  const query = url.searchParams.get('token')
  if (query?.startsWith(TOKEN_PREFIX)) return query

  return null
}

export function extractLocationOverride(req: Request): string | null {
  return req.headers.get('x-location-id')
}
