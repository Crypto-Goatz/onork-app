/**
 * POST /api/webhooks/discord — Discord Bot webhook handler
 *
 * Handles Discord Interactions API (slash commands + messages).
 * Users link via /connect command with their 0n token.
 * All messages route through bridge/message pipeline.
 *
 * Setup: Register bot at discord.com/developers, set Interactions
 * Endpoint URL to https://0ncore.com/api/webhooks/discord
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveChannelSession, authenticateChannel } from '@/lib/channel-adapter'

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || ''
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || ''

async function sendDiscordFollowup(token: string, content: string) {
  const appId = process.env.DISCORD_APP_ID || ''
  await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
}

async function sendChannelMessage(channelId: string, content: string) {
  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Discord ping verification
  if (body.type === 1) {
    return NextResponse.json({ type: 1 })
  }

  // Slash command interaction
  if (body.type === 2) {
    const command = body.data?.name
    const userId = body.member?.user?.id || body.user?.id
    const channelId = body.channel_id
    const options = body.data?.options || []

    if (command === 'connect') {
      const token = options.find((o: { name: string }) => o.name === 'token')?.value
      if (!token || !token.startsWith('0n_')) {
        return NextResponse.json({
          type: 4,
          data: { content: 'Invalid token. Generate one at **0ncore.com/dashboard/downloads** and use `/connect token:0n_YOUR_TOKEN`', flags: 64 },
        })
      }
      const session = await authenticateChannel(token, 'discord', userId, body.guild_id)
      if (session) {
        return NextResponse.json({
          type: 4,
          data: { content: `Connected! Your Discord account is linked to 0nCore. Permissions: ${session.permissions.join(', ')}. Just type naturally in any channel I'm in.`, flags: 64 },
        })
      }
      return NextResponse.json({
        type: 4,
        data: { content: 'Invalid or expired token.', flags: 64 },
      })
    }

    if (command === 'status') {
      const session = await resolveChannelSession('discord', userId)
      if (session) {
        return NextResponse.json({
          type: 4,
          data: { content: `Connected to 0nCore.\nMessages: ${session.messageCount}\nPermissions: ${session.permissions.join(', ')}`, flags: 64 },
        })
      }
      return NextResponse.json({
        type: 4,
        data: { content: 'Not connected. Use `/connect` to link your account.', flags: 64 },
      })
    }

    if (command === 'disconnect') {
      const { createClient } = await import('@supabase/supabase-js')
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await admin.from('channel_sessions').update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('channel', 'discord').eq('channel_identity', userId)
      return NextResponse.json({
        type: 4,
        data: { content: 'Disconnected from 0nCore.', flags: 64 },
      })
    }

    if (command === '0n') {
      const text = options.find((o: { name: string }) => o.name === 'command')?.value
      if (!text) {
        return NextResponse.json({
          type: 4,
          data: { content: 'Usage: `/0n command:show my contacts`' },
        })
      }

      // Defer response (we'll follow up)
      const session = await resolveChannelSession('discord', userId)
      if (!session) {
        return NextResponse.json({
          type: 4,
          data: { content: 'Not connected. Use `/connect token:0n_TOKEN` first.', flags: 64 },
        })
      }

      // Acknowledge immediately, process async
      const interactionToken = body.token
      setTimeout(async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://0ncore.com'
          const bridgeRes = await fetch(`${baseUrl}/api/bridge/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: 'discord', channelIdentity: userId, text }),
          })
          const result = await bridgeRes.json()
          await sendDiscordFollowup(interactionToken, result.message || JSON.stringify(result).slice(0, 1900))
        } catch {
          await sendDiscordFollowup(interactionToken, 'Error processing command.')
        }
      }, 0)

      return NextResponse.json({
        type: 5,
      })
    }

    return NextResponse.json({ type: 4, data: { content: 'Unknown command.' } })
  }

  // Message component interaction (buttons, selects)
  if (body.type === 3) {
    return NextResponse.json({ type: 6 })
  }

  return NextResponse.json({ ok: true })
}
