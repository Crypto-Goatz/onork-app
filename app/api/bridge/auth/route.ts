/**
 * POST /api/bridge/auth — Authenticate an external channel
 *
 * Called once per channel to link it to a 0n account.
 * Body: { token: "0n_...", channel: "telegram", channelIdentity: "123456", channelWorkspace?: "..." }
 * Returns: { session, user }
 *
 * After auth, the channel uses its identity for all subsequent /bridge/message calls.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateChannel, type ChannelType } from '@/lib/channel-adapter'
import { createClient } from '@supabase/supabase-js'

const VALID_CHANNELS: ChannelType[] = ['telegram', 'slack', 'wordpress', 'claude', 'discord', 'whatsapp', 'web', 'crm']

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, channel, channelIdentity, channelWorkspace } = body

    if (!token || !channel || !channelIdentity) {
      return NextResponse.json({ error: 'Missing required fields: token, channel, channelIdentity' }, { status: 400 })
    }

    if (!VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` }, { status: 400 })
    }

    const session = await authenticateChannel(token, channel, channelIdentity, channelWorkspace)
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const admin = getAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('email, full_name, business_name, tier_level, crm_location_id')
      .eq('id', session.userId)
      .single()

    return NextResponse.json({
      session: {
        id: session.id,
        channel: session.channel,
        channelIdentity: session.channelIdentity,
        permissions: session.permissions,
      },
      user: {
        id: session.userId,
        email: profile?.email,
        name: profile?.full_name,
        business: profile?.business_name,
        tier: profile?.tier_level,
        crmConnected: !!profile?.crm_location_id,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
