/**
 * 0nRemote — Agent CRUD API
 * GET  /api/remote/agents — list user's agents
 * POST /api/remote/agents — create new agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const SLACK_WEBHOOK = process.env.SLACK_BOT_TOKEN
const SLACK_CHANNEL = process.env.SLACK_CHANNEL_ID || 'C0AQQ2C00GJ'

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: agents } = await admin
    .from('remote_agents')
    .select('*, remote_agent_runs(id, status, started_at, duration_ms)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ agents: agents || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, prompt, repoUrl, cronExpression, model, category, slackChannel, notifyOnSuccess, notifyOnFailure } = body

  if (!name || !prompt) {
    return NextResponse.json({ error: 'name and prompt required' }, { status: 400 })
  }

  // Default environment
  const environmentId = process.env.CLAUDE_ENVIRONMENT_ID || 'env_01WhzmvtQZRx891iEL1YTpo7'

  const { data: agent, error } = await admin.from('remote_agents').insert({
    user_id: user.id,
    name,
    description: description || '',
    prompt,
    repo_url: repoUrl || 'https://github.com/Crypto-Goatz/onork-app',
    cron_expression: cronExpression || null,
    model: model || 'claude-sonnet-4-6',
    environment_id: environmentId,
    enabled: true,
    category: category || 'general',
    slack_channel: slackChannel || SLACK_CHANNEL,
    notify_on_success: notifyOnSuccess !== false,
    notify_on_failure: notifyOnFailure !== false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.log(`[0nRemote] Created agent: ${name} (${agent.id}) by ${user.email}`)

  return NextResponse.json({ agent })
}
