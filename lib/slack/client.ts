/**
 * Slack Web API wrapper — minimal, fetch-based, no SDK dep.
 *
 * Every call goes through the token rotation layer in `./tokens.ts`. You
 * may pass a `teamId` to target a specific workspace (multi-tenant); if
 * omitted, the home workspace (or env-var fallback) is used. Raw token
 * strings are no longer accepted by the public surface — that prevented
 * a stale token in a closure from outliving its rotation.
 *
 * On a `token_expired` / `invalid_auth` error from Slack we transparently
 * force-refresh the workspace and retry the call exactly once. This
 * guarantees that any race between "we just minted a token" and "Slack
 * has already rotated it again" still ultimately succeeds.
 */

import { getValidBotToken, refreshWorkspaceToken, TOKEN_DEAD_ERRORS } from './tokens'

const SLACK_API = 'https://slack.com/api'

export type Block = Record<string, unknown>

export interface PostMessageInput {
  channel: string
  text?: string
  blocks?: Block[]
  thread_ts?: string
  unfurl_links?: boolean
}

export interface CallOptions {
  /** Specific workspace to target. Omit for the home workspace. */
  teamId?: string
}

interface SlackResponse {
  ok: boolean
  error?: string
  [k: string]: unknown
}

async function call<T = Record<string, unknown>>(
  method: string,
  body: Record<string, unknown>,
  opts: CallOptions = {},
): Promise<T> {
  // First attempt with whatever token rotation hands us.
  let token = await getValidBotToken(opts.teamId)
  let data = await postSlack(method, body, token)

  if (!data.ok && data.error && TOKEN_DEAD_ERRORS.has(data.error)) {
    // Slack thinks our token is dead even though we believed it was
    // valid. Force a refresh on this workspace (if we have one) and
    // retry exactly once. Two reasons this can happen:
    //   - Two pods raced and the other one rotated the token after we
    //     read it from the DB.
    //   - Slack rotated server-side without an expiry update we saw.
    if (opts.teamId) {
      token = await refreshWorkspaceToken(opts.teamId)
      data = await postSlack(method, body, token)
    }
  }

  if (!data.ok) {
    // Never log the token. The error code is enough to debug.
    throw new Error(`Slack ${method}: ${data.error || 'unknown'}`)
  }
  return data as T
}

async function postSlack(
  method: string,
  body: Record<string, unknown>,
  token: string,
): Promise<SlackResponse> {
  if (!token) throw new Error('Slack token missing')
  const r = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })
  return (await r.json()) as SlackResponse
}

export async function postMessage(input: PostMessageInput, opts: CallOptions = {}) {
  return call<{ ts: string; channel: string }>(
    'chat.postMessage',
    { ...input, unfurl_links: input.unfurl_links ?? false },
    opts,
  )
}

export async function postEphemeral(
  input: PostMessageInput & { user: string },
  opts: CallOptions = {},
) {
  return call('chat.postEphemeral', input as unknown as Record<string, unknown>, opts)
}

export async function dm(userId: string, blocks: Block[], text?: string, opts: CallOptions = {}) {
  // chat.postMessage to a user_id opens a DM channel automatically.
  return postMessage({ channel: userId, blocks, text: text ?? ' ' }, opts)
}

export async function openModal(triggerId: string, view: object, opts: CallOptions = {}) {
  return call('views.open', { trigger_id: triggerId, view }, opts)
}

export async function publishHome(userId: string, view: object, opts: CallOptions = {}) {
  return call('views.publish', { user_id: userId, view }, opts)
}

/**
 * Reply to an incoming command/event using its response_url. Doesn't need
 * a bot token — Slack signs the URL for us.
 */
export async function respond(responseUrl: string, payload: object) {
  const r = await fetch(responseUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error(`response_url ${r.status}`)
}

/**
 * Look up a Slack user's profile by id (for email-based account linking).
 */
export async function userInfo(userId: string, opts: CallOptions = {}) {
  return call<{ user: { id: string; profile: { email?: string; real_name?: string } } }>(
    'users.info',
    { user: userId },
    opts,
  )
}

/**
 * OAuth code → tokens exchange. Used by the install callback only. Does
 * NOT go through the token rotation layer — there's no token to rotate
 * yet. This is the call that *creates* the rotation pair.
 */
export async function oauthV2Access(code: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID || '',
    client_secret: process.env.SLACK_CLIENT_SECRET || '',
    code,
    redirect_uri: redirectUri,
  })
  const r = await fetch(`${SLACK_API}/oauth.v2.access`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  return r.json() as Promise<{
    ok: boolean
    error?: string
    app_id?: string
    team?: { id: string; name: string }
    bot_user_id?: string
    access_token?: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
    scope?: string
    authed_user?: { id: string; access_token?: string; scope?: string }
  }>
}
