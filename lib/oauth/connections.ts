/**
 * Email-keyed identity unification.
 *
 * The principle: one 0nCore account = one email. Whichever provider the user
 * authenticates with (Slack / LinkedIn / Google / CRM), the email returned
 * by the provider is matched against `profiles.email` to resolve the same
 * `oncore_user_id`. All connections feed the same profile.
 *
 * Storage: `user_connections` table — unique on (user_id, provider).
 */

import { createClient } from '@supabase/supabase-js'

export type Provider =
  | 'slack'
  | 'linkedin'
  | 'google'
  | 'crm'
  | 'github'
  | 'figma'
  | 'canva'
  | 'docusign'
  | 'groq'
  | 'openai'
  | 'anthropic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export interface UpsertConnectionInput {
  provider: Provider
  // Provider-side identity
  providerAccountId: string
  providerEmail: string | null
  providerName?: string | null
  providerAvatar?: string | null
  // Tokens
  accessToken: string
  refreshToken?: string | null
  tokenType?: string | null
  expiresAt?: string | null // ISO timestamp
  scopes?: string | string[] | null
  // Optional metadata blob (e.g. team_id for slack, sub for google, location_id for crm)
  metadata?: Record<string, unknown> | null
  // If the caller already knows which 0nCore user to attach this to (for
  // example: the user is signed in and explicitly clicking "Connect"), pass
  // it. Otherwise we resolve by email.
  oncoreUserId?: string | null
  // When true, skip the explicit-id vs provider-email mismatch check. Used
  // for fresh-user flows (e.g. Slack login mode) where we just created the
  // user and the profile.email is not yet settled. Default false.
  skipIdentityCheck?: boolean
}

export interface ResolvedConnection {
  oncoreUserId: string
  oncoreEmail: string
  connectionId: string
  matchedBy: 'explicit' | 'email'
}

export class IdentityMismatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IdentityMismatchError'
  }
}

/**
 * Find a 0nCore user_id by email. Returns null if no match.
 *
 * Looks at `profiles.email` first (canonical) and falls back to
 * `auth.users.email` for legacy rows that haven't been mirrored yet.
 */
export async function findOnCoreUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  if (!email) return null
  const sb = admin()
  const lower = email.toLowerCase()

  // 1. profiles is the fast path
  const { data: profile } = await sb
    .from('profiles')
    .select('id, email')
    .ilike('email', lower)
    .maybeSingle()
  if (profile?.id) return { id: profile.id, email: profile.email || lower }

  // 2. fall through to auth.users
  try {
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const match = data.users.find((u) => (u.email || '').toLowerCase() === lower)
    if (match) return { id: match.id, email: match.email || lower }
  } catch {
    // listUsers can be heavy; profiles miss + listUsers fail = no match
  }
  return null
}

/**
 * Upsert a provider connection for a user. Resolves user by email if
 * `oncoreUserId` not provided. Throws `IdentityMismatchError` if the caller
 * passed an `oncoreUserId` AND a `providerEmail` and they belong to different
 * 0nCore profiles (we never silently overwrite identity).
 */
export async function upsertConnection(input: UpsertConnectionInput): Promise<ResolvedConnection> {
  let userId = input.oncoreUserId || null
  let userEmail = ''
  let matchedBy: ResolvedConnection['matchedBy'] = 'explicit'

  if (!userId) {
    if (!input.providerEmail) {
      throw new Error(
        `${input.provider} connection requires either oncoreUserId or providerEmail`,
      )
    }
    const found = await findOnCoreUserByEmail(input.providerEmail)
    if (!found) {
      throw new IdentityMismatchError(
        `No 0nCore account for ${input.providerEmail}. Sign up at 0ncore.com first, then reconnect ${input.provider}.`,
      )
    }
    userId = found.id
    userEmail = found.email
    matchedBy = 'email'
  } else {
    // Caller passed oncoreUserId. If they also passed providerEmail, sanity
    // check that it matches the profile's email — refuse on mismatch so we
    // never link a different person's account to this user.
    if (input.providerEmail && !input.skipIdentityCheck) {
      const sb = admin()
      const { data: profile } = await sb
        .from('profiles')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle()
      const profileEmail = (profile?.email || '').toLowerCase()
      const provEmail = input.providerEmail.toLowerCase()
      if (profileEmail && provEmail && profileEmail !== provEmail) {
        throw new IdentityMismatchError(
          `${input.provider} email ${provEmail} does not match 0nCore profile email ${profileEmail}. Connections must use the same email.`,
        )
      }
      userEmail = profileEmail || provEmail
    } else if (input.providerEmail) {
      userEmail = input.providerEmail.toLowerCase()
    }
  }

  const sb = admin()
  const scopesArray = Array.isArray(input.scopes)
    ? input.scopes.join(' ')
    : (input.scopes ?? null)

  const row = {
    user_id: userId,
    provider: input.provider,
    service: input.provider, // mirror legacy column
    provider_account_id: input.providerAccountId,
    provider_email: input.providerEmail || null,
    provider_name: input.providerName || null,
    provider_avatar: input.providerAvatar || null,
    access_token: input.accessToken,
    refresh_token: input.refreshToken || null,
    token_type: input.tokenType || 'Bearer',
    expires_at: input.expiresAt || null,
    scopes: scopesArray,
    status: 'active',
    health_status: 'healthy',
    consecutive_failures: 0,
    last_error: null,
    metadata: (input.metadata as Record<string, unknown>) || {},
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await sb
    .from('user_connections')
    .upsert(row, { onConflict: 'user_id,provider' })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`upsert ${input.provider} connection failed: ${error?.message || 'no row'}`)
  }

  return {
    oncoreUserId: userId,
    oncoreEmail: userEmail,
    connectionId: data.id as string,
    matchedBy,
  }
}

export async function listConnections(oncoreUserId: string) {
  const sb = admin()
  const { data, error } = await sb
    .from('user_connections')
    .select('id, provider, provider_email, provider_name, provider_avatar, scopes, status, health_status, expires_at, updated_at')
    .eq('user_id', oncoreUserId)
    .order('updated_at', { ascending: false })

  if (error) return []
  return data || []
}

export async function getConnection(
  oncoreUserId: string,
  provider: Provider,
): Promise<{ access_token: string; refresh_token: string | null; expires_at: string | null; metadata: Record<string, unknown>; provider_email: string | null; scopes: string | null } | null> {
  const sb = admin()
  const { data } = await sb
    .from('user_connections')
    .select('access_token, refresh_token, expires_at, metadata, provider_email, scopes')
    .eq('user_id', oncoreUserId)
    .eq('provider', provider)
    .eq('status', 'active')
    .maybeSingle()
  return data ?? null
}

export async function disconnectProvider(
  oncoreUserId: string,
  provider: Provider,
): Promise<void> {
  const sb = admin()
  await sb
    .from('user_connections')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('user_id', oncoreUserId)
    .eq('provider', provider)
}
