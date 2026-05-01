/**
 * Helpers for the 3-second Slack ack pattern.
 *
 * `ack(payload)` returns an immediate Response. Long-running work is
 * dispatched to `runAsync()` which posts to the response_url when done.
 */
import { respond, postMessage } from './client'
import { jaxxReply } from './blocks'

export type Block = Record<string, unknown>

export function ack(payload?: { text?: string; blocks?: Block[]; response_type?: 'ephemeral' | 'in_channel' }) {
  const body = payload
    ? JSON.stringify({
        response_type: payload.response_type || 'ephemeral',
        text: payload.text,
        blocks: payload.blocks,
      })
    : ''
  return new Response(body, {
    status: 200,
    headers: { 'content-type': payload ? 'application/json' : 'text/plain' },
  })
}

export function ackEphemeral(text: string, blocks?: Block[]) {
  return ack({ response_type: 'ephemeral', text, blocks })
}

export function ackInChannel(text: string, blocks?: Block[]) {
  return ack({ response_type: 'in_channel', text, blocks })
}

/**
 * Run an async task and post the result via response_url. Slack accepts
 * up to 5 follow-ups within 30 minutes.
 */
export async function runAsync(
  responseUrl: string,
  task: () => Promise<{ text?: string; blocks?: Block[] }>,
) {
  try {
    const result = await task()
    await respond(responseUrl, {
      response_type: 'in_channel',
      replace_original: false,
      text: result.text,
      blocks: result.blocks,
    })
  } catch (e) {
    await respond(responseUrl, {
      response_type: 'ephemeral',
      replace_original: false,
      text: `0n error: ${(e as Error).message}`,
    })
  }
}

/**
 * Post Jaxx's reply back to the DM channel. Used by the events handler
 * (message.im).
 */
export async function postJaxxReply(channel: string, text: string, traceId?: string, token?: string) {
  await postMessage({ channel, blocks: jaxxReply(text, traceId), text: text.slice(0, 200) }, token)
}
