import { createClient } from '@/lib/supabase/server'
import { crmGet, crmPost, crmPut } from '@/lib/crm'

interface Step {
  id: string
  name: string
  tool: string
  inputs: Record<string, string>
  condition?: string
  on_fail?: string
  depends_on?: string[]
}

interface Workflow {
  name: string
  trigger: { type: string; event: string; config: Record<string, unknown> }
  steps: Step[]
  variables?: Record<string, string>
}

interface StepResult {
  stepId: string
  name: string
  tool: string
  status: 'success' | 'failed' | 'skipped'
  output?: unknown
  error?: string
  duration: number
}

function resolveVariables(
  value: string,
  context: { trigger: Record<string, unknown>; outputs: Record<string, unknown>; variables: Record<string, string> }
): string {
  return value.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const parts = path.trim().split('.')
    let current: unknown = context

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part]
      } else {
        return `{{${path}}}`
      }
    }

    return String(current ?? '')
  })
}

function resolveInputs(
  inputs: Record<string, string>,
  context: { trigger: Record<string, unknown>; outputs: Record<string, unknown>; variables: Record<string, string> }
): Record<string, string> {
  const resolved: Record<string, string> = {}
  for (const [key, value] of Object.entries(inputs)) {
    resolved[key] = resolveVariables(value, context)
  }
  return resolved
}

async function executeStep(
  step: Step,
  locationId: string,
  context: { trigger: Record<string, unknown>; outputs: Record<string, unknown>; variables: Record<string, string> }
): Promise<StepResult> {
  const start = Date.now()
  const inputs = resolveInputs(step.inputs || {}, context)

  try {
    let output: unknown = null

    switch (step.tool) {
      case 'crm_add_tag': {
        const res = await crmPost(`/contacts/${inputs.contactId}/tags`, locationId, {
          tags: [inputs.tag],
        })
        output = await res.json()
        break
      }

      case 'crm_send_email': {
        const res = await crmPost('/conversations/messages', locationId, {
          type: 'Email',
          contactId: inputs.contactId,
          subject: inputs.subject || '0nCore Automation',
          body: inputs.body || inputs.message || '',
          html: inputs.html || inputs.body || '',
        })
        output = await res.json()
        break
      }

      case 'crm_send_sms': {
        const res = await crmPost('/conversations/messages', locationId, {
          type: 'SMS',
          contactId: inputs.contactId,
          message: inputs.message || '',
        })
        output = await res.json()
        break
      }

      case 'crm_create_contact': {
        const res = await crmPost('/contacts/', locationId, {
          firstName: inputs.firstName || '',
          lastName: inputs.lastName || '',
          email: inputs.email || undefined,
          phone: inputs.phone || undefined,
          tags: inputs.tags ? inputs.tags.split(',').map((t: string) => t.trim()) : ['automation-created'],
          source: '0ncore-automation',
        })
        output = await res.json()
        break
      }

      case 'crm_update_contact': {
        const res = await crmPut(`/contacts/${inputs.contactId}`, locationId, {
          firstName: inputs.firstName || undefined,
          lastName: inputs.lastName || undefined,
          email: inputs.email || undefined,
          phone: inputs.phone || undefined,
        })
        output = await res.json()
        break
      }

      case 'crm_search_contacts': {
        const res = await crmGet(`/contacts/?query=${encodeURIComponent(inputs.query || '')}&limit=${inputs.limit || '10'}`, locationId)
        output = await res.json()
        break
      }

      case 'crm_create_opportunity': {
        const res = await crmPost('/opportunities/', locationId, {
          name: inputs.name || 'Automation Opportunity',
          contactId: inputs.contactId,
          pipelineId: inputs.pipelineId || process.env.CRM_PIPELINE_ID || '',
          stageId: inputs.stageId || inputs.stage || '',
          monetaryValue: inputs.value ? parseFloat(inputs.value) : 0,
        })
        output = await res.json()
        break
      }

      case 'crm_create_appointment': {
        const res = await crmPost('/calendars/events/appointments', locationId, {
          calendarId: inputs.calendarId || '',
          contactId: inputs.contactId,
          title: inputs.title || '0nCore Appointment',
          startTime: inputs.startTime || new Date(Date.now() + 86400000).toISOString(),
        })
        output = await res.json()
        break
      }

      case 'ai_score_lead': {
        // Use Groq to score the lead
        const groqKey = process.env.GROQ_API_KEY
        if (groqKey) {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              max_tokens: 200,
              messages: [
                { role: 'system', content: 'Score this lead 1-100 based on the data provided. Return JSON: {"score": N, "reason": "..."}' },
                { role: 'user', content: `Contact ID: ${inputs.contactId}. Score based on engagement signals.` },
              ],
              response_format: { type: 'json_object' },
            }),
          })
          const data = await res.json()
          output = JSON.parse(data.choices?.[0]?.message?.content || '{"score": 50, "reason": "Default score"}')
        } else {
          output = { score: 50, reason: 'AI scoring unavailable' }
        }
        break
      }

      case 'ai_generate_content': {
        const groqKey = process.env.GROQ_API_KEY
        if (groqKey) {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              max_tokens: 500,
              messages: [
                { role: 'system', content: 'Generate the requested content. Be concise and professional.' },
                { role: 'user', content: inputs.prompt || inputs.topic || 'Generate a professional follow-up message.' },
              ],
            }),
          })
          const data = await res.json()
          output = { content: data.choices?.[0]?.message?.content || '' }
        } else {
          output = { content: 'AI content generation unavailable' }
        }
        break
      }

      case 'wait': {
        // In production this would schedule a delayed execution
        // For now, return immediately with the wait duration
        output = { waited: inputs.duration || '0', unit: inputs.unit || 'minutes' }
        break
      }

      case 'stripe_create_invoice': {
        // Would call Stripe API — for now return placeholder
        output = { status: 'invoice_pending', amount: inputs.amount, contactId: inputs.contactId }
        break
      }

      default: {
        output = { status: 'unknown_tool', tool: step.tool }
        break
      }
    }

    return {
      stepId: step.id,
      name: step.name,
      tool: step.tool,
      status: 'success',
      output,
      duration: Date.now() - start,
    }
  } catch (err) {
    return {
      stepId: step.id,
      name: step.name,
      tool: step.tool,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
      duration: Date.now() - start,
    }
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || process.env.CRM_LOCATION_ID
  if (!locationId) {
    return Response.json({ error: 'CRM not configured' }, { status: 500 })
  }

  const { workflow, triggerData } = await req.json() as {
    workflow: Workflow
    triggerData?: Record<string, unknown>
  }

  if (!workflow?.steps) {
    return Response.json({ error: 'workflow with steps required' }, { status: 400 })
  }

  const context = {
    trigger: triggerData || {},
    outputs: {} as Record<string, unknown>,
    variables: workflow.variables || {},
  }

  const results: StepResult[] = []
  const startTime = Date.now()

  for (const step of workflow.steps) {
    const result = await executeStep(step, locationId, context)
    results.push(result)

    // Store output for variable resolution in subsequent steps
    context.outputs[step.id] = result.output

    // Handle failure
    if (result.status === 'failed') {
      if (step.on_fail === 'halt') break
      // 'skip' and 'retry' continue to next step
    }
  }

  const succeeded = results.filter(r => r.status === 'success').length
  const failed = results.filter(r => r.status === 'failed').length

  return Response.json({
    success: failed === 0,
    workflow: workflow.name,
    totalSteps: results.length,
    succeeded,
    failed,
    duration: Date.now() - startTime,
    results,
  })
}
