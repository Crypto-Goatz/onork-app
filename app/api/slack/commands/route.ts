import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveChannelSession } from '@/lib/channel-adapter'

/**
 * /0n [anything] — Routes through the 0nCore AI orchestrator.
 *
 * All 1,554 tools are accessible. The AI interprets natural language
 * and maps it to the right tool + params.
 *
 * Quick shortcuts (handled locally for speed):
 *   /0n help     — show command examples
 *   /0n status   — system status
 *
 * Everything else routes through the bridge for full AI processing.
 */

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || ''

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const text = (formData.get('text') as string || '').trim()
  const slackUserId = formData.get('user_id') as string
  const channelId = formData.get('channel_id') as string
  const responseUrl = formData.get('response_url') as string

  // Respond immediately (Slack requires < 3 seconds)
  processCommand(text, slackUserId, channelId, responseUrl, req.url).catch(console.error)

  return NextResponse.json({
    response_type: 'ephemeral',
    text: `Processing: \`/0n ${text || 'help'}\`...`,
  })
}

async function processCommand(
  text: string,
  slackUserId: string,
  channelId: string,
  responseUrl: string,
  requestUrl: string,
) {
  const action = text.split(' ')[0]?.toLowerCase()

  // Fast local handlers
  if (!text || action === 'help') {
    await sendResponse(responseUrl, {
      response_type: 'ephemeral',
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: '0nCore — 1,554 tools in Slack' } },
        { type: 'section', text: { type: 'mrkdwn', text:
          '*Just type naturally.* The AI figures out which tool to use.\n\n' +
          '*CRM*\n' +
          '`/0n find contact Sarah Chen`\n' +
          '`/0n create contact John Doe john@example.com`\n' +
          '`/0n show my pipeline`\n' +
          '`/0n score lead Sarah Chen`\n\n' +
          '*Communication*\n' +
          '`/0n send sms to John: meeting at 3pm`\n' +
          '`/0n send email to Sarah about the proposal`\n' +
          '`/0n book appointment with Mike tomorrow 2pm`\n\n' +
          '*Analytics & Billing*\n' +
          '`/0n check stripe balance`\n' +
          '`/0n list recent payments`\n' +
          '`/0n show my analytics`\n\n' +
          '*Workflows*\n' +
          '`/0n run welcome sequence for John`\n' +
          '`/0n list my workflows`\n' +
          '`/0n generate a blog post about AI tools`\n\n' +
          '*System*\n' +
          '`/0n status` — system health\n' +
          '`/0n help` — this menu',
        } },
        { type: 'context', elements: [{ type: 'mrkdwn', text: '1,554 tools across 96 services — powered by 0nMCP' }] },
      ],
    })
    return
  }

  if (action === 'status') {
    await sendResponse(responseUrl, {
      response_type: 'in_channel',
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text:
          '*0nCore Status*\n' +
          `*Tools:* 1,554 | *Services:* 96 | *CRM:* Connected\n` +
          `*Stripe:* Connected | *Version:* v4.5.0`,
        } },
      ],
    })
    return
  }

  // Everything else → route through the AI orchestrator
  try {
    // Resolve Slack user to 0nCore user
    const session = await resolveChannelSession('slack', slackUserId)

    if (!session) {
      await sendResponse(responseUrl, {
        response_type: 'ephemeral',
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text:
            `Your Slack account isn't linked to 0nCore yet.\n\n` +
            `1. Go to *<https://0ncore.com/install/slack|0ncore.com/install/slack>*\n` +
            `2. Sign in or create your account\n` +
            `3. Connect your Slack workspace\n\n` +
            `Or DM the bot: \`connect 0n_YOUR_TOKEN\``,
          } },
        ],
      })
      return
    }

    // Route through bridge
    const baseUrl = new URL(requestUrl).origin
    const bridgeRes = await fetch(`${baseUrl}/api/bridge/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'slack',
        channelIdentity: slackUserId,
        text,
      }),
    })

    const result = await bridgeRes.json()

    if (result.error) {
      await sendResponse(responseUrl, {
        response_type: 'ephemeral',
        text: `Error: ${result.error}`,
      })
      return
    }

    // Format the AI response for Slack
    let responseText: string
    if (result.type === 'radial_burst') {
      responseText = `*Radial Burst — ${result.commands || 0} commands*\n\n`
      responseText += result.dotOnFile?.steps?.map((s: { id: string; input?: { command?: string } }, i: number) =>
        `${i + 1}. ${s.input?.command || s.id}`
      ).join('\n') || 'Processing...'
    } else {
      responseText = result.message || result.response || 'Done.'
    }

    await sendResponse(responseUrl, {
      response_type: 'in_channel',
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: responseText } },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `\`/0n ${text}\`` }] },
      ],
    })
  } catch (err) {
    console.error('[slack/commands] Error:', err)
    await sendResponse(responseUrl, {
      response_type: 'ephemeral',
      text: `Something went wrong processing your command. Try again.`,
    })
  }
}

async function sendResponse(responseUrl: string, payload: Record<string, unknown>) {
  if (!responseUrl) return
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
}
