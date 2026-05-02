/**
 * GET /api/slack/oauth
 * Slack redirects here with `?code=...` after the user authorizes the
 * install. We exchange the code for tokens, persist the workspace, link
 * the installer to a 0nCore account if their email matches one, send a
 * welcome DM to the installer in their workspace, then redirect.
 *
 * Multi-workspace contract: this handler works for ANY workspace, not
 * just the original. The bot token, refresh token, team_id, and bot
 * user id are stored per-team in slack_workspaces, and every downstream
 * Slack call routes through getValidBotToken(team_id).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { oauthV2Access, postMessage, userInfo } from '@/lib/slack/client'
import { welcomeCard, notLinkedPrompt } from '@/lib/slack/blocks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  if (error) {
    console.warn('[slack/oauth] user denied or error param:', error)
    return NextResponse.redirect(`${origin}/integrations/slack?slack_error=${encodeURIComponent(error)}`)
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/integrations/slack?slack_error=missing_code`)
  }

  const tokens = await oauthV2Access(code, `${origin}/api/slack/oauth`)
  if (!tokens.ok || !tokens.team || !tokens.access_token) {
    console.error('[slack/oauth] oauth.v2.access failed:', tokens.error || 'unknown')
    return NextResponse.redirect(
      `${origin}/integrations/slack?slack_error=${encodeURIComponent(tokens.error || 'oauth_failed')}`,
    )
  }

  const sb = admin()
  const teamId = tokens.team.id
  const installerSlackId = tokens.authed_user?.id || null

  // ── Resolve installer's email ──────────────────────────────────
  // First try users.identity (uses the user_scope token from
  // identity.email). If that fails — bad/missing user_scope, network
  // hiccup, etc. — fall back to bot users.info, which works because we
  // hold users:read.email. Either way, log the failure mode so we can
  // see why it happened in Vercel logs.
  let installedByEmail: string | null = null
  if (installerSlackId) {
    const userToken = tokens.authed_user?.access_token
    if (userToken) {
      try {
        const r = await fetch('https://slack.com/api/users.identity', {
          headers: { authorization: `Bearer ${userToken}` },
        })
        const ident = (await r.json()) as { ok: boolean; error?: string; user?: { id: string; email?: string } }
        if (ident?.ok && ident.user?.email) {
          installedByEmail = ident.user.email
        } else {
          console.warn(`[slack/oauth] users.identity returned no email for ${teamId}: ${ident?.error || 'no-email'}`)
        }
      } catch (e) {
        console.warn(`[slack/oauth] users.identity threw for ${teamId}:`, (e as Error).message)
      }
    } else {
      console.warn(`[slack/oauth] no authed_user.access_token for ${teamId} — was identity scope granted?`)
    }
  }

  // ── Persist workspace BEFORE any token-routed Slack calls ──────
  // getValidBotToken looks up the row by team_id, so the row must
  // exist before postMessage / userInfo are called for this team.
  const hasRotation = !!(tokens.refresh_token && tokens.expires_in)
  const nowIso = new Date().toISOString()
  const tokenExpiresAt = hasRotation
    ? new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString()
    : null

  const { error: upsertErr } = await sb.from('slack_workspaces').upsert(
    {
      team_id: teamId,
      team_name: tokens.team.name,
      bot_user_id: tokens.bot_user_id,
      bot_token: tokens.access_token,
      refresh_token: hasRotation ? tokens.refresh_token : null,
      token_expires_at: tokenExpiresAt,
      rotation_enabled: hasRotation,
      last_refresh_at: hasRotation ? nowIso : null,
      refresh_error_count: 0,
      refresh_error_message: null,
      refresh_lock_until: null,
      app_id: tokens.app_id,
      installed_by: installerSlackId,
      installed_by_email: installedByEmail,
      installed_at: nowIso,
      scopes: (tokens.scope || '').split(',').filter(Boolean),
      uninstalled_at: null,
    },
    { onConflict: 'team_id' },
  )
  if (upsertErr) {
    console.error(`[slack/oauth] failed to persist workspace ${teamId}:`, upsertErr.message)
    return NextResponse.redirect(`${origin}/integrations/slack?slack_error=persist_failed`)
  }

  // ── Fallback: try bot users.info for email if user-scope path failed ──
  if (!installedByEmail && installerSlackId) {
    try {
      const info = await userInfo(installerSlackId, { teamId })
      installedByEmail = info.user?.profile?.email || null
      if (installedByEmail) {
        await sb
          .from('slack_workspaces')
          .update({ installed_by_email: installedByEmail })
          .eq('team_id', teamId)
      }
    } catch (e) {
      console.warn(`[slack/oauth] bot users.info fallback failed for ${teamId}:`, (e as Error).message)
    }
  }

  // ── Try to match installer to a 0nCore account ─────────────────
  let installedByOnCoreUser: string | null = null
  if (installedByEmail) {
    try {
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
      const match = list?.users?.find(
        (u) => (u.email || '').toLowerCase() === installedByEmail!.toLowerCase(),
      )
      if (match) {
        installedByOnCoreUser = match.id
        await sb
          .from('slack_workspaces')
          .update({ installed_by_oncore_user: installedByOnCoreUser })
          .eq('team_id', teamId)
        await sb.from('slack_user_links').upsert(
          {
            slack_user_id: installerSlackId,
            team_id: teamId,
            oncore_user_id: installedByOnCoreUser,
            email: installedByEmail,
          },
          { onConflict: 'slack_user_id,team_id' },
        )
      }
    } catch (e) {
      console.warn(`[slack/oauth] oncore match failed for ${teamId}:`, (e as Error).message)
    }
  }

  // ── Welcome DM — fires for EVERY install, matched or not ───────
  // This is the proof that the bot is alive in the new workspace.
  // If the installer has a 0nCore account, show the welcome card; if
  // not, show the not-linked prompt with a sign-up CTA.
  if (installerSlackId) {
    const blocks = installedByOnCoreUser && installedByEmail
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
    } catch (e) {
      console.error(`[slack/oauth] welcome DM failed for ${teamId}:`, (e as Error).message)
    }
  }

  // Matched users land on /welcome. Unmatched users — anyone installing
  // before they have a 0nCore account — go to the integrations page so
  // they can sign up and link.
  const dest = installedByOnCoreUser ? '/welcome?slack=connected' : '/integrations/slack?slack=installed'
  return NextResponse.redirect(`${origin}${dest}`)
}
