/**
 * Generic slash command runner — used by every per-command route.
 * Verifies signature, resolves caller, delegates to the matching
 * handler, posts result via response_url. Logs to slack_command_log.
 */
import { verifySlackRequest } from '../verify'
import { resolveCaller, logCommand } from '../auth'
import { respond } from '../client'
import { ack } from '../responder'
import { handleDispatcher } from './dispatcher'
import {
  handleExec, handleScore, handlePost, handleScan, handleCrm, handleCourse, handleMarket,
  type CmdInput, type CmdReply,
} from './specialized'

type Handler = (input: CmdInput) => Promise<CmdReply>

const ROUTING: Record<string, Handler> = {
  '/0n': (i) => handleDispatcher({ user: i.user, text: i.text, team_id: i.team_id }),
  '/0nexec': handleExec,
  '/0nscore': handleScore,
  '/0npost': handlePost,
  '/0nscan': handleScan,
  '/0ncrm': handleCrm,
  '/0ncourse': handleCourse,
  '/0nmarket': handleMarket,
}

export async function runSlashCommand(req: Request, commandName: string): Promise<Response> {
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

  const handler = ROUTING[commandName]
  if (!handler) {
    return new Response(`unknown command: ${commandName}`, { status: 404 })
  }

  ;(async () => {
    try {
      const caller = await resolveCaller(slackUserId, teamId)
      const reply = await handler({ user: caller, text, team_id: teamId })
      if (responseUrl) {
        await respond(responseUrl, {
          response_type: reply.ephemeral ? 'ephemeral' : 'in_channel',
          text: reply.text,
        })
      }
      await logCommand({
        team_id: teamId,
        slack_user_id: slackUserId,
        oncore_user_id: caller?.user_id ?? null,
        command: commandName,
        text,
        channel_id: channelId,
        response_status: 200,
        duration_ms: Date.now() - start,
      })
    } catch (e) {
      if (responseUrl) {
        await respond(responseUrl, {
          response_type: 'ephemeral',
          text: `${commandName} error: ${(e as Error).message}`,
        }).catch(() => {})
      }
    }
  })()

  return ack({ response_type: 'ephemeral', text: `${commandName} on it…` })
}
