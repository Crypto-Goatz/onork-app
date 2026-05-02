/**
 * GET /api/slack/oauth — Slack BOT install callback.
 *
 * Slack redirects here with `?code=...` after the user authorizes the
 * bot install. We exchange the code for tokens, persist the workspace,
 * link the installer to a 0nCore account if their email matches one,
 * send a welcome DM to the installer, then redirect.
 *
 * Multi-workspace contract: this handler works for ANY workspace, not
 * just the original. The bot token, refresh token, team_id, and bot
 * user id are stored per-team in slack_workspaces, and every downstream
 * Slack call routes through getValidBotToken(team_id).
 *
 * IMPORTANT: this endpoint is for BOT install only. Identity-scope
 * (`identity.*`) tokens for "Sign in with Slack" go through
 * /api/auth/connect/slack/callback. If we detect the response is an
 * identity-only login, we redirect to that handler with the same code.
 */
import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { oauthV2Access, postMessage, userInfo } from '@/lib/slack/client'
import { welcomeCard, notLinkedPrompt } from '@/lib/slack/blocks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOG = '[slack/oauth]'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const origin = url.origin

  console.log(`${LOG} install callback hit — origin=${origin} hasCode=${!!code} hasError=${!!error}`)

  if (error) {
    console.warn(`${LOG} user denied or error param:`, error)
    return NextResponse.redirect(`${origin}/integrations/slack?slack_error=${encodeURIComponent(error)}`)
  }
  if (!code) {
    console.warn(`${LOG} no code param`)
    return NextResponse.redirect(`${origin}/integrations/slack?slack_error=missing_code`)
  }

  // ── Exchange code → tokens ─────────────────────────────────────
  console.log(`${LOG} exchanging code for tokens`)
  const tokens = await oauthV2Access(code, `${origin}/api/slack/oauth`)
  if (!tokens.ok) {
    console.error(`${LOG} oauth.v2.access failed:`, tokens.error || 'unknown')
    return NextResponse.redirect(
      `${origin}/integrations/slack?slack_error=${encodeURIComponent(tokens.error || 'oauth_failed')}`,
    )
  }

  // ── Identity-only response? Hand off to the login callback ─────
  // Identity-scope (identity.*) tokens are USER LOGIN tokens, not bot
  // installs. They have a different shape (no bot_user_id, no chat:write)
  // and belong on /api/auth/connect/slack/callback. If the authorize
  // call returned only user identity scopes, redirect there with the
  // ORIGINAL code so the connect callback can re-exchange against its
  // own redirect_uri.
  const userScope = (tokens.authed_user?.scope || '') as string
  const userScopes = userScope.split(',').map((s) => s.trim()).filter(Boolean)
  const botScope = (tokens.scope || '') as string
  const botScopes = botScope.split(',').map((s) => s.trim()).filter(Boolean)
  const onlyIdentityScopes =
    userScopes.length > 0 &&
    userScopes.every((s) => s.startsWith('identity.')) &&
    botScopes.length === 0
  if (onlyIdentityScopes) {
    console.log(`${LOG} identity-only response — redirecting to /api/auth/connect/slack/callback`)
    // Build the connect callback URL. We re-pass the code so that
    // handler can exchange it against its own redirect_uri (Slack
    // requires redirect_uri match on the /token call). If the user
    // already used the code to mint a token here, the connect handler
    // will fail — but that's the correct behavior because identity
    // installs should go through that handler from the start.
    const dest = new URL(`${origin}/api/auth/connect/slack/callback`)
    dest.searchParams.set('code', code)
    // Synthesize a state so the connect handler treats this as a login.
    const state = Buffer.from(
      JSON.stringify({ userId: 'login', mode: 'login', ts: String(Date.now()) }),
    ).toString('base64url')
    dest.searchParams.set('state', state)
    return NextResponse.redirect(dest.toString())
  }

  if (!tokens.team || !tokens.access_token) {
    console.error(`${LOG} bot install missing team or access_token`)
    return NextResponse.redirect(`${origin}/integrations/slack?slack_error=oauth_failed`)
  }

  const sb = admin()
  const teamId = tokens.team.id
  const installerSlackId = tokens.authed_user?.id || null
  console.log(`${LOG} bot install for team=${teamId} installer=${installerSlackId}`)

  // ── Resolve installer email (best-effort) ──────────────────────
  let installedByEmail: string | null = null
  if (installerSlackId) {
    const userToken = tokens.authed_user?.access_token
    if (userToken) {
      try {
        const r = await fetch('https://slack.com/api/users.identity', {
          headers: { authorization: `Bearer ${userToken}` },
        })
        const ident = (await r.json()) as {
          ok: boolean
          error?: string
          user?: { id: string; email?: string }
        }
        if (ident?.ok && ident.user?.email) {
          installedByEmail = ident.user.email
          console.log(`${LOG} resolved installer email via users.identity`)
        } else {
          console.warn(
            `${LOG} users.identity returned no email for ${teamId}: ${ident?.error || 'no-email'}`,
          )
        }
      } catch (e) {
        console.warn(`${LOG} users.identity threw for ${teamId}:`, (e as Error).message)
      }
    } else {
      console.warn(`${LOG} no authed_user.access_token for ${teamId} — was identity scope granted?`)
    }
  }

  // ── Persist workspace — defensive, multi-pass ──────────────────
  // Some production schemas only have a subset of the columns the
  // newer migrations add. Try the full row first; if Supabase rejects
  // an unknown column or array<>text mismatch, fall back to the
  // minimum-known set and persist optional fields one at a time.
  const hasRotation = !!(tokens.refresh_token && tokens.expires_in)
  const nowIso = new Date().toISOString()
  const tokenExpiresAt = hasRotation
    ? new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString()
    : null
  const scopeString = botScopes.join(',')

  const persisted = await persistWorkspace(sb, {
    team_id: teamId,
    team_name: tokens.team.name,
    bot_token: tokens.access_token,
    app_id: tokens.app_id,
    scope: scopeString,
    installed_by: installerSlackId,
    installed_at: nowIso,
    refresh_token: hasRotation ? tokens.refresh_token! : null,
    token_expires_at: tokenExpiresAt,
    refresh_lock_until: null,
    refresh_error_count: 0,
    rotation_enabled: hasRotation,
    bot_user_id: tokens.bot_user_id ?? null,
    installed_by_email: installedByEmail,
    scopes: botScopes,
  })

  if (!persisted.ok) {
    console.error(`${LOG} failed to persist workspace ${teamId}:`, persisted.error)
    return NextResponse.redirect(
      `${origin}/integrations/slack?slack_error=persist_failed&detail=${encodeURIComponent(
        persisted.error || 'unknown',
      )}`,
    )
  }
  console.log(`${LOG} persisted workspace ${teamId}`)

  // ── Fallback: bot users.info for email if user-scope path failed ──
  if (!installedByEmail && installerSlackId) {
    try {
      const info = await userInfo(installerSlackId, { teamId })
      const email = info.user?.profile?.email || null
      if (email) {
        installedByEmail = email
        await tryUpdate(sb, teamId, { installed_by_email: email })
        console.log(`${LOG} resolved installer email via bot users.info`)
      }
    } catch (e) {
      console.warn(`${LOG} bot users.info fallback failed for ${teamId}:`, (e as Error).message)
    }
  }

  // ── Match installer to a 0nCore account ────────────────────────
  let installedByOnCoreUser: string | null = null
  if (installedByEmail) {
    try {
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
      const match = list?.users?.find(
        (u) => (u.email || '').toLowerCase() === installedByEmail!.toLowerCase(),
      )
      if (match) {
        installedByOnCoreUser = match.id
        await tryUpdate(sb, teamId, { installed_by_oncore_user: installedByOnCoreUser })
        await sb
          .from('slack_user_links')
          .upsert(
            {
              slack_user_id: installerSlackId,
              team_id: teamId,
              oncore_user_id: installedByOnCoreUser,
              email: installedByEmail,
            },
            { onConflict: 'slack_user_id,team_id' },
          )
          .then(({ error }) => {
            if (error) console.warn(`${LOG} slack_user_links upsert failed:`, error.message)
          })
        console.log(`${LOG} matched installer to 0nCore user ${installedByOnCoreUser}`)
      } else {
        console.log(`${LOG} no 0nCore user found for installer email`)
      }
    } catch (e) {
      console.warn(`${LOG} oncore match failed for ${teamId}:`, (e as Error).message)
    }
  }

  // ── Welcome DM ─────────────────────────────────────────────────
  // Fires for every install — the proof that the bot is alive in the
  // new workspace. The DM uses chat.postMessage with the installer's
  // user id as channel; Slack opens the DM channel automatically.
  if (installerSlackId) {
    const blocks =
      installedByOnCoreUser && installedByEmail
        ? welcomeCard({ email: installedByEmail, full_name: null, plan: null })
        : notLinkedPrompt()
    const fallback = installedByOnCoreUser
      ? '0n is connected to your Slack workspace.'
      : '0n is installed — link your account at 0ncore.com to get started.'
    try {
      await postMessage(
        { channel: installerSlackId, blocks, text: fallback },
        { teamId },
      )
      console.log(`${LOG} welcome DM sent to ${installerSlackId} on ${teamId}`)
    } catch (e) {
      console.error(`${LOG} welcome DM failed for ${teamId}:`, (e as Error).message)
    }
  }

  const dest = installedByOnCoreUser
    ? '/welcome?slack=connected'
    : '/integrations/slack?slack=installed'
  return NextResponse.redirect(`${origin}${dest}`)
}

// ─────────────────────────────────────────────────────────────────────
// Defensive persistence
//
// Tries the most expressive shape first. If Supabase rejects an unknown
// column ("column X does not exist") or a type mismatch, we fall back
// to the minimum-required set and apply optional fields with separate
// updates that ignore unknown-column errors.
// ─────────────────────────────────────────────────────────────────────

interface FullRow {
  team_id: string
  team_name: string | undefined
  bot_token: string
  app_id: string | undefined
  scope: string
  installed_by: string | null
  installed_at: string
  refresh_token: string | null
  token_expires_at: string | null
  refresh_lock_until: string | null
  refresh_error_count: number
  rotation_enabled: boolean
  bot_user_id: string | null
  installed_by_email: string | null
  scopes: string[]
}

async function persistWorkspace(
  sb: SupabaseClient,
  row: FullRow,
): Promise<{ ok: boolean; error?: string }> {
  // Pass 1 — minimum-known columns the user confirmed exist in prod.
  // Anything beyond this is layered on with tryUpdate after.
  const minimum: Record<string, unknown> = {
    team_id: row.team_id,
    team_name: row.team_name,
    bot_token: row.bot_token,
    app_id: row.app_id,
    scope: row.scope,
    installed_by: row.installed_by,
    installed_at: row.installed_at,
    refresh_token: row.refresh_token,
    token_expires_at: row.token_expires_at,
    refresh_lock_until: row.refresh_lock_until,
    refresh_error_count: row.refresh_error_count,
    rotation_enabled: row.rotation_enabled,
  }
  const { error: e1 } = await sb
    .from('slack_workspaces')
    .upsert(minimum, { onConflict: 'team_id' })
  if (e1) {
    console.error(`${LOG} minimum upsert failed:`, e1.message)
    // Last-ditch: try the absolute minimum (just the auth-critical fields)
    const bare: Record<string, unknown> = {
      team_id: row.team_id,
      bot_token: row.bot_token,
      refresh_token: row.refresh_token,
      token_expires_at: row.token_expires_at,
      rotation_enabled: row.rotation_enabled,
    }
    const { error: e2 } = await sb
      .from('slack_workspaces')
      .upsert(bare, { onConflict: 'team_id' })
    if (e2) {
      console.error(`${LOG} bare upsert failed too:`, e2.message)
      return { ok: false, error: e2.message }
    }
    console.warn(`${LOG} fell back to bare upsert — some columns were rejected`)
  }

  // Layer optional fields. Each is a no-op if the column doesn't exist.
  await tryUpdate(sb, row.team_id, { bot_user_id: row.bot_user_id })
  await tryUpdate(sb, row.team_id, { installed_by_email: row.installed_by_email })
  await tryUpdate(sb, row.team_id, { scopes: row.scopes })
  await tryUpdate(sb, row.team_id, { last_refresh_at: row.rotation_enabled ? row.installed_at : null })
  await tryUpdate(sb, row.team_id, { refresh_error_message: null })
  await tryUpdate(sb, row.team_id, { uninstalled_at: null })

  return { ok: true }
}

async function tryUpdate(
  sb: SupabaseClient,
  teamId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { error } = await sb.from('slack_workspaces').update(fields).eq('team_id', teamId)
  if (error) {
    // Unknown-column / type-mismatch is expected here — log at debug, not error.
    console.log(
      `${LOG} optional update skipped for ${teamId} (${Object.keys(fields).join(',')}): ${error.message}`,
    )
  }
}
