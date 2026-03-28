import { createClient } from '@/lib/supabase/server'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1'

const SYSTEM_PROMPT = `You are the 0nAI automation architect. You generate .0n SWITCH files from natural language descriptions.

A .0n file is a JSON workflow definition with this structure:
{
  "name": "Workflow Name",
  "version": "1.0.0",
  "description": "What this automation does",
  "trigger": {
    "type": "webhook|schedule|event",
    "event": "contact.created|form.submitted|appointment.booked|payment.received|tag.added|no_response",
    "config": {}
  },
  "steps": [
    {
      "id": "step_001",
      "name": "Human readable step name",
      "tool": "tool_id",
      "inputs": { "key": "value or {{variable}}" },
      "condition": "optional condition expression",
      "on_fail": "halt|skip|retry",
      "depends_on": ["step_id"]
    }
  ],
  "variables": {
    "key": "default_value"
  }
}

Available tools:
- crm_search_contacts: Search contacts by query
- crm_create_contact: Create a new contact
- crm_update_contact: Update contact fields
- crm_add_tag: Add tag to contact
- crm_remove_tag: Remove tag from contact
- crm_send_email: Send email (templateId, contactId)
- crm_send_sms: Send SMS (message, contactId)
- crm_create_opportunity: Create pipeline opportunity
- crm_move_opportunity: Move to pipeline stage
- crm_create_appointment: Book appointment
- crm_trigger_workflow: Trigger CRM webhook workflow (webhookId, payload)
- crm_voice_ai_call: Trigger voice AI call to contact
- ai_score_lead: AI scores a lead 1-100 based on engagement
- ai_classify_intent: AI determines what a lead wants
- ai_generate_content: Generate email/SMS/social content
- ai_ask_council: Ask 5 AI models simultaneously
- stripe_create_invoice: Create and send invoice
- stripe_check_payment: Check payment status
- send_review_request: Send Google review request
- send_reminder_sequence: 3-step reminder (24hr, 1hr, 15min)
- wait: Wait for duration (minutes, hours, days)
- condition: If/else branching

Variable syntax:
- {{trigger.contactId}} — from the trigger event
- {{trigger.data.*}} — any trigger payload data
- {{contact.firstName}} — contact fields
- {{contact.email}} — contact email
- {{step.STEP_ID.output.*}} — output from a previous step
- {{variables.KEY}} — workflow variables

Rules:
1. Always include a trigger
2. Every step needs a unique id (step_001, step_002, etc.)
3. Use depends_on for steps that need previous step output
4. Use condition for if/else branching
5. Include wait steps for time delays
6. Be specific with tool inputs — resolve variables
7. Return ONLY valid JSON — no markdown, no explanation, just the .0n file`

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { prompt } = await req.json()
  if (!prompt) {
    return Response.json({ error: 'Prompt required' }, { status: 400 })
  }

  try {
    // Try Ollama first (free, local)
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Generate a .0n SWITCH file for this automation:\n\n${prompt}` },
        ],
        stream: false,
        options: { temperature: 0.3, num_predict: 4096 },
        format: 'json',
      }),
      signal: AbortSignal.timeout(60000),
    }).catch(() => null)

    let workflow: any = null
    let provider = 'ollama'

    if (ollamaRes?.ok) {
      const data = await ollamaRes.json()
      const text = data.message?.content || ''
      try {
        workflow = JSON.parse(text)
      } catch {
        // Try extracting JSON from the response
        const match = text.match(/\{[\s\S]*\}/)
        if (match) workflow = JSON.parse(match[0])
      }
    }

    // Fallback: generate a basic template from the prompt
    if (!workflow) {
      provider = 'template'
      workflow = generateTemplate(prompt)
    }

    // Validate and enhance the workflow
    if (!workflow.name) workflow.name = 'Generated Automation'
    if (!workflow.version) workflow.version = '1.0.0'
    if (!workflow.steps) workflow.steps = []
    if (!workflow.trigger) {
      workflow.trigger = { type: 'webhook', event: 'contact.created', config: {} }
    }

    // Ensure step IDs
    workflow.steps.forEach((step: any, i: number) => {
      if (!step.id) step.id = `step_${String(i + 1).padStart(3, '0')}`
    })

    return Response.json({
      success: true,
      workflow,
      provider,
      prompt,
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

function generateTemplate(prompt: string): any {
  const lower = prompt.toLowerCase()
  const steps: any[] = []
  let trigger = { type: 'webhook', event: 'contact.created', config: {} }

  // Detect trigger
  if (lower.includes('form') || lower.includes('submit')) {
    trigger = { type: 'webhook', event: 'form.submitted', config: {} }
  } else if (lower.includes('appointment') || lower.includes('book')) {
    trigger = { type: 'webhook', event: 'appointment.booked', config: {} }
  } else if (lower.includes('payment') || lower.includes('paid')) {
    trigger = { type: 'webhook', event: 'payment.received', config: {} }
  } else if (lower.includes('tag')) {
    trigger = { type: 'webhook', event: 'tag.added', config: {} }
  }

  // Detect actions
  if (lower.includes('score') || lower.includes('hot') || lower.includes('qualify')) {
    steps.push({
      id: `step_${String(steps.length + 1).padStart(3, '0')}`,
      name: 'Score Lead',
      tool: 'ai_score_lead',
      inputs: { contactId: '{{trigger.contactId}}' },
    })
  }

  if (lower.includes('email') || lower.includes('campaign') || lower.includes('nurture')) {
    steps.push({
      id: `step_${String(steps.length + 1).padStart(3, '0')}`,
      name: 'Send Email',
      tool: 'crm_send_email',
      inputs: { contactId: '{{trigger.contactId}}', templateId: '{{variables.emailTemplate}}' },
    })
  }

  if (lower.includes('sms') || lower.includes('text')) {
    steps.push({
      id: `step_${String(steps.length + 1).padStart(3, '0')}`,
      name: 'Send SMS',
      tool: 'crm_send_sms',
      inputs: { contactId: '{{trigger.contactId}}', message: '{{variables.smsMessage}}' },
    })
  }

  if (lower.includes('call') || lower.includes('voice') || lower.includes('phone')) {
    steps.push({
      id: `step_${String(steps.length + 1).padStart(3, '0')}`,
      name: 'Voice AI Call',
      tool: 'crm_voice_ai_call',
      inputs: { contactId: '{{trigger.contactId}}' },
    })
  }

  if (lower.includes('appointment') || lower.includes('book') || lower.includes('schedule')) {
    steps.push({
      id: `step_${String(steps.length + 1).padStart(3, '0')}`,
      name: 'Book Appointment',
      tool: 'crm_create_appointment',
      inputs: { contactId: '{{trigger.contactId}}', calendarId: '{{variables.calendar}}' },
    })
  }

  if (lower.includes('reminder')) {
    steps.push({
      id: `step_${String(steps.length + 1).padStart(3, '0')}`,
      name: 'Send Reminder Sequence',
      tool: 'send_reminder_sequence',
      inputs: { contactId: '{{trigger.contactId}}' },
    })
  }

  if (lower.includes('review')) {
    steps.push({
      id: `step_${String(steps.length + 1).padStart(3, '0')}`,
      name: 'Request Review',
      tool: 'send_review_request',
      inputs: { contactId: '{{trigger.contactId}}' },
    })
  }

  if (lower.includes('invoice') || lower.includes('payment')) {
    steps.push({
      id: `step_${String(steps.length + 1).padStart(3, '0')}`,
      name: 'Create Invoice',
      tool: 'stripe_create_invoice',
      inputs: { contactId: '{{trigger.contactId}}', amount: '{{variables.amount}}' },
    })
  }

  if (lower.includes('tag')) {
    steps.push({
      id: `step_${String(steps.length + 1).padStart(3, '0')}`,
      name: 'Add Tag',
      tool: 'crm_add_tag',
      inputs: { contactId: '{{trigger.contactId}}', tag: '{{variables.tag}}' },
    })
  }

  if (lower.includes('pipeline') || lower.includes('stage') || lower.includes('opportunity')) {
    steps.push({
      id: `step_${String(steps.length + 1).padStart(3, '0')}`,
      name: 'Move Pipeline Stage',
      tool: 'crm_move_opportunity',
      inputs: { contactId: '{{trigger.contactId}}', stage: '{{variables.stage}}' },
    })
  }

  // Default: at least add a tag
  if (steps.length === 0) {
    steps.push({
      id: 'step_001',
      name: 'Tag Contact',
      tool: 'crm_add_tag',
      inputs: { contactId: '{{trigger.contactId}}', tag: 'automation-triggered' },
    })
  }

  return {
    name: prompt.slice(0, 60),
    version: '1.0.0',
    description: prompt,
    trigger,
    steps,
    variables: {},
  }
}
