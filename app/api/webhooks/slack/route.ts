/**
 * POST /api/webhooks/slack — Slack Events API handler
 *
 * Handles:
 * - url_verification (Slack challenge)
 * - message events → routes through bridge/message pipeline
 * - app_mention events → responds in-thread
 *
 * Slack bot: 0nmcp (B0AR30A0X7B) on 0n workspace
 * Channel: #all-0n (C0AQQ2C00GJ)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveChannelSession, authenticateChannel } from '@/lib/channel-adapter'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || ''
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || ''

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function postSlackMessage(channel: string, text: string, threadTs?: string) {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      text,
      ...(threadTs ? { thread_ts: threadTs } : {}),
    }),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Slack URL verification challenge
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge })
  }

  // Ignore retries (Slack retries if we don't respond in 3s)
  if (req.headers.get('x-slack-retry-num')) {
    return NextResponse.json({ ok: true })
  }

  const event = body.event
  if (!event) return NextResponse.json({ ok: true })

  // Ignore bot messages (prevent loops)
  if (event.bot_id || event.subtype === 'bot_message') {
    return NextResponse.json({ ok: true })
  }

  const channel = event.channel
  const userId = event.user
  const text = event.text?.trim()
  const threadTs = event.thread_ts || event.ts

  if (!text || !userId) return NextResponse.json({ ok: true })

  // Only respond to DMs or mentions
  const isDM = event.channel_type === 'im'
  const isMention = event.type === 'app_mention'
  if (!isDM && !isMention) return NextResponse.json({ ok: true })

  // Strip bot mention from text
  const cleanText = text.replace(/<@[A-Z0-9]+>/g, '').trim()
  if (!cleanText) {
    await postSlackMessage(channel, "What can I help you with? I can manage your CRM, generate workflows, check analytics, and more.", threadTs)
    return NextResponse.json({ ok: true })
  }

  try {
    // Resolve Slack user to 0nCore user via channel_sessions
    const session = await resolveChannelSession('slack', userId)

    // Handle connect command (works whether linked or not)
    const connectMatch = cleanText.match(/^connect\s+(0n_[a-f0-9]+)/i)
    if (connectMatch) {
      const token = connectMatch[1]
      const workspace = body.team_id || ''
      const linked = await authenticateChannel(token, 'slack', userId, workspace)
      if (linked) {
        await postSlackMessage(channel, `Connected! Your Slack account is now linked to 0nCore. You have access to: ${linked.permissions.join(', ')}. Just tell me what you need.`, threadTs)
      } else {
        await postSlackMessage(channel, "Invalid or expired token. Generate a new one at *0ncore.com/dashboard/downloads*.", threadTs)
      }
      return NextResponse.json({ ok: true })
    }

    if (!session) {
      await postSlackMessage(
        channel,
        `Hey <@${userId}>! I don't have your account linked yet.\n\n1. Go to *0ncore.com* and log in\n2. Go to *Dashboard → Downloads*\n3. Generate a 0n token\n4. DM me: \`connect 0n_YOUR_TOKEN\``,
        threadTs
      )
      return NextResponse.json({ ok: true })
    }

    // Load user context
    const admin = getAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('crm_location_id, tier_level, business_name')
      .eq('id', session.userId)
      .single()

    // Route through the bridge message pipeline
    const bridgeRes = await fetch(new URL('/api/bridge/message', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'slack',
        channelIdentity: userId,
        text: cleanText,
      }),
    })

    const result = await bridgeRes.json()

    // Format response for Slack
    let reply: string
    if (result.error) {
      reply = `Error: ${result.error}`
    } else if (result.type === 'radial_burst') {
      reply = `Processing *${result.commands} commands* via radial burst for *${profile?.business_name || 'your business'}*...\n\n`
      reply += result.dotOnFile?.steps?.map((s: { id: string; input: { command: string } }, i: number) =>
        `${i + 1}. ${s.input?.command || s.id}`
      ).join('\n') || ''
    } else {
      reply = result.message || 'Done.'
    }

    // Update message count
    await admin
      .from('channel_sessions')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (session.messageCount || 0) + 1,
      })
      .eq('id', session.id)

    await postSlackMessage(channel, reply, threadTs)
  } catch (err) {
    console.error('[slack webhook] Error:', err)
    await postSlackMessage(channel, "Something went wrong. Try again in a moment.", threadTs)
  }

  return NextResponse.json({ ok: true })
}
