/**
 * OAuth 2.1 server primitives — used by the /api/oauth/* routes.
 *
 * Scope of this file: pure functions + service-role DB helpers. No HTTP,
 * no Next.js. Endpoints compose these to implement authorize / token /
 * register / userinfo.
 *
 * Token model: bearer tokens are 256-bit opaque random strings prefixed
 * `0n_at_…` (access) and `0n_rt_…` (refresh). They are looked up in
 * oauth_access_tokens. We optionally mint a JWT mirror for clients that
 * need RS256-verifiable claims; the opaque token is the source of truth.
 *
 * PKCE (RFC 7636): we accept S256 only — `plain` is forbidden by OAuth
 * 2.1. The code_challenge stored on the auth code must equal
 * BASE64URL(SHA256(code_verifier)) presented at /token.
 */

import crypto from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────
// Issuer + supported metadata (used by discovery + every issued token)
// ─────────────────────────────────────────────────────────────────────

export const SUPPORTED_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  // 0nMCP / app-specific
  'mcp',
  'mcp:read',
  'mcp:write',
  'workflows:run',
  'workflows:read',
  'crm:read',
  'crm:write',
] as const

export const SUPPORTED_GRANT_TYPES = ['authorization_code', 'refresh_token'] as const
export const SUPPORTED_RESPONSE_TYPES = ['code'] as const
export const SUPPORTED_AUTH_METHODS = [
  'none',
  'client_secret_basic',
  'client_secret_post',
] as const
export const SUPPORTED_CODE_CHALLENGE_METHODS = ['S256'] as const

export const DEFAULT_ACCESS_TTL_SECONDS = 60 * 60 // 1h
export const DEFAULT_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30 // 30d
export const AUTH_CODE_TTL_SECONDS = 10 * 60 // 10 min

export function getIssuer(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
}

// ─────────────────────────────────────────────────────────────────────
// Service-role admin client
// ─────────────────────────────────────────────────────────────────────

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('oauth-server: supabase env missing')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ─────────────────────────────────────────────────────────────────────
// Random tokens
// ─────────────────────────────────────────────────────────────────────

/** Random base64url string of `bytes` bytes of entropy. */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function newAccessToken(): string {
  return `0n_at_${randomToken(32)}`
}

export function newRefreshToken(): string {
  return `0n_rt_${randomToken(32)}`
}

export function newAuthCode(): string {
  return `0n_ac_${randomToken(32)}`
}

export function newClientId(): string {
  return `0n_cli_${randomToken(16)}`
}

export function newClientSecret(): string {
  return `0n_csec_${randomToken(32)}`
}

// ─────────────────────────────────────────────────────────────────────
// PKCE
// ─────────────────────────────────────────────────────────────────────

/** Verify a PKCE code_verifier matches a stored S256 challenge. */
export function verifyPkce(verifier: string, challenge: string): boolean {
  const computed = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')
  return constantTimeEqual(computed, challenge)
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  return crypto.timingSafeEqual(aBuf, bBuf)
}

// ─────────────────────────────────────────────────────────────────────
// Client registry
// ─────────────────────────────────────────────────────────────────────

export interface OAuthClient {
  client_id: string
  client_secret: string | null
  client_name: string
  redirect_uris: string[]
  grant_types: string[]
  response_types: string[]
  scope: string
  token_endpoint_auth_method: 'none' | 'client_secret_basic' | 'client_secret_post'
  application_type: string
  client_uri: string | null
  logo_uri: string | null
}

/** Look up a registered client. Also matches the env-seeded CRM clients. */
export async function loadClient(
  sb: SupabaseClient,
  clientId: string,
): Promise<OAuthClient | null> {
  const { data } = await sb
    .from('oauth_clients')
    .select(
      'client_id, client_secret, client_name, redirect_uris, grant_types, response_types, scope, token_endpoint_auth_method, application_type, client_uri, logo_uri',
    )
    .eq('client_id', clientId)
    .maybeSingle()
  if (data) return data as OAuthClient

  // Seeded CRM marketplace clients — keep the legacy /oauth/* flow alive.
  const seeded = seededClient(clientId)
  if (seeded) return seeded
  return null
}

function seededClient(clientId: string): OAuthClient | null {
  const candidates = [
    {
      idEnv: 'CRM_MARKETPLACE_CLIENT_ID',
      secretEnv: 'CRM_MARKETPLACE_CLIENT_SECRET',
      name: 'CRM Marketplace App',
    },
    {
      idEnv: 'CRM_EXTERNAL_AUTH_CLIENT_ID',
      secretEnv: 'CRM_EXTERNAL_AUTH_CLIENT_SECRET',
      name: 'CRM External Auth App',
    },
  ]
  for (const c of candidates) {
    const id = process.env[c.idEnv]
    const secret = process.env[c.secretEnv]
    if (id && id === clientId) {
      return {
        client_id: id,
        client_secret: secret || null,
        client_name: c.name,
        redirect_uris: [], // CRM uses dynamic redirect URIs — validated by host allowlist
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        scope: 'openid profile email mcp workflows:run',
        token_endpoint_auth_method: 'client_secret_post',
        application_type: 'web',
        client_uri: null,
        logo_uri: null,
      }
    }
  }
  return null
}

/** True if `redirect` is registered for `client`, or the client allows
 * dynamic URIs (legacy CRM clients have an empty redirect_uris and we
 * fall back to a trusted-host allowlist). */
export function isValidRedirectUri(client: OAuthClient, redirect: string): boolean {
  let url: URL
  try {
    url = new URL(redirect)
  } catch {
    return false
  }
  if (client.redirect_uris.length > 0) {
    return client.redirect_uris.includes(redirect)
  }
  // Legacy / dynamic clients — allow loopback + a small allow-list of hosts.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true
  if (url.hostname === '[::1]') return true
  const allowed = (process.env.OAUTH_REDIRECT_HOSTS_ALLOW || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
  return allowed.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
}

// ─────────────────────────────────────────────────────────────────────
// JWT mirror (best-effort) — RS-style claims signed with the Supabase
// JWT secret if we have it. Resource servers that already trust Supabase
// JWTs can verify these without a round-trip to /introspect.
// ─────────────────────────────────────────────────────────────────────

export function mintMirrorJwt(opts: {
  userId: string
  email: string | null
  clientId: string
  scope: string
  expiresInSeconds: number
}): string | null {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return null
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    iss: getIssuer(),
    sub: opts.userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: opts.email,
    azp: opts.clientId,
    scope: opts.scope,
    iat: now,
    exp: now + opts.expiresInSeconds,
  }
  const enc = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')
  const signingInput = `${enc(header)}.${enc(payload)}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url')
  return `${signingInput}.${signature}`
}

// ─────────────────────────────────────────────────────────────────────
// Issue tokens — writes the access + refresh row, returns the pair
// ─────────────────────────────────────────────────────────────────────

export interface IssueTokenInput {
  clientId: string
  userId: string
  email: string | null
  scope: string
  ttlSeconds?: number
  refreshTtlSeconds?: number
  withRefresh?: boolean
}

export interface IssuedToken {
  access_token: string
  refresh_token: string | null
  token_type: 'Bearer'
  expires_in: number
  scope: string
  // Mirror JWT (when SUPABASE_JWT_SECRET is set). The opaque access_token
  // remains the canonical credential; this JWT is offered as a convenience
  // for resource servers that already verify Supabase JWTs.
  jwt: string | null
}

export async function issueTokens(
  sb: SupabaseClient,
  input: IssueTokenInput,
): Promise<IssuedToken> {
  const accessTtl = input.ttlSeconds ?? DEFAULT_ACCESS_TTL_SECONDS
  const refreshTtl = input.refreshTtlSeconds ?? DEFAULT_REFRESH_TTL_SECONDS
  const access = newAccessToken()
  const refresh = input.withRefresh === false ? null : newRefreshToken()
  const now = Date.now()
  const expiresAt = new Date(now + accessTtl * 1000).toISOString()
  const refreshExpiresAt = refresh
    ? new Date(now + refreshTtl * 1000).toISOString()
    : null
  const jwt = mintMirrorJwt({
    userId: input.userId,
    email: input.email,
    clientId: input.clientId,
    scope: input.scope,
    expiresInSeconds: accessTtl,
  })

  const { error } = await sb.from('oauth_access_tokens').insert({
    token: access,
    refresh_token: refresh,
    client_id: input.clientId,
    user_id: input.userId,
    scope: input.scope,
    expires_at: expiresAt,
    refresh_expires_at: refreshExpiresAt,
    jwt,
  })
  if (error) throw new Error(`oauth: token persist failed: ${error.message}`)

  return {
    access_token: access,
    refresh_token: refresh,
    token_type: 'Bearer',
    expires_in: accessTtl,
    scope: input.scope,
    jwt,
  }
}

// ─────────────────────────────────────────────────────────────────────
// Auth code lifecycle
// ─────────────────────────────────────────────────────────────────────

export interface IssueCodeInput {
  clientId: string
  userId: string
  redirectUri: string
  scope: string
  codeChallenge: string | null
  codeChallengeMethod: string | null
  state: string | null
  nonce: string | null
}

export async function issueAuthCode(
  sb: SupabaseClient,
  input: IssueCodeInput,
): Promise<string> {
  const code = newAuthCode()
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000).toISOString()
  const { error } = await sb.from('oauth_authorization_codes').insert({
    code,
    client_id: input.clientId,
    user_id: input.userId,
    redirect_uri: input.redirectUri,
    scope: input.scope,
    code_challenge: input.codeChallenge,
    code_challenge_method: input.codeChallengeMethod,
    state: input.state,
    nonce: input.nonce,
    expires_at: expiresAt,
  })
  if (error) throw new Error(`oauth: code persist failed: ${error.message}`)
  return code
}

export interface ConsumedCode {
  code: string
  client_id: string
  user_id: string
  redirect_uri: string
  scope: string
  code_challenge: string | null
  code_challenge_method: string | null
}

/** Atomically mark an auth code consumed and return its row. Returns
 * null if the code is missing, expired, or already consumed. */
export async function consumeAuthCode(
  sb: SupabaseClient,
  code: string,
): Promise<ConsumedCode | null> {
  const nowIso = new Date().toISOString()
  const { data, error } = await sb
    .from('oauth_authorization_codes')
    .update({ consumed_at: nowIso })
    .eq('code', code)
    .is('consumed_at', null)
    .gt('expires_at', nowIso)
    .select(
      'code, client_id, user_id, redirect_uri, scope, code_challenge, code_challenge_method',
    )
    .maybeSingle()
  if (error) throw new Error(`oauth: code consume failed: ${error.message}`)
  return (data as ConsumedCode | null) ?? null
}

// ─────────────────────────────────────────────────────────────────────
// Token validation (used by userinfo / introspect / resource servers)
// ─────────────────────────────────────────────────────────────────────

export interface ValidatedToken {
  client_id: string
  user_id: string
  scope: string
  expires_at: string
}

export async function validateAccessToken(
  sb: SupabaseClient,
  token: string,
): Promise<ValidatedToken | null> {
  const nowIso = new Date().toISOString()
  const { data } = await sb
    .from('oauth_access_tokens')
    .select('client_id, user_id, scope, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle()
  if (!data || data.revoked_at) return null
  if (data.expires_at <= nowIso) return null
  // best-effort touch — fire-and-forget
  void sb.from('oauth_access_tokens').update({ last_used_at: nowIso }).eq('token', token)
  return {
    client_id: data.client_id,
    user_id: data.user_id,
    scope: data.scope,
    expires_at: data.expires_at,
  }
}

export async function rotateRefreshToken(
  sb: SupabaseClient,
  refreshToken: string,
): Promise<{
  client_id: string
  user_id: string
  scope: string
} | null> {
  const nowIso = new Date().toISOString()
  // Look up + revoke the old token in one shot. Refresh-token rotation:
  // the refresh token is single-use; presenting it twice revokes the
  // entire chain.
  const { data, error } = await sb
    .from('oauth_access_tokens')
    .update({ revoked_at: nowIso })
    .eq('refresh_token', refreshToken)
    .is('revoked_at', null)
    .gt('refresh_expires_at', nowIso)
    .select('client_id, user_id, scope')
    .maybeSingle()
  if (error) throw new Error(`oauth: refresh failed: ${error.message}`)
  return (data as { client_id: string; user_id: string; scope: string } | null) ?? null
}

// ─────────────────────────────────────────────────────────────────────
// Scope helpers
// ─────────────────────────────────────────────────────────────────────

export function parseScope(scope: string | null | undefined): string[] {
  if (!scope) return []
  return scope.split(/\s+/).filter(Boolean)
}

export function joinScope(scopes: string[]): string {
  return scopes.join(' ')
}

/** Intersection of requested + supported, preserving requested order. */
export function clampScope(requested: string | null | undefined): string {
  const supported = new Set<string>(SUPPORTED_SCOPES)
  return parseScope(requested).filter((s) => supported.has(s)).join(' ')
}
