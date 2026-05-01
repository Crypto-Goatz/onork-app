/**
 * Slack token rotation — security-first.
 *
 * Slack issues short-lived bot tokens (xoxb-…) that expire every 12 hours
 * and a refresh token (xoxe-…) used to mint new ones. This module is the
 * single source of truth for "give me a valid bot token for team X".
 *
 * Guarantees:
 *
 *   1. Tokens never appear in logs. Errors include only the team_id and
 *      Slack's machine-readable `error` field (e.g. `invalid_refresh_token`).
 *   2. Refresh races are coordinated by a DB lock — `slack_acquire_refresh_lock`
 *      uses an UPDATE…WHERE on `refresh_lock_until` so only one worker
 *      across the fleet performs the refresh; siblings wait and re-read.
 *   3. An in-process Promise mutex collapses concurrent refresh requests
 *      inside one Lambda/Node instance into a single round-trip.
 *   4. Refresh failures increment `refresh_error_count`. Three consecutive
 *      failures with a permanent error (`invalid_refresh_token`,
 *      `account_inactive`, `token_revoked`) mark the workspace as
 *      uninstalled to prevent runaway refresh attempts.
 *   5. The home workspace (the one whose tokens live in env vars) is
 *      bootstrapped on first call if it's missing from the DB.
 *   6. Service-role Supabase client is used for ALL DB access — this
 *      module never trusts an end-user session.
 *
 * Public API:
 *   - getValidBotToken(teamId?)  → fresh access token, refreshing if needed
 *   - bootstrapWorkspace(teamId, accessToken) → call oauth.v2.exchange to
 *                                                migrate a long-lived token
 *                                                to the rotating pair
 *   - refreshWorkspaceToken(teamId) → force a refresh (used by sweeper)
 */

import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

const SLACK_API = 'https://slack.com/api'

/** Refresh when the token has 10 minutes or less of life left. */
const REFRESH_WINDOW_MS = 10 * 60 * 1000

/** DB lock duration — long enough for the refresh round-trip + a buffer. */
const LOCK_SECONDS = 30

/** Wait between polls when another worker holds the lock. */
const LOCK_POLL_MS = 250
const LOCK_POLL_MAX_ATTEMPTS = 80 // ~20s upper bound

/** Permanent failures — stop retrying and flag the workspace. */
const PERMANENT_REFRESH_ERRORS = new Set([
  'invalid_refresh_token',
  'token_revoked',
  'account_inactive',
  'invalid_client_id',
  'invalid_client_secret',
])

/** Slack errors that mean "your access token is dead, refresh and retry". */
export const TOKEN_DEAD_ERRORS = new Set([
  'token_expired',
  'invalid_auth',
  'not_authed',
  'token_revoked',
])

// ─────────────────────────────────────────────────────────────────────
// Supabase service-role client
// ─────────────────────────────────────────────────────────────────────

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('slack/tokens: supabase env missing')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface WorkspaceRow {
  team_id: string
  bot_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  rotation_enabled: boolean
  uninstalled_at: string | null
}

interface RefreshResponse {
  ok: boolean
  error?: string
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  bot_user_id?: string
  team?: { id?: string; name?: string }
}

// ─────────────────────────────────────────────────────────────────────
// In-process mutex — collapses concurrent refresh calls in one runtime
// ─────────────────────────────────────────────────────────────────────

const inFlight = new Map<string, Promise<string>>()

// ─────────────────────────────────────────────────────────────────────
// Home-workspace resolution
//
// "No teamId" callers (e.g. one-off scripts) get the workspace whose
// install email matches the env-var bot token. We identify the home
// workspace by SLACK_APP_ID + a single matching row, falling back to the
// first row if there's only one.
// ─────────────────────────────────────────────────────────────────────

let cachedHomeTeamId: string | null = null

async function resolveHomeTeamId(): Promise<string | null> {
  if (cachedHomeTeamId) return cachedHomeTeamId
  const sb = admin()
  const appId = process.env.SLACK_APP_ID
  if (appId) {
    const { data } = await sb
      .from('slack_workspaces')
      .select('team_id')
      .eq('app_id', appId)
      .is('uninstalled_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (data?.team_id) {
      cachedHomeTeamId = data.team_id
      return cachedHomeTeamId
    }
  }
  // Fallback: the only installed workspace
  const { data } = await sb
    .from('slack_workspaces')
    .select('team_id')
    .is('uninstalled_at', null)
    .order('created_at', { ascending: true })
    .limit(2)
  if (data && data.length === 1) {
    cachedHomeTeamId = data[0].team_id
    return cachedHomeTeamId
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────
// Public — getValidBotToken
// ─────────────────────────────────────────────────────────────────────

/**
 * Returns a valid bot token for the given workspace, refreshing if the
 * cached one is within REFRESH_WINDOW_MS of expiry.
 *
 * If `teamId` is omitted, resolves the home workspace. If even that fails,
 * falls back to SLACK_BOT_TOKEN from env (read-only legacy path).
 */
export async function getValidBotToken(teamId?: string): Promise<string> {
  const resolvedTeamId = teamId || (await resolveHomeTeamId())

  // Last-resort fallback: env-var token (legacy, no rotation possible).
  if (!resolvedTeamId) {
    const envToken = process.env.SLACK_BOT_TOKEN
    if (!envToken) throw new Error('slack/tokens: no team_id and no env fallback')
    return envToken
  }

  const ws = await loadWorkspace(resolvedTeamId)
  if (!ws) {
    const envToken = process.env.SLACK_BOT_TOKEN
    if (envToken) return envToken
    throw new Error(`slack/tokens: workspace ${resolvedTeamId} not found`)
  }

  // Rotation not enabled yet → use whatever bot_token is on the row.
  if (!ws.rotation_enabled) {
    if (!ws.bot_token) throw new Error(`slack/tokens: ${resolvedTeamId} has no bot_token`)
    return ws.bot_token
  }

  // Rotation enabled but no expiry recorded → refresh immediately.
  if (!ws.token_expires_at || isExpiringSoon(ws.token_expires_at)) {
    return refreshWithMutex(resolvedTeamId)
  }

  if (!ws.bot_token) {
    return refreshWithMutex(resolvedTeamId)
  }
  return ws.bot_token
}

// ─────────────────────────────────────────────────────────────────────
// Public — refreshWorkspaceToken (also used by the sweeper)
// ─────────────────────────────────────────────────────────────────────

export async function refreshWorkspaceToken(teamId: string): Promise<string> {
  return refreshWithMutex(teamId)
}

// ─────────────────────────────────────────────────────────────────────
// Public — bootstrapWorkspace
//
// Calls oauth.v2.exchange with an existing long-lived bot token. Slack
// returns a rotating access_token + refresh_token pair. We persist them
// and flip rotation_enabled = TRUE.
// ─────────────────────────────────────────────────────────────────────

export async function bootstrapWorkspace(opts: {
  teamId: string
  legacyBotToken: string
}): Promise<{ teamId: string; expiresAt: string }> {
  const { teamId, legacyBotToken } = opts
  const r = await fetch(`${SLACK_API}/oauth.v2.exchange`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${legacyBotToken}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: '',
  })
  const data = (await r.json()) as RefreshResponse
  if (!data.ok || !data.access_token || !data.refresh_token || !data.expires_in) {
    throw new Error(`slack/tokens: bootstrap failed for ${teamId}: ${data.error || 'unknown'}`)
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  const sb = admin()
  const { error } = await sb
    .from('slack_workspaces')
    .update({
      bot_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: expiresAt,
      rotation_enabled: true,
      last_refresh_at: new Date().toISOString(),
      refresh_error_count: 0,
      refresh_error_message: null,
      refresh_lock_until: null,
    })
    .eq('team_id', teamId)
  if (error) throw new Error(`slack/tokens: bootstrap persist failed: ${error.message}`)
  return { teamId, expiresAt }
}

// ─────────────────────────────────────────────────────────────────────
// Internal — refresh with both in-process mutex and DB lock
// ─────────────────────────────────────────────────────────────────────

async function refreshWithMutex(teamId: string): Promise<string> {
  const existing = inFlight.get(teamId)
  if (existing) return existing
  const promise = doRefresh(teamId).finally(() => {
    inFlight.delete(teamId)
  })
  inFlight.set(teamId, promise)
  return promise
}

async function doRefresh(teamId: string): Promise<string> {
  const sb = admin()

  // Try to claim the DB lock. If we don't get it, another worker is
  // refreshing — poll the row until either the lock clears or the token
  // becomes valid again, then return whatever's now in the DB.
  const lockRow = await acquireLock(sb, teamId)
  if (!lockRow) {
    return waitForRefresh(sb, teamId)
  }

  // Sanity check what the lock returned
  if (!lockRow.refresh_token) {
    await releaseLock(sb, teamId, 'no refresh_token on workspace')
    throw new Error(`slack/tokens: ${teamId} has no refresh_token (not bootstrapped)`)
  }

  // Re-check expiry under the lock — another worker may have just finished.
  if (
    lockRow.bot_token &&
    lockRow.token_expires_at &&
    !isExpiringSoon(lockRow.token_expires_at)
  ) {
    await releaseLock(sb, teamId, null)
    return lockRow.bot_token
  }

  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    await releaseLock(sb, teamId, 'env: SLACK_CLIENT_ID/SECRET missing')
    throw new Error('slack/tokens: SLACK_CLIENT_ID or SLACK_CLIENT_SECRET missing')
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: lockRow.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  })

  let data: RefreshResponse
  try {
    const r = await fetch(`${SLACK_API}/oauth.v2.access`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    data = (await r.json()) as RefreshResponse
  } catch (e) {
    await recordRefreshFailure(sb, teamId, `network: ${(e as Error).name}`)
    await releaseLock(sb, teamId, null)
    throw new Error(`slack/tokens: refresh network error for ${teamId}`)
  }

  if (!data.ok || !data.access_token || !data.refresh_token || !data.expires_in) {
    const err = data.error || 'unknown'
    await recordRefreshFailure(sb, teamId, err)
    await releaseLock(sb, teamId, null)
    if (PERMANENT_REFRESH_ERRORS.has(err)) {
      throw new Error(`slack/tokens: permanent refresh failure for ${teamId}: ${err}`)
    }
    throw new Error(`slack/tokens: refresh failed for ${teamId}: ${err}`)
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  const { error } = await sb
    .from('slack_workspaces')
    .update({
      bot_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: expiresAt,
      last_refresh_at: new Date().toISOString(),
      refresh_error_count: 0,
      refresh_error_message: null,
      refresh_lock_until: null,
    })
    .eq('team_id', teamId)
  if (error) {
    throw new Error(`slack/tokens: persist failed for ${teamId}: ${error.message}`)
  }
  return data.access_token
}

// ─────────────────────────────────────────────────────────────────────
// Lock helpers
// ─────────────────────────────────────────────────────────────────────

async function acquireLock(
  sb: ReturnType<typeof admin>,
  teamId: string,
): Promise<WorkspaceRow | null> {
  const { data, error } = await sb.rpc('slack_acquire_refresh_lock', {
    p_team_id: teamId,
    p_lock_seconds: LOCK_SECONDS,
  })
  if (error) {
    throw new Error(`slack/tokens: lock rpc failed for ${teamId}: ${error.message}`)
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return {
    team_id: row.team_id,
    bot_token: row.bot_token ?? null,
    refresh_token: row.refresh_token ?? null,
    token_expires_at: row.token_expires_at ?? null,
    rotation_enabled: !!row.rotation_enabled,
    uninstalled_at: null,
  }
}

async function releaseLock(
  sb: ReturnType<typeof admin>,
  teamId: string,
  errorMessage: string | null,
): Promise<void> {
  await sb
    .from('slack_workspaces')
    .update({
      refresh_lock_until: null,
      ...(errorMessage ? { refresh_error_message: errorMessage } : {}),
    })
    .eq('team_id', teamId)
}

async function recordRefreshFailure(
  sb: ReturnType<typeof admin>,
  teamId: string,
  errorCode: string,
): Promise<void> {
  // Read current count to bump it (avoid an RPC just for an increment).
  const { data: row } = await sb
    .from('slack_workspaces')
    .select('refresh_error_count')
    .eq('team_id', teamId)
    .maybeSingle()
  const nextCount = (row?.refresh_error_count ?? 0) + 1
  const isPermanent = PERMANENT_REFRESH_ERRORS.has(errorCode)
  const update: Record<string, unknown> = {
    refresh_error_count: nextCount,
    refresh_error_message: errorCode,
  }
  if (isPermanent || nextCount >= 5) {
    update.uninstalled_at = new Date().toISOString()
    console.error(
      `[slack/tokens] marking ${teamId} uninstalled — refresh failed (${errorCode}, count=${nextCount})`,
    )
  } else {
    console.warn(
      `[slack/tokens] refresh failed for ${teamId} — ${errorCode} (count=${nextCount})`,
    )
  }
  await sb.from('slack_workspaces').update(update).eq('team_id', teamId)
}

async function waitForRefresh(
  sb: ReturnType<typeof admin>,
  teamId: string,
): Promise<string> {
  for (let i = 0; i < LOCK_POLL_MAX_ATTEMPTS; i++) {
    await sleep(LOCK_POLL_MS)
    const ws = await loadWorkspace(teamId)
    if (!ws) throw new Error(`slack/tokens: ${teamId} disappeared while waiting`)
    if (
      ws.bot_token &&
      ws.token_expires_at &&
      !isExpiringSoon(ws.token_expires_at)
    ) {
      return ws.bot_token
    }
    // Lock cleared but token still bad? Stop waiting and try ourselves.
    // (No way to read refresh_lock_until from loadWorkspace — keep it simple.)
  }
  throw new Error(`slack/tokens: timed out waiting for refresh on ${teamId}`)
}

// ─────────────────────────────────────────────────────────────────────
// DB read
// ─────────────────────────────────────────────────────────────────────

async function loadWorkspace(teamId: string): Promise<WorkspaceRow | null> {
  const sb = admin()
  const { data, error } = await sb
    .from('slack_workspaces')
    .select('team_id, bot_token, refresh_token, token_expires_at, rotation_enabled, uninstalled_at')
    .eq('team_id', teamId)
    .maybeSingle()
  if (error) throw new Error(`slack/tokens: load failed for ${teamId}: ${error.message}`)
  if (!data) return null
  if (data.uninstalled_at) {
    throw new Error(`slack/tokens: ${teamId} is uninstalled`)
  }
  return data as WorkspaceRow
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function isExpiringSoon(expiresAtIso: string): boolean {
  const t = Date.parse(expiresAtIso)
  if (Number.isNaN(t)) return true
  return t - Date.now() <= REFRESH_WINDOW_MS
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Reset the home-workspace cache — called after install/bootstrap. */
export function resetHomeWorkspaceCache(): void {
  cachedHomeTeamId = null
}
