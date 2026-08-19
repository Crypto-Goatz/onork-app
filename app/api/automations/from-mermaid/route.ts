/**
 * POST /api/automations/from-mermaid
 *
 * Body: { mermaid: string, title?: string }
 *
 * Converts a Mermaid diagram (flowchart/mindmap/sequence) into a 0n-workflow v1
 * JSON document via Groq. Used by the Notes → Automation hand-off so a brain-
 * generated diagram becomes an editable workflow draft in one click.
 *
 * Auth: Supabase session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM = `You convert Mermaid diagrams into 0n-workflow v1 JSON documents.

A 0n-workflow v1 document looks like:
{
  "schema": "0n-workflow/v1",
  "name": "Concise workflow title",
  "version": "1.0.0",
  "description": "What this automation does",
  "trigger": { "type": "trigger_tag_added", "config": { "tag_name": "scan-me" } },
  "steps": [
    {
      "id": "cap_1",
      "action": "ai_generate_content",
      "input": { "name": "Step name", "category": "crm|ai|outbound|wait", "config": { ... } },
      "depends_on": []
    }
  ]
}

Common trigger types: trigger_tag_added, trigger_form_submitted, trigger_appointment_booked, trigger_payment_received, trigger_webhook, trigger_schedule.

Common actions:
- crm_search_contacts, crm_create_contact, crm_update_contact, crm_add_tag, crm_send_email, crm_send_sms, crm_create_opportunity
- ai_generate_content, ai_score_lead, ai_classify_intent, ai_summarize, ai_translate
- stripe_create_invoice, stripe_check_payment
- wait, condition

RULES:
1. Each Mermaid node becomes one step. Edge direction = depends_on.
2. The first node (no incoming edges) becomes the trigger if it looks like a trigger event ("when X happens", "form submitted", etc), otherwise becomes step cap_1 with a generic webhook trigger.
3. If a node label has multiple actions, split it into separate steps.
4. Step ids: cap_1, cap_2, cap_3 in topological order.
5. Use {{trigger.contact_id}}, {{step_001.output}}, etc. for variable refs.
6. Output ONLY valid JSON. No markdown fences, no commentary.`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { mermaid?: string; title?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  if (!body.mermaid?.trim()) {
    return NextResponse.json({ error: 'mermaid required' }, { status: 400 })
  }

  const groqKey = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
    .split(',')[0]
    ?.trim()
  if (!groqKey) {
    return NextResponse.json({ error: 'Groq not configured' }, { status: 500 })
  }

  const userMsg = `Title hint: ${body.title || '(none)'}\n\nMermaid source:\n${body.mermaid}`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userMsg },
        ],
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      return NextResponse.json(
        { error: `Groq ${groqRes.status}: ${err.slice(0, 300)}` },
        { status: 502 },
      )
    }

    const data = await groqRes.json()
    const raw = data?.choices?.[0]?.message?.content ?? '{}'
    let workflow: unknown
    try {
      workflow = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: 'Groq returned invalid JSON', raw },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, workflow })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'conversion failed' },
      { status: 500 },
    )
  }
}
