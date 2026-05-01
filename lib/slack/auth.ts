/**
 * Resolve a Slack identity to a 0nCore user.
 *
 *   1. Look up slack_user_links by (slack_user_id, team_id) — fast path.
 *   2. If missing, ask Slack for the user's email via users.info, match to
 *      auth.users.email, persist the link, return the user_id.
 *   3. Returns null if no 0nCore account matches the Slack email — caller
 *      should respond with a "/0n connect" prompt.
 */

import { createClient } from '@supabase/supabase-js'
import { userInfo } from './client'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export interface OnCoreCaller {
  user_id: string
  email: string
  full_name: string | null
  plan: string | null
  crm_location_id: string | null
  is_admin: boolean
}

export async function resolveCaller(
  slackUserId: string,
  teamId: string,
): Promise<OnCoreCaller | null> {
  const sb = admin()

  // 1. Cached link
  const { data: link } = await sb
    .from('slack_user_links')
    .select('oncore_user_id, email')
    .eq('slack_user_id', slackUserId)
    .eq('team_id', teamId)
    .maybeSingle()
  if (link?.oncore_user_id) {
    return loadProfile(sb, link.oncore_user_id, link.email)
  }

  // 2. Look up workspace bot token
  const { data: ws } = await sb
    .from('slack_workspaces')
    .select('bot_token')
    .eq('team_id', teamId)
    .maybeSingle()
  const botToken = ws?.bot_token || process.env.SLACK_BOT_TOKEN

  // 3. Ask Slack for the email
  let email: string | undefined
  try {
    const info = await userInfo(slackUserId, botToken)
    email = info.user?.profile?.email
  } catch {
    return null
  }
  if (!email) return null

  // 4. Match auth.users by email
  const { data: matches } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
  const u = matches?.users?.find((x) => (x.email || '').toLowerCase() === email!.toLowerCase())
  if (!u) return null

  // 5. Persist link
  await sb
    .from('slack_user_links')
    .upsert({
      slack_user_id: slackUserId,
      team_id: teamId,
      oncore_user_id: u.id,
      email,
    }, { onConflict: 'slack_user_id,team_id' })

  return loadProfile(sb, u.id, email)
}

async function loadProfile(
  sb: ReturnType<typeof admin>,
  userId: string,
  email: string,
): Promise<OnCoreCaller> {
  const { data: profile } = await sb
    .from('profiles')
    .select('full_name, plan, crm_location_id, is_admin')
    .eq('id', userId)
    .maybeSingle()
  return {
    user_id: userId,
    email,
    full_name: profile?.full_name ?? null,
    plan: profile?.plan ?? 'free',
    crm_location_id: profile?.crm_location_id ?? null,
    is_admin: !!profile?.is_admin,
  }
}

/**
 * Audit log — every command + event lands here for debugging.
 */
export async function logCommand(input: {
  team_id: string
  slack_user_id: string
  oncore_user_id?: string | null
  command: string
  text?: string | null
  channel_id?: string | null
  response_status?: number
  duration_ms?: number
}) {
  try {
    await admin().from('slack_command_log').insert({
      team_id: input.team_id,
      slack_user_id: input.slack_user_id,
      oncore_user_id: input.oncore_user_id ?? null,
      command: input.command,
      text: input.text ?? null,
      channel_id: input.channel_id ?? null,
      response_status: input.response_status ?? 200,
      duration_ms: input.duration_ms ?? null,
    })
  } catch (e) {
    console.warn('[slack/auth] command log skipped:', (e as Error).message)
  }
}
