/**
 * GET /api/bridge/connections — List all connections for the authenticated user
 * DELETE /api/bridge/connections — Disconnect a specific channel
 *
 * Auth: Bearer 0n_... token or Supabase session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { validateToken, extractToken } from '@/lib/0n-token'
import { getUserConnections, disconnectChannel, type ChannelType } from '@/lib/channel-adapter'
import { listUserTokens } from '@/lib/0n-token'

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const token = extractToken(req)
  if (token) {
    const ctx = await validateToken(token)
    if (ctx) return ctx.userId
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [connections, tokens] = await Promise.all([
    getUserConnections(userId),
    listUserTokens(userId),
  ])

  return NextResponse.json({
    ...connections,
    tokens: tokens.map(t => ({
      id: t.id,
      name: t.name,
      prefix: t.token_prefix,
      channel: t.channel,
      lastUsed: t.last_used_at,
      created: t.created_at,
      active: !t.revoked,
    })),
  })
}

export async function DELETE(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { channel, channelIdentity } = body

  if (!channel || !channelIdentity) {
    return NextResponse.json({ error: 'Missing channel and channelIdentity' }, { status: 400 })
  }

  const ok = await disconnectChannel(userId, channel as ChannelType, channelIdentity)
  if (!ok) return NextResponse.json({ error: 'Disconnect failed' }, { status: 500 })

  return NextResponse.json({ disconnected: true, channel, channelIdentity })
}
