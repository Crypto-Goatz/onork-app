/**
 * GET /api/slack/oauth/install
 * Kicks off the install flow: redirects the user to Slack's authorize URL
 * with the configured scopes.
 */
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BOT_SCOPES = [
  'commands',
  'chat:write',
  'chat:write.public',
  'incoming-webhook',
  'users:read',
  'users:read.email',
  'channels:read',
  'groups:read',
  'im:write',
  'im:history',
  'files:write',
  'links:read',
  'links:write',
  'app_mentions:read',
].join(',')

const USER_SCOPES = ['identity.basic', 'identity.email'].join(',')

export async function GET(req: Request) {
  const clientId = process.env.SLACK_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'SLACK_CLIENT_ID missing on server' },
      { status: 500 },
    )
  }
  const origin = new URL(req.url).origin
  const redirectUri = `${origin}/api/slack/oauth`
  const url = new URL('https://slack.com/oauth/v2/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', BOT_SCOPES)
  url.searchParams.set('user_scope', USER_SCOPES)
  url.searchParams.set('redirect_uri', redirectUri)
  return NextResponse.redirect(url.toString())
}
