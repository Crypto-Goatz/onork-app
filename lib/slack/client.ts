/**
 * Slack Web API wrapper — minimal, fetch-based, no SDK dep.
 *
 * Pattern: every method takes the bot token explicitly (because we
 * support multiple workspace installs via slack_workspaces). Falls
 * back to env SLACK_BOT_TOKEN for the home workspace.
 */

const SLACK_API = 'https://slack.com/api'

export type Block = Record<string, unknown>

export interface PostMessageInput {
  channel: string
  text?: string
  blocks?: Block[]
  thread_ts?: string
  unfurl_links?: boolean
}

function defaultToken(): string {
  return process.env.SLACK_BOT_TOKEN || ''
}

async function call<T = Record<string, unknown>>(
  method: string,
  body: Record<string, unknown>,
  token = defaultToken(),
): Promise<T> {
  if (!token) throw new Error('Slack token missing')
  const r = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })
  const data = (await r.json()) as { ok: boolean; error?: string } & Record<string, unknown>
  if (!data.ok) throw new Error(`Slack ${method}: ${data.error || 'unknown'}`)
  return data as T
}

export async function postMessage(input: PostMessageInput, token?: string) {
  return call<{ ts: string; channel: string }>(
    'chat.postMessage',
    { ...input, unfurl_links: input.unfurl_links ?? false },
    token,
  )
}

export async function postEphemeral(
  input: PostMessageInput & { user: string },
  token?: string,
) {
  return call('chat.postEphemeral', input as unknown as Record<string, unknown>, token)
}

export async function dm(userId: string, blocks: Block[], text?: string, token?: string) {
  // chat.postMessage to a user_id opens a DM channel automatically.
  return postMessage({ channel: userId, blocks, text: text ?? ' ' }, token)
}

export async function openModal(triggerId: string, view: object, token?: string) {
  return call('views.open', { trigger_id: triggerId, view }, token)
}

export async function publishHome(userId: string, view: object, token?: string) {
  return call('views.publish', { user_id: userId, view }, token)
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
export async function userInfo(userId: string, token?: string) {
  return call<{ user: { id: string; profile: { email?: string; real_name?: string } } }>(
    'users.info',
    { user: userId },
    token,
  )
}

/**
 * OAuth code → tokens exchange. Used by the install callback only.
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
    scope?: string
    authed_user?: { id: string; access_token?: string; scope?: string }
  }>
}
