/**
 * POST /api/bridge/claude — Claude MCP bridge endpoint
 *
 * Allows Claude Desktop/Code to interact with 0nCore as an MCP client.
 * Authenticates via 0n token, routes commands through the bridge.
 *
 * This is the REST endpoint that Claude calls when using 0nMCP tools
 * that target a specific user's 0nCore account.
 *
 * Headers: Authorization: Bearer 0n_TOKEN
 * Body: { tool, input }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateToken, extractToken } from '@/lib/0n-token'
import { createClient } from '@supabase/supabase-js'
import { executeWorkflow, type DotOnFile } from '@/lib/execution-engine'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const token = extractToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Missing 0n token. Set Authorization: Bearer 0n_TOKEN' }, { status: 401 })
  }

  const ctx = await validateToken(token)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const body = await req.json()
  const { tool, input, text } = body

  const admin = getAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('crm_location_id, tier_level')
    .eq('id', ctx.userId)
    .single()

  // If raw text, route through bridge message pipeline
  if (text && !tool) {
    const dotOnFile: DotOnFile = {
      name: `claude_${Date.now()}`,
      version: '1.0.0',
      description: `Claude bridge: ${String(text).slice(0, 100)}`,
      steps: [{ id: 'step_1', action: 'resolve', input: { command: text } }],
      metadata: { user_id: ctx.userId, channel: 'claude', generated_at: new Date().toISOString() },
    }

    const result = await executeWorkflow(dotOnFile, {
      userId: ctx.userId,
      crmLocationId: profile?.crm_location_id || undefined,
      tier: profile?.tier_level || 0,
    })

    return NextResponse.json(result)
  }

  // If structured tool call, execute directly
  if (tool) {
    const dotOnFile: DotOnFile = {
      name: `claude_tool_${Date.now()}`,
      version: '1.0.0',
      description: `Claude tool: ${tool}`,
      steps: [{ id: 'step_1', action: tool, input: input || {} }],
      metadata: { user_id: ctx.userId, channel: 'claude', tool, generated_at: new Date().toISOString() },
    }

    const result = await executeWorkflow(dotOnFile, {
      userId: ctx.userId,
      crmLocationId: profile?.crm_location_id || undefined,
      tier: profile?.tier_level || 0,
    })

    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Provide either "text" (natural language) or "tool" + "input" (structured)' }, { status: 400 })
}

// GET endpoint for health check / capability listing
export async function GET(req: NextRequest) {
  const token = extractToken(req)
  if (!token) {
    return NextResponse.json({
      name: '0nCore Bridge for Claude',
      version: '1.0.0',
      auth: 'Bearer 0n_TOKEN required',
      capabilities: [
        'crm.contacts.list', 'crm.contacts.create', 'crm.contacts.update', 'crm.contacts.tag',
        'crm.conversations.send', 'crm.pipeline.list', 'crm.opportunities.create',
        'crm.calendar.list', 'crm.calendar.create_event',
        'stripe.customers.list', 'stripe.invoices.list',
        'slack.message',
      ],
      usage: 'POST with { "text": "show my contacts" } or { "tool": "crm.contacts.list", "input": {} }',
    })
  }

  const ctx = await validateToken(token)
  if (!ctx) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  return NextResponse.json({
    authenticated: true,
    userId: ctx.userId,
    scopes: ctx.scopes,
    channel: ctx.channel,
  })
}
