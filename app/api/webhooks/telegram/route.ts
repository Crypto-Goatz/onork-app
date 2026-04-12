/**
 * POST /api/webhooks/telegram — Telegram Bot webhook handler
 *
 * Handles incoming messages from a Telegram bot and routes them
 * through the 0n bridge system. Users link their Telegram account
 * by sending: /connect 0n_TOKEN
 *
 * Setup: Set webhook URL via Telegram Bot API:
 *   https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://0ncore.com/api/webhooks/telegram
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveChannelSession, authenticateChannel } from '@/lib/channel-adapter'
import { createClient } from '@supabase/supabase-js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function sendTelegramMessage(chatId: string | number, text: string, replyToId?: number) {
  if (!BOT_TOKEN) return
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...(replyToId ? { reply_to_message_id: replyToId } : {}),
    }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()

    const message = update.message || update.edited_message
    if (!message?.text) return NextResponse.json({ ok: true })

    const chatId = String(message.chat.id)
    const userId = String(message.from.id)
    const text = message.text.trim()
    const messageId = message.message_id
    const username = message.from.username || message.from.first_name || 'Unknown'

    // Handle /start command
    if (text === '/start') {
      await sendTelegramMessage(chatId, [
        `*Welcome to 0nCore* \\u2728`,
        '',
        `I'm your AI business operator. Connect your 0nCore account to get started:`,
        '',
        `1. Go to *0ncore.com* and log in`,
        `2. Go to *Dashboard > Downloads*`,
        `3. Generate a 0n token`,
        `4. Send me: \`/connect 0n_YOUR_TOKEN\``,
        '',
        `Once connected, you can manage your CRM, generate workflows, check analytics, and more — all from Telegram.`,
      ].join('\n'))
      return NextResponse.json({ ok: true })
    }

    // Handle /help command
    if (text === '/help') {
      await sendTelegramMessage(chatId, [
        '*0nCore Telegram Commands*',
        '',
        '`/connect 0n_TOKEN` — Link your account',
        '`/status` — Check connection status',
        '`/disconnect` — Unlink your account',
        '`/help` — Show this message',
        '',
        '*Once connected, just type naturally:*',
        '• "Show my contacts"',
        '• "List my pipeline"',
        '• "Create a contact named John Doe with email john@example.com"',
        '• "Check my calendar"',
        '• "Send a message to contact X"',
        '',
        'You can chain commands: "Show my contacts and list my pipeline"',
      ].join('\n'))
      return NextResponse.json({ ok: true })
    }

    // Handle /connect command
    const connectMatch = text.match(/^\/connect\s+(0n_[a-f0-9]+)/i)
    if (connectMatch) {
      const token = connectMatch[1]
      const linked = await authenticateChannel(token, 'telegram', userId, chatId)
      if (linked) {
        await sendTelegramMessage(
          chatId,
          `Connected! @${username}, your Telegram is now linked to 0nCore.\n\nPermissions: ${linked.permissions.join(', ')}\n\nJust type what you need — no commands required.`,
          messageId
        )
      } else {
        await sendTelegramMessage(chatId, 'Invalid or expired token. Generate a new one at *0ncore.com/dashboard/downloads*.', messageId)
      }
      return NextResponse.json({ ok: true })
    }

    // Handle /status command
    if (text === '/status') {
      const session = await resolveChannelSession('telegram', userId)
      if (session) {
        await sendTelegramMessage(chatId, `Connected to 0nCore.\nMessages sent: ${session.messageCount}\nPermissions: ${session.permissions.join(', ')}`)
      } else {
        await sendTelegramMessage(chatId, 'Not connected. Use `/connect 0n_TOKEN` to link your account.')
      }
      return NextResponse.json({ ok: true })
    }

    // Handle /disconnect command
    if (text === '/disconnect') {
      const admin = getAdmin()
      await admin
        .from('channel_sessions')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('channel', 'telegram')
        .eq('channel_identity', userId)
      await sendTelegramMessage(chatId, 'Disconnected. Your Telegram is no longer linked to 0nCore.')
      return NextResponse.json({ ok: true })
    }

    // Skip commands we don't handle
    if (text.startsWith('/')) {
      await sendTelegramMessage(chatId, 'Unknown command. Type `/help` for available commands.', messageId)
      return NextResponse.json({ ok: true })
    }

    // Resolve user session
    const session = await resolveChannelSession('telegram', userId)
    if (!session) {
      await sendTelegramMessage(
        chatId,
        `Hey @${username}! I need you to connect first.\n\n1. Go to *0ncore.com*\n2. Generate a 0n token\n3. Send: \`/connect 0n_TOKEN\``,
        messageId
      )
      return NextResponse.json({ ok: true })
    }

    // Route through bridge message pipeline
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://0ncore.com'
    const bridgeRes = await fetch(`${baseUrl}/api/bridge/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'telegram',
        channelIdentity: userId,
        text,
      }),
    })

    const result = await bridgeRes.json()

    // Update message count
    const admin = getAdmin()
    await admin
      .from('channel_sessions')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (session.messageCount || 0) + 1,
      })
      .eq('id', session.id)

    // Format response
    let reply: string
    if (result.error) {
      reply = `Error: ${result.error}`
    } else if (result.type === 'radial_burst') {
      reply = `*Radial Burst* — ${result.commands} commands (${result.totalDurationMs || 0}ms)\n\n`
      if (result.steps) {
        reply += result.steps.map((s: { stepId: string; status: string; error?: string }, i: number) =>
          `${s.status === 'success' ? '\\u2705' : '\\u274c'} Step ${i + 1}: ${s.stepId} — ${s.status}${s.error ? ` (${s.error})` : ''}`
        ).join('\n')
      }
    } else {
      reply = result.message || 'Done.'
    }

    await sendTelegramMessage(chatId, reply, messageId)
  } catch (err) {
    console.error('[telegram webhook] Error:', err)
  }

  return NextResponse.json({ ok: true })
}
