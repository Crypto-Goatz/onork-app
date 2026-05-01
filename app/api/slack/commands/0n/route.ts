/**
 * POST /api/slack/commands/0n — master dispatcher.
 */
import { verifySlackRequest } from '@/lib/slack/verify'
import { resolveCaller, logCommand } from '@/lib/slack/auth'
import { handleDispatcher } from '@/lib/slack/handlers/dispatcher'
import { ack } from '@/lib/slack/responder'
import { respond } from '@/lib/slack/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const start = Date.now()
  const raw = await req.text()
  const v = verifySlackRequest(req.headers, raw)
  if (!v.ok) return new Response(`invalid signature: ${v.reason}`, { status: 401 })

  const params = new URLSearchParams(raw)
  const slackUserId = params.get('user_id') || ''
  const teamId = params.get('team_id') || ''
  const text = params.get('text') || ''
  const responseUrl = params.get('response_url') || ''
  const channelId = params.get('channel_id') || ''

  // Async work, immediate ack
  ;(async () => {
    try {
      const caller = await resolveCaller(slackUserId, teamId)
      const reply = await handleDispatcher({ user: caller, text, team_id: teamId })
      if (responseUrl) {
        await respond(responseUrl, {
          response_type: reply.ephemeral ? 'ephemeral' : 'in_channel',
          text: reply.text,
          blocks: reply.blocks,
        })
      }
      await logCommand({
        team_id: teamId,
        slack_user_id: slackUserId,
        oncore_user_id: caller?.user_id ?? null,
        command: '/0n',
        text,
        channel_id: channelId,
        response_status: 200,
        duration_ms: Date.now() - start,
      })
    } catch (e) {
      if (responseUrl) {
        await respond(responseUrl, {
          response_type: 'ephemeral',
          text: `0n error: ${(e as Error).message}`,
        }).catch(() => {})
      }
    }
  })()

  return ack({ response_type: 'ephemeral', text: '0n is on it…' })
}
