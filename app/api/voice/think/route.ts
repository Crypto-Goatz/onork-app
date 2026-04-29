/**
 * Voice AI — brain entry. handleThink owns the think + record loop.
 */

import { NextRequest } from 'next/server'
import { handleThink } from '@/lib/brain/think-route'
import { groqJSON, groqText } from '@/lib/service-packager/groq'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SLUG = 'voice_ai'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface AgentPlan { name: string; persona: string; opening_line: string; objection_handlers: Array<{ scenario: string; response: string }> }

export async function POST(req: NextRequest) {
  return handleThink(req, {
    slug: SLUG,
    async execute(decision, _body, userId) {
      const tool = decision.tool

      if (tool === 'create_agent') {
        const plan = await groqJSON<AgentPlan>(
          'You design voice agent personas. Return ONLY valid JSON.',
          `Persona description: ${decision.params.persona ?? 'helpful assistant'}\nUse case: ${decision.params.use_case ?? 'general'}\n\nReturn { "name": "...", "persona": "...", "opening_line": "...", "objection_handlers": [{ "scenario": "...", "response": "..." }] }`,
          { temperature: 0.5 }
        )
        const sb = admin()
        const { data, error } = await sb.from('voice_agents').insert({
          user_id: userId,
          name: plan.name,
          persona: plan.persona,
          opening_line: plan.opening_line,
          scripts: plan,
        }).select('id, name').maybeSingle()
        if (error && !error.message.includes('does not exist')) {
          return { output: { error: error.message }, success: false }
        }
        return { output: { agent: data ?? plan }, success: true }
      }

      if (tool === 'generate_response') {
        const text = await groqText(
          'You are a voice agent. Reply in one short conversational sentence.',
          `Caller said: "${decision.params.caller_input}"\nAgent persona: ${decision.params.persona ?? 'helpful, warm, concise'}`,
          { temperature: 0.7, maxTokens: 200 }
        )
        return { output: { response: text }, success: true }
      }

      if (tool === 'summarize_call') {
        const summary = await groqJSON<{ summary: string; action_items: string[]; sentiment: string }>(
          'You summarize voice calls. Return ONLY valid JSON.',
          `Call transcript:\n${decision.params.transcript ?? '(no transcript)'}`,
          { temperature: 0.3 }
        )
        return { output: { call_id: decision.params.call_id, ...summary }, success: true }
      }

      if (tool === 'ask_clarification') {
        return { output: { question: decision.params.question ?? 'What kind of agent?' }, success: true }
      }

      return { output: { error: `unknown tool: ${tool}` }, success: false }
    },
  })
}
