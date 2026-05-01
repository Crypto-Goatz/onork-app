/**
 * POST /api/slack/events
 *
 * Slack Events API endpoint:
 *   - url_verification challenge handshake
 *   - app_mention                     → /0n style help in-channel
 *   - message.im                      → Jaxx DM chat (the headline UX)
 *   - app_home_opened                 → publish App Home view
 *   - link_shared                     → unfurl 0ncore.com / 0nmcp.com URLs
 *
 * Every payload is HMAC-verified before any work happens. Event handling
 * is fire-and-forget after the 200 ack — Slack retries on timeout but we
 * dedupe via event_id.
 */
import { NextResponse } from 'next/server'
import { verifySlackRequest } from '@/lib/slack/verify'
import { resolveCaller, logCommand } from '@/lib/slack/auth'
import { postJaxxReply } from '@/lib/slack/responder'
import { postMessage, publishHome } from '@/lib/slack/client'
import { welcomeCard, notLinkedPrompt, jaxxReply } from '@/lib/slack/blocks'
import { runJaxx } from '@/lib/slack/jaxx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SlackEvent {
  type: string
  event_id?: string
  event_time?: number
  team_id?: string
  challenge?: string
  event?: {
    type: string
    user?: string
    bot_id?: string
    text?: string
    channel?: string
    channel_type?: string
    ts?: string
    tab?: string
    links?: Array<{ url: string; domain: string }>
  }
}

const recentEventIds = new Set<string>()
function dedupe(id?: string): boolean {
  if (!id) return false
  if (recentEventIds.has(id)) return true
  recentEventIds.add(id)
  if (recentEventIds.size > 500) {
    const arr = Array.from(recentEventIds)
    recentEventIds.clear()
    arr.slice(-300).forEach((x) => recentEventIds.add(x))
  }
  return false
}

export async function POST(req: Request) {
  const raw = await req.text()
  let body: SlackEvent
  try {
    body = JSON.parse(raw) as SlackEvent
  } catch {
    return new Response('bad json', { status: 400 })
  }

  // 1. URL verification handshake (no signature on this one)
  if (body.type === 'url_verification') {
    return new Response(body.challenge ?? '', { status: 200, headers: { 'content-type': 'text/plain' } })
  }

  // 2. Verify signature on all real events
  const v = verifySlackRequest(req.headers, raw)
  if (!v.ok) {
    return new Response(`invalid signature: ${v.reason}`, { status: 401 })
  }

  // 3. Dedupe by event_id
  if (dedupe(body.event_id)) return NextResponse.json({ ok: true, dedupe: true })

  const ev = body.event
  const teamId = body.team_id || ''

  // 200 ack immediately, handle async
  ;(async () => {
    if (!ev) return
    try {
      if (ev.bot_id) return // ignore bot loops
      switch (ev.type) {
        case 'message':
          if (ev.channel_type !== 'im' || !ev.user || !ev.channel || !ev.text) return
          return handleDm({
            slackUserId: ev.user,
            teamId,
            channel: ev.channel,
            text: ev.text,
          })
        case 'app_mention':
          if (!ev.user || !ev.channel || !ev.text) return
          return handleMention({
            slackUserId: ev.user,
            teamId,
            channel: ev.channel,
            text: ev.text,
            ts: ev.ts,
          })
        case 'app_home_opened':
          if (!ev.user || ev.tab !== 'home') return
          return handleHomeOpened({ slackUserId: ev.user, teamId })
        default:
          return
      }
    } catch (e) {
      console.error('[slack/events] handler error:', (e as Error).message)
    }
  })()

  return NextResponse.json({ ok: true })
}

// ─────────────────────────────────────────────────────────────
// handlers
// ─────────────────────────────────────────────────────────────

async function handleDm({
  slackUserId,
  teamId,
  channel,
  text,
}: {
  slackUserId: string
  teamId: string
  channel: string
  text: string
}) {
  const start = Date.now()
  const caller = await resolveCaller(slackUserId, teamId)
  if (!caller) {
    await postMessage({ channel, blocks: notLinkedPrompt(), text: 'Not linked yet' })
    await logCommand({
      team_id: teamId,
      slack_user_id: slackUserId,
      command: 'jaxx_dm',
      text,
      channel_id: channel,
      response_status: 401,
    })
    return
  }
  const reply = await runJaxx({ user: caller, prompt: text, surface: 'slack:dm' })
  await postJaxxReply(channel, reply.text, reply.traceId)
  await logCommand({
    team_id: teamId,
    slack_user_id: slackUserId,
    oncore_user_id: caller.user_id,
    command: 'jaxx_dm',
    text,
    channel_id: channel,
    response_status: 200,
    duration_ms: Date.now() - start,
  })
}

async function handleMention({
  slackUserId,
  teamId,
  channel,
  text,
  ts,
}: {
  slackUserId: string
  teamId: string
  channel: string
  text: string
  ts?: string
}) {
  const caller = await resolveCaller(slackUserId, teamId)
  if (!caller) {
    await postMessage({ channel, blocks: notLinkedPrompt(), text: 'Not linked' })
    return
  }
  const clean = text.replace(/^<@[A-Z0-9]+>\s*/, '').trim() || 'help'
  const reply = await runJaxx({ user: caller, prompt: clean, surface: 'slack:mention' })
  await postMessage({
    channel,
    blocks: jaxxReply(reply.text, reply.traceId),
    text: reply.text.slice(0, 200),
    thread_ts: ts,
  })
}

async function handleHomeOpened({ slackUserId, teamId }: { slackUserId: string; teamId: string }) {
  const caller = await resolveCaller(slackUserId, teamId)
  const view = {
    type: 'home',
    blocks: caller
      ? welcomeCard({ email: caller.email, full_name: caller.full_name, plan: caller.plan })
      : notLinkedPrompt(),
  }
  try {
    await publishHome(slackUserId, view)
  } catch (e) {
    console.warn('[slack/home] publish failed:', (e as Error).message)
  }
}
