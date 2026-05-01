/**
 * POST /api/slack/interactivity
 *
 * Receives Block Kit button clicks, modal submits, message + global
 * shortcuts. Verifies signature, dispatches by callback_id.
 */
import { verifySlackRequest } from '@/lib/slack/verify'
import { resolveCaller } from '@/lib/slack/auth'
import { respond, postMessage } from '@/lib/slack/client'
import { runJaxx } from '@/lib/slack/jaxx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SlackPayload {
  type: 'block_actions' | 'view_submission' | 'message_action' | 'shortcut'
  user?: { id: string; team_id?: string }
  team?: { id: string }
  trigger_id?: string
  response_url?: string
  callback_id?: string
  actions?: Array<{ action_id: string; value?: string; type: string }>
  view?: { callback_id?: string; state?: { values?: Record<string, Record<string, { value?: string }>> } }
  message?: { text?: string; ts?: string }
  channel?: { id: string }
}

export async function POST(req: Request) {
  const raw = await req.text()
  const v = verifySlackRequest(req.headers, raw)
  if (!v.ok) return new Response(`invalid signature: ${v.reason}`, { status: 401 })

  const params = new URLSearchParams(raw)
  const payloadStr = params.get('payload') || '{}'
  let payload: SlackPayload
  try {
    payload = JSON.parse(payloadStr) as SlackPayload
  } catch {
    return new Response('bad payload', { status: 400 })
  }

  const teamId = payload.team?.id || payload.user?.team_id || ''
  const slackUserId = payload.user?.id || ''

  ;(async () => {
    try {
      const caller = await resolveCaller(slackUserId, teamId)
      const responseUrl = payload.response_url || ''

      // BLOCK ACTIONS — buttons
      if (payload.type === 'block_actions' && payload.actions?.length) {
        const action = payload.actions[0]
        await routeAction(action, { caller, responseUrl, channel: payload.channel?.id })
        return
      }

      // VIEW SUBMISSION — modal submitted
      if (payload.type === 'view_submission') {
        // v1: nothing custom yet
        return
      }

      // MESSAGE ACTION / SHORTCUT
      if (payload.type === 'message_action' || payload.type === 'shortcut') {
        const cb = payload.callback_id || ''
        if (caller && responseUrl) {
          const r = await runJaxx({
            user: caller,
            prompt: `Shortcut "${cb}" was triggered. Respond with what would happen and the next step.`,
            surface: 'slack:cmd',
          })
          await respond(responseUrl, { response_type: 'ephemeral', text: r.text })
        }
        return
      }
    } catch (e) {
      console.error('[slack/interactivity]', (e as Error).message)
    }
  })()

  return new Response('', { status: 200 })
}

async function routeAction(
  action: { action_id: string; value?: string },
  ctx: {
    caller: Awaited<ReturnType<typeof resolveCaller>>
    responseUrl: string
    channel?: string
  },
) {
  const { action_id, value } = action
  const { caller, responseUrl, channel } = ctx

  if (!caller) {
    if (responseUrl) {
      await respond(responseUrl, { response_type: 'ephemeral', text: 'Link your account first.' })
    }
    return
  }

  // Home buttons
  if (action_id === 'home_open_exec') {
    if (responseUrl) await respond(responseUrl, { response_type: 'ephemeral', text: 'Opening 0nExec → https://www.0ncore.com/dashboard/exec' })
    return
  }
  if (action_id === 'home_run_workflow') {
    if (responseUrl) await respond(responseUrl, { response_type: 'ephemeral', text: 'Run a workflow: tell me which one in DM, e.g. "spawn lead-magnet-engine"' })
    return
  }
  if (action_id === 'home_gen_post') {
    if (responseUrl) await respond(responseUrl, { response_type: 'ephemeral', text: 'Use `/0npost <topic>` and I\'ll draft it.' })
    return
  }
  if (action_id === 'home_help') {
    if (responseUrl) {
      await respond(responseUrl, {
        response_type: 'ephemeral',
        text: '*0n*: 8 slash commands plus DM Jaxx. Try `/0n help` for the full list.',
      })
    }
    return
  }

  // Generic fallback — pipe action through Jaxx
  const reply = await runJaxx({
    user: caller,
    prompt: `Slack button "${action_id}" was clicked${value ? ` with value "${value}"` : ''}. Respond with the natural next step.`,
    surface: 'slack:cmd',
  })
  if (responseUrl) {
    await respond(responseUrl, { response_type: 'ephemeral', text: reply.text })
  } else if (channel) {
    await postMessage({ channel, text: reply.text })
  }
}
