/**
 * POST /api/slack/oauth/bootstrap
 *
 * One-time migration from a long-lived Slack bot token to the rotating
 * pair (access_token + refresh_token).
 *
 * Slack's `oauth.v2.exchange` endpoint accepts an existing static
 * xoxb-… token and hands back the rotating pair without forcing the
 * user back through the consent screen. After this runs, the workspace
 * row has `rotation_enabled = TRUE` and the rest of the system handles
 * refreshes automatically.
 *
 * Auth: admin-only.
 *   - Authorization: Bearer <supabase access token>
 *   - profile.is_admin must be true
 *
 * Body: { team_id?: string, use_env?: boolean }
 *   - team_id: bootstrap a specific workspace already in the DB
 *   - use_env: bootstrap the home workspace using SLACK_BOT_TOKEN +
 *              SLACK_APP_ID from env. Used for the very first install
 *              that happened before rotation was wired up.
 *
 * Response: { team_id, expires_at } on success.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { bootstrapWorkspace, resetHomeWorkspaceCache } from '@/lib/slack/tokens'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(req: Request) {
  // ─── Admin auth ────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const sb = admin()
  const accessToken = authHeader.slice('Bearer '.length)
  const { data: userResult, error: userErr } = await sb.auth.getUser(accessToken)
  if (userErr || !userResult?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { data: profile } = await sb
    .from('profiles')
    .select('is_admin')
    .eq('id', userResult.user.id)
    .maybeSingle()
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'admin only' }, { status: 403 })
  }

  // ─── Body ──────────────────────────────────────────────────────
  let body: { team_id?: string; use_env?: boolean } = {}
  try {
    body = (await req.json()) as { team_id?: string; use_env?: boolean }
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  // ─── Path A: bootstrap from env (the original install) ────────
  if (body.use_env) {
    const envToken = process.env.SLACK_BOT_TOKEN
    if (!envToken) {
      return NextResponse.json({ error: 'SLACK_BOT_TOKEN not set' }, { status: 400 })
    }
    const teamId = await teamIdForEnvToken(sb, envToken)
    if (!teamId) {
      return NextResponse.json(
        { error: 'cannot resolve team_id for env token; provide team_id explicitly' },
        { status: 400 },
      )
    }
    try {
      const result = await bootstrapWorkspace({ teamId, legacyBotToken: envToken })
      resetHomeWorkspaceCache()
      return NextResponse.json({ ok: true, ...result })
    } catch (e) {
      return NextResponse.json(
        { error: 'bootstrap failed', detail: (e as Error).message },
        { status: 500 },
      )
    }
  }

  // ─── Path B: bootstrap a known team_id using its current bot_token ──
  if (!body.team_id) {
    return NextResponse.json(
      { error: 'team_id required (or set use_env: true)' },
      { status: 400 },
    )
  }
  const { data: ws } = await sb
    .from('slack_workspaces')
    .select('team_id, bot_token, rotation_enabled')
    .eq('team_id', body.team_id)
    .maybeSingle()
  if (!ws || !ws.bot_token) {
    return NextResponse.json({ error: 'workspace not found or has no bot_token' }, { status: 404 })
  }
  if (ws.rotation_enabled) {
    return NextResponse.json({ ok: true, already_enabled: true, team_id: ws.team_id })
  }
  try {
    const result = await bootstrapWorkspace({
      teamId: ws.team_id,
      legacyBotToken: ws.bot_token,
    })
    resetHomeWorkspaceCache()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { error: 'bootstrap failed', detail: (e as Error).message },
      { status: 500 },
    )
  }
}

/**
 * Try to figure out which workspace the env-var SLACK_BOT_TOKEN belongs
 * to. If a row already has the same bot_token we trust that. Otherwise
 * we look for a single workspace matching SLACK_APP_ID. Failing that we
 * accept the only installed workspace.
 *
 * Note: we never log the token itself, only what we matched on.
 */
async function teamIdForEnvToken(
  sb: ReturnType<typeof admin>,
  envToken: string,
): Promise<string | null> {
  // Exact match by bot_token
  const { data: byToken } = await sb
    .from('slack_workspaces')
    .select('team_id')
    .eq('bot_token', envToken)
    .is('uninstalled_at', null)
    .maybeSingle()
  if (byToken?.team_id) return byToken.team_id

  const appId = process.env.SLACK_APP_ID
  if (appId) {
    const { data: byApp } = await sb
      .from('slack_workspaces')
      .select('team_id')
      .eq('app_id', appId)
      .is('uninstalled_at', null)
      .order('created_at', { ascending: true })
      .limit(2)
    if (byApp && byApp.length === 1) return byApp[0].team_id
  }

  // Last resort: only one installed workspace
  const { data: rows } = await sb
    .from('slack_workspaces')
    .select('team_id')
    .is('uninstalled_at', null)
    .order('created_at', { ascending: true })
    .limit(2)
  if (rows && rows.length === 1) return rows[0].team_id
  return null
}
