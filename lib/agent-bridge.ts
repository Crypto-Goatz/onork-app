/**
 * Agent Bridge — Unified endpoint that decomposes natural language intents
 * into CRM API calls for agents, workflows, voice AI, forms, funnels, etc.
 *
 * Uses Groq (llama-3.3-70b-versatile) for intent classification and decomposition.
 * Uses CRM API (https://services.leadconnectorhq.com) for execution.
 */

import { createClient } from '@supabase/supabase-js'
import { crmGet, crmPost, crmPut, getAuthForLocation } from './crm'
import { TEMPLATES, matchTemplate, type WorkflowTemplate } from './workflows/templates'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BridgeAction =
  | 'create-workflow'
  | 'create-voice-agent'
  | 'configure-chat'
  | 'create-form'
  | 'create-funnel'
  | 'create-email-sequence'
  | 'blog-to-social'
  | 'setup-tracking'
  | 'full-setup'
  | 'create-contact'
  | 'send-message'
  | 'unknown'

export interface BridgeRequest {
  action?: string // auto-detected or explicit
  intent: string // natural language description
  locationId: string
  conversationId?: string
  contactId?: string
  userId?: string
}

export interface BridgeCreated {
  type: string
  id?: string
  name: string
  detail?: string
}

export interface BridgeResult {
  action: string
  success: boolean
  created: BridgeCreated[]
  summary: string
  errors?: string[]
}

// ---------------------------------------------------------------------------
// Groq helper
// ---------------------------------------------------------------------------

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

async function groqChat(
  systemPrompt: string,
  userMessage: string,
  json = true
): Promise<string> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY not configured')

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2048,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ---------------------------------------------------------------------------
// Supabase admin (for logging bridge executions)
// ---------------------------------------------------------------------------

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ---------------------------------------------------------------------------
// Step 1: Intent Classification
// ---------------------------------------------------------------------------

async function classifyIntent(intent: string): Promise<BridgeAction> {
  const systemPrompt = `You classify user intents into exactly one action category.

Available actions:
- create-workflow: Build an automation workflow, follow-up sequence, drip campaign, automated messages
- create-voice-agent: Set up a voice AI agent, phone bot, call handler, IVR
- configure-chat: Set up conversation AI, chat widget, chatbot, live chat
- create-form: Build a form, survey, intake form, application
- create-funnel: Build a funnel page, landing page, opt-in page
- create-email-sequence: Set up email automation, newsletter sequence, email drip
- blog-to-social: Content creation and distribution, blog post, social media posting
- setup-tracking: Configure analytics, pixels, tracking codes
- full-setup: Complete business setup that involves multiple actions
- create-contact: Create or update a contact record
- send-message: Send a specific message (SMS, email) to someone
- unknown: Cannot determine what the user wants

Respond with JSON: { "action": "the-action-name", "confidence": 0.0-1.0 }`

  try {
    const raw = await groqChat(systemPrompt, intent)
    const parsed = JSON.parse(raw)
    if (parsed.action && parsed.confidence >= 0.5) {
      return parsed.action as BridgeAction
    }
  } catch (err) {
    console.error('[bridge.classifyIntent]', err)
  }
  return 'unknown'
}

// ---------------------------------------------------------------------------
// Step 2: Intent Decomposition
// ---------------------------------------------------------------------------

interface DecomposedWorkflow {
  name: string
  trigger: string
  steps: {
    delay: string
    type: 'sms' | 'email' | 'task' | 'webhook'
    template?: string
    subject?: string
    title?: string
  }[]
}

interface DecomposedVoiceAgent {
  name: string
  greeting: string
  knowledge: string
  personality?: string
  transferNumber?: string
}

interface DecomposedChat {
  name: string
  greeting: string
  knowledge: string
  pages?: string[]
}

interface DecomposedContact {
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  tags?: string[]
}

interface DecomposedMessage {
  type: 'sms' | 'email'
  to?: string
  subject?: string
  body: string
}

async function decomposeIntent(
  action: BridgeAction,
  intent: string
): Promise<Record<string, unknown>> {
  const actionSchemas: Record<string, string> = {
    'create-workflow': `{
  "name": "Workflow name",
  "trigger": "contact.created|appointment.scheduled|appointment.completed|contact.inactive|call.missed|invoice.sent|manual",
  "steps": [
    { "delay": "5m|1h|24h|3d|7d|0", "type": "sms|email|task|webhook", "template": "message text", "subject": "email subject (if email)", "title": "task title (if task)" }
  ]
}`,
    'create-voice-agent': `{
  "name": "Agent name",
  "greeting": "What the agent says first",
  "knowledge": "Comma-separated knowledge areas",
  "personality": "Optional personality description",
  "transferNumber": "Optional phone number to transfer to"
}`,
    'configure-chat': `{
  "name": "Chat widget name",
  "greeting": "Initial greeting message",
  "knowledge": "What the chatbot knows about",
  "pages": ["Optional list of pages to embed on"]
}`,
    'create-contact': `{
  "firstName": "First name",
  "lastName": "Last name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "tags": ["optional", "tags"]
}`,
    'send-message': `{
  "type": "sms|email",
  "to": "phone or email",
  "subject": "email subject (if email)",
  "body": "message content"
}`,
    'create-email-sequence': `{
  "name": "Sequence name",
  "steps": [
    { "delay": "0|1d|3d|7d", "subject": "Email subject", "template": "Email body text" }
  ]
}`,
    'create-form': `{
  "name": "Form name",
  "fields": ["firstName", "lastName", "email", "phone", "message"]
}`,
    'create-funnel': `{
  "name": "Funnel name",
  "headline": "Main headline",
  "subheadline": "Sub headline",
  "cta": "Call to action text"
}`,
    'blog-to-social': `{
  "topic": "Content topic",
  "platforms": ["facebook", "instagram", "linkedin"],
  "tone": "professional|casual|friendly"
}`,
    'setup-tracking': `{
  "platform": "google-analytics|facebook-pixel|google-ads",
  "trackingId": "The tracking/pixel ID"
}`,
  }

  const schema = actionSchemas[action] || '{ "details": "Describe what to do" }'

  const systemPrompt = `You decompose a user's natural language intent into structured parameters for a "${action}" action.

Output JSON matching this schema:
${schema}

Fill in reasonable defaults for any missing information. Be creative with message templates — make them professional and effective. Use {{contact.name}} and {{business.name}} as template variables where appropriate.`

  try {
    const raw = await groqChat(systemPrompt, intent)
    return JSON.parse(raw)
  } catch (err) {
    console.error('[bridge.decomposeIntent]', err)
    return {}
  }
}

// ---------------------------------------------------------------------------
// Step 3: CRM API Execution
// ---------------------------------------------------------------------------

async function executeWorkflow(
  params: DecomposedWorkflow,
  locationId: string,
  userId?: string
): Promise<BridgeCreated[]> {
  const created: BridgeCreated[] = []

  // Check if this matches a known template first
  const templateKey = matchTemplate(params.name + ' ' + params.trigger)
  const template = templateKey ? TEMPLATES[templateKey] : null

  // Use template steps if matched, otherwise use AI-decomposed steps
  const steps = template?.steps ?? params.steps
  const name = template?.name ?? params.name

  // CRM cannot create workflows via API — we register a webhook-based handler.
  // Store the workflow definition in bridge_executions and create tags for tracking.
  const admin = getAdmin()

  // Store the workflow definition for our webhook handler
  const workflowDef = {
    name,
    trigger: params.trigger,
    steps,
    locationId,
    createdBy: userId,
    active: true,
  }

  const { data: stored } = await admin
    .from('bridge_workflows')
    .insert({
      location_id: locationId,
      name,
      trigger: params.trigger,
      definition: workflowDef,
      status: 'active',
      created_by: userId,
    })
    .select('id')
    .single()

  if (stored?.id) {
    created.push({
      type: 'workflow',
      id: stored.id,
      name,
      detail: `${steps.length} steps, trigger: ${params.trigger}`,
    })
  }

  // Create tags in CRM for workflow tracking
  const tags = template?.tags ?? [`bridge-${templateKey || 'custom'}`]
  for (const tag of tags) {
    try {
      await crmPost('/locations/tags', locationId, { name: tag })
      created.push({ type: 'tag', name: tag })
    } catch {
      // Tag may already exist — not an error
    }
  }

  return created
}

async function executeVoiceAgent(
  params: DecomposedVoiceAgent,
  locationId: string
): Promise<BridgeCreated[]> {
  const created: BridgeCreated[] = []

  // Store voice agent config — actual CRM voice agent provisioning
  // is done via custom values + webhook integration
  const admin = getAdmin()
  const { data: stored } = await admin
    .from('bridge_workflows')
    .insert({
      location_id: locationId,
      name: params.name,
      trigger: 'voice.inbound',
      definition: {
        type: 'voice-agent',
        ...params,
        locationId,
      },
      status: 'active',
    })
    .select('id')
    .single()

  if (stored?.id) {
    created.push({
      type: 'voice-agent',
      id: stored.id,
      name: params.name,
      detail: `Greeting: "${params.greeting.slice(0, 60)}..."`,
    })
  }

  // Set custom values in CRM for voice agent config
  try {
    await crmPost('/locations/customValues', locationId, {
      name: `voice_agent_${stored?.id?.slice(0, 8)}`,
      value: JSON.stringify({
        greeting: params.greeting,
        knowledge: params.knowledge,
        personality: params.personality,
        transferNumber: params.transferNumber,
      }),
    })
    created.push({
      type: 'custom-value',
      name: `voice_agent_config`,
      detail: 'Voice agent configuration stored',
    })
  } catch (err) {
    console.error('[bridge.voiceAgent] custom value error:', err)
  }

  return created
}

async function executeChat(
  params: DecomposedChat,
  locationId: string
): Promise<BridgeCreated[]> {
  const created: BridgeCreated[] = []

  const admin = getAdmin()
  const { data: stored } = await admin
    .from('bridge_workflows')
    .insert({
      location_id: locationId,
      name: params.name,
      trigger: 'chat.inbound',
      definition: {
        type: 'chat-widget',
        ...params,
        locationId,
      },
      status: 'active',
    })
    .select('id')
    .single()

  if (stored?.id) {
    created.push({
      type: 'chat-widget',
      id: stored.id,
      name: params.name,
      detail: `Greeting: "${params.greeting.slice(0, 60)}..."`,
    })
  }

  return created
}

async function executeContact(
  params: DecomposedContact,
  locationId: string
): Promise<BridgeCreated[]> {
  const created: BridgeCreated[] = []

  const body: Record<string, unknown> = {
    firstName: params.firstName,
    lastName: params.lastName || '',
    email: params.email || '',
    phone: params.phone || '',
    tags: params.tags || [],
  }

  try {
    const res = await crmPost('/contacts/', locationId, body)
    if (res.ok) {
      const data = await res.json()
      created.push({
        type: 'contact',
        id: data.contact?.id,
        name: `${params.firstName} ${params.lastName || ''}`.trim(),
        detail: params.email || params.phone || undefined,
      })
    } else {
      const err = await res.text()
      console.error('[bridge.contact] CRM error:', err)
    }
  } catch (err) {
    console.error('[bridge.contact] error:', err)
  }

  return created
}

async function executeMessage(
  params: DecomposedMessage,
  locationId: string,
  contactId?: string
): Promise<BridgeCreated[]> {
  const created: BridgeCreated[] = []

  if (!contactId) {
    return created // Need a contact to send to
  }

  try {
    const msgBody: Record<string, unknown> = {
      type: params.type === 'email' ? 'Email' : 'SMS',
      contactId,
      message: params.body,
    }
    if (params.type === 'email' && params.subject) {
      msgBody.subject = params.subject
    }

    const res = await crmPost('/conversations/messages', locationId, msgBody)
    if (res.ok) {
      const data = await res.json()
      created.push({
        type: 'message',
        id: data.message?.id || data.messageId,
        name: `${params.type.toUpperCase()} sent`,
        detail: params.body.slice(0, 80),
      })
    }
  } catch (err) {
    console.error('[bridge.message] error:', err)
  }

  return created
}

async function executeEmailSequence(
  params: { name: string; steps: { delay: string; subject: string; template: string }[] },
  locationId: string,
  userId?: string
): Promise<BridgeCreated[]> {
  // Email sequences are stored as workflows with email-only steps
  return executeWorkflow(
    {
      name: params.name,
      trigger: 'manual',
      steps: params.steps.map((s) => ({
        delay: s.delay,
        type: 'email' as const,
        subject: s.subject,
        template: s.template,
      })),
    },
    locationId,
    userId
  )
}

async function executeSocial(
  params: { topic: string; platforms: string[]; tone: string },
  locationId: string
): Promise<BridgeCreated[]> {
  const created: BridgeCreated[] = []

  // Generate social content via Groq
  const content = await groqChat(
    `You are a social media content creator. Generate a social media post about the given topic. Be engaging and professional. Output JSON: { "text": "post text", "hashtags": ["tag1", "tag2"] }`,
    `Topic: ${params.topic}\nTone: ${params.tone}\nPlatforms: ${params.platforms.join(', ')}`
  )

  try {
    const parsed = JSON.parse(content)
    const postText = `${parsed.text}\n\n${(parsed.hashtags || []).map((t: string) => `#${t}`).join(' ')}`

    // Post via CRM social media API
    const res = await crmPost(`/social-media-posting/${locationId}`, locationId, {
      postText,
      platforms: params.platforms,
      scheduleDate: new Date(Date.now() + 60000).toISOString(), // 1 min from now
    })

    if (res.ok) {
      const data = await res.json()
      created.push({
        type: 'social-post',
        id: data.id,
        name: `Social post: ${params.topic}`,
        detail: `Platforms: ${params.platforms.join(', ')}`,
      })
    }
  } catch (err) {
    console.error('[bridge.social] error:', err)
  }

  return created
}

// ---------------------------------------------------------------------------
// Step 4: Reply to CRM Conversation
// ---------------------------------------------------------------------------

async function replyToConversation(
  locationId: string,
  conversationId: string,
  summary: string
): Promise<void> {
  try {
    await crmPost('/conversations/messages', locationId, {
      type: 'Custom',
      conversationId,
      message: summary,
    })
  } catch (err) {
    console.error('[bridge.replyToConversation] error:', err)
  }
}

// ---------------------------------------------------------------------------
// Main: executeBridge
// ---------------------------------------------------------------------------

export async function executeBridge(request: BridgeRequest): Promise<BridgeResult> {
  const { intent, locationId, conversationId, contactId, userId } = request
  const errors: string[] = []
  const created: BridgeCreated[] = []

  // Log the execution start
  const admin = getAdmin()
  const { data: execRow } = await admin
    .from('bridge_executions')
    .insert({
      user_id: userId || null,
      location_id: locationId,
      action: request.action || 'auto-detect',
      intent,
      status: 'running',
    })
    .select('id')
    .single()

  const executionId = execRow?.id

  try {
    // Step 1: Classify intent (or use explicit action)
    const action = (request.action as BridgeAction) || (await classifyIntent(intent))

    if (action === 'unknown') {
      const result: BridgeResult = {
        action: 'unknown',
        success: false,
        created: [],
        summary: 'Could not determine what you want to create. Try being more specific, e.g. "set up a lead follow-up sequence" or "create a voice agent for my restaurant".',
        errors: ['Intent classification failed'],
      }
      await updateExecution(executionId, result)
      return result
    }

    // Update the action now that we know it
    if (executionId) {
      await admin
        .from('bridge_executions')
        .update({ action })
        .eq('id', executionId)
    }

    // Step 2: Decompose intent into parameters
    const params = await decomposeIntent(action, intent) as unknown

    // Step 3: Execute based on action
    switch (action) {
      case 'create-workflow':
        created.push(...(await executeWorkflow(params as DecomposedWorkflow, locationId, userId)))
        break

      case 'create-voice-agent':
        created.push(...(await executeVoiceAgent(params as DecomposedVoiceAgent, locationId)))
        break

      case 'configure-chat':
        created.push(...(await executeChat(params as DecomposedChat, locationId)))
        break

      case 'create-contact':
        created.push(...(await executeContact(params as DecomposedContact, locationId)))
        break

      case 'send-message':
        created.push(
          ...(await executeMessage(params as DecomposedMessage, locationId, contactId))
        )
        break

      case 'create-email-sequence':
        created.push(
          ...(await executeEmailSequence(
            params as { name: string; steps: { delay: string; subject: string; template: string }[] },
            locationId,
            userId
          ))
        )
        break

      case 'blog-to-social':
        created.push(
          ...(await executeSocial(
            params as { topic: string; platforms: string[]; tone: string },
            locationId
          ))
        )
        break

      case 'create-form':
      case 'create-funnel':
      case 'setup-tracking':
        // These require listing existing resources and cannot be fully created via API
        // Store the config for manual setup or future API support
        const { data: stored } = await admin
          .from('bridge_workflows')
          .insert({
            location_id: locationId,
            name: (params as Record<string, string>).name || `${action} config`,
            trigger: action,
            definition: { type: action, ...(params as Record<string, unknown>), locationId },
            status: 'pending-setup',
            created_by: userId,
          })
          .select('id')
          .single()

        if (stored?.id) {
          created.push({
            type: action,
            id: stored.id,
            name: (params as Record<string, string>).name || action,
            detail: 'Configuration saved — requires manual setup in CRM dashboard',
          })
        }
        break

      case 'full-setup': {
        // Decompose into multiple actions and execute sequentially
        const setupPlan = await groqChat(
          `You plan a full business setup. Break the request into a list of specific actions.
Output JSON: { "actions": [{ "action": "create-workflow|create-voice-agent|configure-chat|create-email-sequence", "intent": "specific description" }] }
Maximum 5 actions.`,
          intent
        )
        try {
          const plan = JSON.parse(setupPlan)
          for (const step of (plan.actions || []).slice(0, 5)) {
            const subResult = await executeBridge({
              action: step.action,
              intent: step.intent,
              locationId,
              contactId,
              userId,
            })
            created.push(...subResult.created)
            if (subResult.errors) errors.push(...subResult.errors)
          }
        } catch (err) {
          errors.push(`Full setup planning failed: ${err}`)
        }
        break
      }

      default:
        errors.push(`Unsupported action: ${action}`)
    }

    // Build summary
    const summary = created.length > 0
      ? `Created ${created.length} item${created.length > 1 ? 's' : ''}: ${created.map((c) => `${c.type} "${c.name}"`).join(', ')}`
      : 'No items were created. ' + (errors.length > 0 ? errors.join('. ') : 'The request may need more detail.')

    const result: BridgeResult = {
      action,
      success: created.length > 0,
      created,
      summary,
      errors: errors.length > 0 ? errors : undefined,
    }

    // Step 4: Reply to CRM conversation if provided
    if (conversationId) {
      await replyToConversation(locationId, conversationId, summary)
    }

    await updateExecution(executionId, result)
    return result
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    const result: BridgeResult = {
      action: request.action || 'unknown',
      success: false,
      created: [],
      summary: `Bridge execution failed: ${errorMsg}`,
      errors: [errorMsg],
    }
    await updateExecution(executionId, result)
    return result
  }
}

async function updateExecution(executionId: string | undefined, result: BridgeResult) {
  if (!executionId) return
  try {
    await getAdmin()
      .from('bridge_executions')
      .update({
        result: result as unknown as Record<string, unknown>,
        status: result.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)
  } catch (err) {
    console.error('[bridge.updateExecution]', err)
  }
}
