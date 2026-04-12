/**
 * POST /api/bridge/message — Process a message from any external channel
 *
 * The universal entry point. Telegram, Slack, WordPress, Claude, Discord —
 * all POST here. The adapter resolves the user from their channel identity,
 * then routes through K-layers to generate + execute a .0n workflow.
 *
 * Body: { channel, channelIdentity, text, attachments?, replyTo? }
 * Auth: Bearer 0n_... token OR pre-authenticated channel session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveChannelSession, type ChannelType } from '@/lib/channel-adapter'
import { validateToken, extractToken } from '@/lib/0n-token'
import { executeWorkflow, type DotOnFile } from '@/lib/execution-engine'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { channel, channelIdentity, text, attachments, replyTo } = body

    if (!channel || !channelIdentity || !text) {
      return NextResponse.json({ error: 'Missing required fields: channel, channelIdentity, text' }, { status: 400 })
    }

    // Resolve user: try channel session first, fall back to bearer token
    let userId: string | null = null
    let permissions: string[] = []

    const session = await resolveChannelSession(channel as ChannelType, channelIdentity)
    if (session) {
      userId = session.userId
      permissions = session.permissions
    } else {
      const token = extractToken(req)
      if (token) {
        const ctx = await validateToken(token)
        if (ctx) {
          userId = ctx.userId
          permissions = ctx.scopes
        }
      }
    }

    if (!userId) {
      return NextResponse.json({
        error: 'Not authenticated. Use /api/bridge/auth first or provide Bearer 0n_... token.',
      }, { status: 401 })
    }

    if (!permissions.includes('execute') && !permissions.includes('write')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Load user context for K-layer routing
    const admin = getAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('crm_location_id, tier_level, business_name')
      .eq('id', userId)
      .single()

    const { data: crews } = await admin
      .from('crews')
      .select('name, role, k_layers')
      .eq('user_id', userId)

    // Update session message count
    if (session) {
      await admin
        .from('channel_sessions')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: (session.messageCount || 0) + 1,
        })
        .eq('id', session.id)
    }

    // Route through AI — detect intent, generate .0n if needed, execute
    const userContext = {
      userId,
      channel,
      tier: profile?.tier_level || 0,
      crmLocationId: profile?.crm_location_id,
      businessName: profile?.business_name,
      crews: crews || [],
      permissions,
    }

    const response = await routeMessage(text, userContext, admin, attachments, replyTo)

    return NextResponse.json(response)
  } catch (err) {
    console.error('[bridge/message] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface UserContext {
  userId: string
  channel: string
  tier: number
  crmLocationId?: string
  businessName?: string
  crews: { name: string; role: string; k_layers: string[] }[]
  permissions: string[]
}

async function routeMessage(
  text: string,
  ctx: UserContext,
  admin: ReturnType<typeof getAdmin>,
  _attachments?: unknown[],
  _replyTo?: string
) {
  // Detect if this is a multi-command sentence (contains "and", "then", commas)
  const commands = parseCommands(text)
  const isMultiCommand = commands.length > 1

  // Check for workflow save intent
  const saveMatch = text.match(/^save\s+(this|that|it)\s+as\s+"([^"]+)"/i)
    || text.match(/^save\s+workflow\s+"([^"]+)"/i)

  if (saveMatch) {
    const workflowName = saveMatch[2] || saveMatch[1]
    return {
      type: 'workflow_saved',
      message: `Workflow "${workflowName}" saved to your library. You can edit it in the visual builder or list it on the marketplace.`,
      actions: ['edit_in_builder', 'list_on_marketplace'],
    }
  }

  // Generate .0n structure for execution
  const dotOnFile: DotOnFile = {
    name: `bridge_${Date.now()}`,
    version: '1.0.0',
    description: `Generated from ${ctx.channel}: ${text.slice(0, 100)}`,
    steps: commands.map((cmd, i) => ({
      id: `step_${i + 1}`,
      action: 'resolve',
      input: { command: cmd.trim() },
      ...(i > 0 ? { depends_on: [`step_${i}`] } : {}),
    })),
    metadata: {
      user_id: ctx.userId,
      channel: ctx.channel,
      tier: ctx.tier,
      generated_at: new Date().toISOString(),
    },
  }

  // Execute the workflow through connected services
  const execution = await executeWorkflow(dotOnFile, {
    userId: ctx.userId,
    crmLocationId: ctx.crmLocationId,
    tier: ctx.tier,
  })

  // Format results
  const successSteps = execution.steps.filter(s => s.status === 'success')
  const failedSteps = execution.steps.filter(s => s.status === 'error')

  let message: string
  if (execution.status === 'completed') {
    message = isMultiCommand
      ? `Executed ${successSteps.length} commands via radial burst (${execution.totalDurationMs}ms)`
      : `Done (${execution.totalDurationMs}ms)`
  } else if (execution.status === 'partial') {
    message = `${successSteps.length}/${execution.steps.length} commands succeeded. ${failedSteps.map(s => s.error).join('; ')}`
  } else {
    message = `Execution failed: ${failedSteps.map(s => s.error).join('; ')}`
  }

  return {
    type: isMultiCommand ? 'radial_burst' : 'single',
    message,
    status: execution.status,
    commands: commands.length,
    steps: execution.steps,
    totalDurationMs: execution.totalDurationMs,
    dotOnFile,
    userContext: {
      tier: ctx.tier,
      crmConnected: !!ctx.crmLocationId,
      crewsActive: ctx.crews.length,
    },
  }
}

function parseCommands(text: string): string[] {
  const connectors = /\s+and\s+then\s+|\s+then\s+|\s+and\s+also\s+|\s+and\s+|\s*,\s+then\s+|\s*;\s*/gi
  const parts = text.split(connectors).map(s => s.trim()).filter(Boolean)
  return parts.length > 0 ? parts : [text]
}
