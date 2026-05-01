/**
 * GET /api/slack/oauth
 * Slack redirects here with `?code=...` after the user authorizes the
 * install. We exchange the code for tokens, persist the workspace, link
 * the installer to a 0nCore account if their email matches one, then
 * redirect them back to /welcome with a success flag.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { oauthV2Access, postMessage } from '@/lib/slack/client'
import { welcomeCard } from '@/lib/slack/blocks'

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
    return NextResponse.redirect(`${origin}/integrations/slack?slack_error=${encodeURIComponent(error)}`)
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/integrations/slack?slack_error=missing_code`)
  }

  const tokens = await oauthV2Access(code, `${origin}/api/slack/oauth`)
  if (!tokens.ok || !tokens.team || !tokens.access_token) {
    return NextResponse.redirect(
      `${origin}/integrations/slack?slack_error=${encodeURIComponent(tokens.error || 'oauth_failed')}`,
    )
  }

  const sb = admin()

  // Try to match installer's email to a 0nCore user.
  let installedByOnCoreUser: string | null = null
  let installedByEmail: string | null = null
  try {
    const slackUserId = tokens.authed_user?.id
    if (slackUserId) {
      const r = await fetch('https://slack.com/api/users.identity', {
        headers: { authorization: `Bearer ${tokens.authed_user?.access_token || ''}` },
      })
      const ident = (await r.json()) as { ok: boolean; user?: { id: string; email?: string } }
      installedByEmail = ident?.user?.email || null
    }
    if (installedByEmail) {
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
      const match = list?.users?.find(
        (u) => (u.email || '').toLowerCase() === installedByEmail!.toLowerCase(),
      )
      if (match) installedByOnCoreUser = match.id
    }
  } catch {
    /* identity lookup is best-effort */
  }

  // Persist workspace.
  //
  // If Slack returned a refresh_token + expires_in (rotation enabled on
  // the app), record them and flip rotation_enabled = TRUE so the token
  // refresher takes over. If not (legacy long-lived install), leave
  // rotation_enabled FALSE — the bootstrap endpoint can flip it later.
  const hasRotation = !!(tokens.refresh_token && tokens.expires_in)
  const tokenExpiresAt = hasRotation
    ? new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString()
    : null

  await sb.from('slack_workspaces').upsert(
    {
      team_id: tokens.team.id,
      team_name: tokens.team.name,
      bot_user_id: tokens.bot_user_id,
      bot_token: tokens.access_token,
      refresh_token: hasRotation ? tokens.refresh_token : null,
      token_expires_at: tokenExpiresAt,
      rotation_enabled: hasRotation,
      last_refresh_at: hasRotation ? new Date().toISOString() : null,
      refresh_error_count: 0,
      refresh_error_message: null,
      refresh_lock_until: null,
      app_id: tokens.app_id,
      installed_by_email: installedByEmail,
      installed_by_oncore_user: installedByOnCoreUser,
      scopes: (tokens.scope || '').split(','),
      uninstalled_at: null,
    },
    { onConflict: 'team_id' },
  )

  // Persist user link if we resolved one
  if (installedByOnCoreUser && tokens.authed_user?.id && installedByEmail) {
    await sb.from('slack_user_links').upsert(
      {
        slack_user_id: tokens.authed_user.id,
        team_id: tokens.team.id,
        oncore_user_id: installedByOnCoreUser,
        email: installedByEmail,
      },
      { onConflict: 'slack_user_id,team_id' },
    )

    // Welcome DM with quick-start blocks. Routed through the rotation
    // layer using teamId — by now the workspace row exists, so the
    // tokens module can fetch the freshly-stored access token.
    try {
      await postMessage(
        {
          channel: tokens.authed_user.id,
          blocks: welcomeCard({
            email: installedByEmail,
            full_name: null,
            plan: null,
          }),
          text: `0n is connected to your Slack workspace.`,
        },
        { teamId: tokens.team.id },
      )
    } catch {
      /* welcome DM is best-effort */
    }
  }

  return NextResponse.redirect(`${origin}/welcome?slack=connected`)
}
