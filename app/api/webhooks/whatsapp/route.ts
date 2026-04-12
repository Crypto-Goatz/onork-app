/**
 * POST /api/webhooks/whatsapp — WhatsApp Cloud API webhook
 * GET  /api/webhooks/whatsapp — Webhook verification
 *
 * Handles incoming WhatsApp messages via Meta Cloud API.
 * Users link by sending: connect 0n_TOKEN
 *
 * Setup: Meta Business → WhatsApp → Configuration →
 *   Webhook URL: https://0ncore.com/api/webhooks/whatsapp
 *   Verify Token: (set WHATSAPP_VERIFY_TOKEN env var)
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveChannelSession, authenticateChannel } from '@/lib/channel-adapter'
import { createClient } from '@supabase/supabase-js'

const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || ''
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '0ncore_whatsapp_verify'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function sendWhatsAppMessage(to: string, text: string) {
  if (!WA_TOKEN || !WA_PHONE_ID) return
  await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const message = value?.messages?.[0]

    if (!message || message.type !== 'text') return NextResponse.json({ ok: true })

    const from = message.from
    const text = message.text?.body?.trim()
    if (!text || !from) return NextResponse.json({ ok: true })

    // Handle connect command
    const connectMatch = text.match(/^connect\s+(0n_[a-f0-9]+)/i)
    if (connectMatch) {
      const linked = await authenticateChannel(connectMatch[1], 'whatsapp', from)
      if (linked) {
        await sendWhatsAppMessage(from, `Connected! Your WhatsApp is linked to 0nCore. Permissions: ${linked.permissions.join(', ')}. Just type what you need.`)
      } else {
        await sendWhatsAppMessage(from, 'Invalid or expired token. Generate a new one at 0ncore.com/dashboard/downloads.')
      }
      return NextResponse.json({ ok: true })
    }

    // Handle disconnect
    if (text.toLowerCase() === 'disconnect') {
      const admin = getAdmin()
      await admin.from('channel_sessions').update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('channel', 'whatsapp').eq('channel_identity', from)
      await sendWhatsAppMessage(from, 'Disconnected from 0nCore.')
      return NextResponse.json({ ok: true })
    }

    // Resolve session
    const session = await resolveChannelSession('whatsapp', from)
    if (!session) {
      await sendWhatsAppMessage(from, 'Welcome to 0nCore! To get started:\n\n1. Go to 0ncore.com and log in\n2. Go to Dashboard > Downloads\n3. Generate a 0n token\n4. Send me: connect 0n_YOUR_TOKEN')
      return NextResponse.json({ ok: true })
    }

    // Route through bridge
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://0ncore.com'
    const bridgeRes = await fetch(`${baseUrl}/api/bridge/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'whatsapp', channelIdentity: from, text }),
    })
    const result = await bridgeRes.json()

    // Update session
    const admin = getAdmin()
    await admin.from('channel_sessions').update({
      last_message_at: new Date().toISOString(),
      message_count: (session.messageCount || 0) + 1,
    }).eq('id', session.id)

    await sendWhatsAppMessage(from, result.message || 'Done.')
  } catch (err) {
    console.error('[whatsapp webhook]', err)
  }

  return NextResponse.json({ ok: true })
}
