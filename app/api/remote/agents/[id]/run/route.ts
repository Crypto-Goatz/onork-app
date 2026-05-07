/**
 * 0nRemote — Run Agent
 * POST /api/remote/agents/[id]/run — trigger an agent execution
 *
 * Calls 0nCore's internal execution or proxies to Claude's remote trigger API
 * Also sends Slack notification
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const GROQ_KEY = process.env.GROQ_API_KEY

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get agent config
  const { data: agent } = await admin.from('remote_agents').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const runId = crypto.randomUUID()
  const startTime = Date.now()

  // Create run record
  await admin.from('remote_agent_runs').insert({
    id: runId,
    agent_id: id,
    user_id: user.id,
    trigger_type: 'manual',
    status: 'running',
  })

  try {
    let result: Record<string, unknown> = {}

    // Execute via Groq (internal AI execution — FREE)
    if (GROQ_KEY) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `You are 0nRemote, an AI agent execution engine for 0nCore. Execute the following task and return a JSON result with: { "status": "success" or "failure", "summary": "what you did", "details": "detailed output", "actions_taken": ["list of actions"] }` },
            { role: 'user', content: agent.prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      })

      if (groqRes.ok) {
        const groqData = await groqRes.json()
        const content = groqData.choices?.[0]?.message?.content || ''
        try {
          const match = content.match(/\{[\s\S]*\}/)
          if (match) result = JSON.parse(match[0])
          else result = { status: 'success', summary: content.slice(0, 500) }
        } catch {
          result = { status: 'success', summary: content.slice(0, 500) }
        }
      } else {
        result = { status: 'failure', summary: `Groq error: ${groqRes.status}` }
      }
    } else {
      result = { status: 'failure', summary: 'No AI key configured' }
    }

    const durationMs = Date.now() - startTime
    const status = (result.status === 'failure') ? 'failure' : 'success'

    // Update run record
    await admin.from('remote_agent_runs').update({
      status,
      result,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
    }).eq('id', runId)

    // Update agent stats
    await admin.from('remote_agents').update({
      total_runs: (agent.total_runs || 0) + 1,
      last_run_at: new Date().toISOString(),
      last_status: status,
      last_result: JSON.stringify(result).slice(0, 1000),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    // Slack notification
    if (SLACK_BOT_TOKEN && agent.slack_channel) {
      const shouldNotify = (status === 'success' && agent.notify_on_success) || (status === 'failure' && agent.notify_on_failure)
      if (shouldNotify) {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
          body: JSON.stringify({
            channel: agent.slack_channel,
            text: `*0nRemote* — ${status === 'success' ? '✅' : '❌'} *${agent.name}*\n${(result.summary as string || '').slice(0, 200)}\nDuration: ${durationMs}ms`,
          }),
        }).catch(() => {})
      }
    }

    console.log(`[0nRemote] Run ${runId} | ${agent.name} | ${status} | ${durationMs}ms`)

    return NextResponse.json({ run: { id: runId, status, result, durationMs } })
  } catch (error) {
    const durationMs = Date.now() - startTime
    await admin.from('remote_agent_runs').update({
      status: 'failure',
      result: { error: error instanceof Error ? error.message : 'Unknown error' },
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
    }).eq('id', runId)

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Execution failed' }, { status: 500 })
  }
}
