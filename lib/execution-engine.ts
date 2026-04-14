/**
 * Execution Engine — runs .0n workflow steps against connected services
 *
 * Takes a generated .0n file from bridge/message and executes each step
 * through the user's connected integrations. Supports:
 *   - CRM operations (contacts, conversations, pipeline, calendar)
 *   - Stripe operations (customers, invoices, subscriptions)
 *   - Slack messaging
 *   - Workflow saves to user_workflows
 *
 * Sequential steps honor depends_on. Independent steps run in parallel
 * via radial burst pattern.
 */

import { createClient } from '@supabase/supabase-js'
import { crmGet, crmPost, crmPut, crmDelete, getAuthForLocation } from './crm'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getUserServiceCreds(userId: string, service: string): Promise<Record<string, string> | null> {
  // Uses the unified validate_and_decrypt Vault function
  // This decrypts from Vault, logs the access, and updates last_used
  const admin = getAdmin()
  // Direct Vault lookup for execution context (no token needed, we already have userId)
  const { data: vaultData } = await admin.rpc('get_decrypted_credentials', {
    p_user_id: userId,
    p_service: service,
  })

  if (vaultData && typeof vaultData === 'object') {
    const creds = (typeof vaultData === 'string' ? JSON.parse(vaultData) : vaultData) as Record<string, unknown>
    if (creds.encrypted) return null
    await admin.from('user_service_connections').update({
      last_used_at: new Date().toISOString(),
      call_count: 1,
    }).eq('user_id', userId).eq('service', service)
    return creds as Record<string, string>
  }

  return null
}

export interface DotOnStep {
  id: string
  action: string
  input: Record<string, unknown>
  depends_on?: string[]
}

export interface DotOnFile {
  name: string
  version: string
  description: string
  steps: DotOnStep[]
  metadata: Record<string, unknown>
}

export interface StepResult {
  stepId: string
  status: 'success' | 'error' | 'skipped'
  data?: unknown
  error?: string
  durationMs: number
}

export interface ExecutionResult {
  workflowName: string
  status: 'completed' | 'partial' | 'failed'
  steps: StepResult[]
  totalDurationMs: number
}

interface UserContext {
  userId: string
  crmLocationId?: string
  tier: number
}

export async function executeWorkflow(
  dotOn: DotOnFile,
  ctx: UserContext
): Promise<ExecutionResult> {
  const start = Date.now()
  const results: StepResult[] = []
  const stepOutputs = new Map<string, unknown>()

  // Group steps by dependency level for radial burst
  const levels = buildExecutionLevels(dotOn.steps)

  for (const level of levels) {
    const levelResults = await Promise.all(
      level.map(step => executeStep(step, ctx, stepOutputs))
    )
    for (const result of levelResults) {
      results.push(result)
      if (result.status === 'success') {
        stepOutputs.set(result.stepId, result.data)
      }
    }
  }

  const totalDurationMs = Date.now() - start
  const failed = results.filter(r => r.status === 'error').length
  const status = failed === results.length ? 'failed' : failed > 0 ? 'partial' : 'completed'

  // Log execution
  const admin = getAdmin()
  await admin.from('workflow_executions').insert({
    user_id: ctx.userId,
    workflow_name: dotOn.name,
    status,
    input: dotOn.metadata,
    dot_on_file: dotOn,
    results,
    duration_ms: totalDurationMs,
  } as Record<string, unknown>).then(() => {}, () => {})

  return { workflowName: dotOn.name, status, steps: results, totalDurationMs }
}

function buildExecutionLevels(steps: DotOnStep[]): DotOnStep[][] {
  const levels: DotOnStep[][] = []
  const placed = new Set<string>()

  while (placed.size < steps.length) {
    const level = steps.filter(s => {
      if (placed.has(s.id)) return false
      if (!s.depends_on || s.depends_on.length === 0) return true
      return s.depends_on.every(dep => placed.has(dep))
    })

    if (level.length === 0) break // circular dependency guard
    level.forEach(s => placed.add(s.id))
    levels.push(level)
  }

  return levels
}

async function executeStep(
  step: DotOnStep,
  ctx: UserContext,
  _outputs: Map<string, unknown>
): Promise<StepResult> {
  const start = Date.now()

  try {
    const action = step.action?.toLowerCase() || 'resolve'
    const input = step.input || {}
    let data: unknown

    switch (action) {
      case 'crm.contacts.list':
      case 'crm_contacts_list': {
        if (!ctx.crmLocationId) throw new Error('CRM not connected')
        const query = (input.query as string) || ''
        const limit = (input.limit as string) || '20'
        const res = await crmGet(`/contacts/?limit=${limit}${query ? `&query=${encodeURIComponent(query)}` : ''}`, ctx.crmLocationId)
        data = await res.json()
        break
      }

      case 'crm.contacts.create':
      case 'crm_contacts_create': {
        if (!ctx.crmLocationId) throw new Error('CRM not connected')
        const res = await crmPost('/contacts/', ctx.crmLocationId, input as Record<string, unknown>)
        data = await res.json()
        break
      }

      case 'crm.contacts.update':
      case 'crm_contacts_update': {
        if (!ctx.crmLocationId) throw new Error('CRM not connected')
        const contactId = input.contactId as string
        if (!contactId) throw new Error('Missing contactId')
        const res = await crmPut(`/contacts/${contactId}`, ctx.crmLocationId, input as Record<string, unknown>)
        data = await res.json()
        break
      }

      case 'crm.contacts.tag':
      case 'crm_contacts_tag': {
        if (!ctx.crmLocationId) throw new Error('CRM not connected')
        const contactId = input.contactId as string
        const tags = input.tags as string[]
        const res = await crmPost(`/contacts/${contactId}/tags`, ctx.crmLocationId, { tags })
        data = await res.json()
        break
      }

      case 'crm.conversations.send':
      case 'crm_send_message': {
        if (!ctx.crmLocationId) throw new Error('CRM not connected')
        const res = await crmPost('/conversations/messages', ctx.crmLocationId, input as Record<string, unknown>)
        data = await res.json()
        break
      }

      case 'crm.pipeline.list':
      case 'crm_pipelines_list': {
        if (!ctx.crmLocationId) throw new Error('CRM not connected')
        const res = await crmGet('/opportunities/pipelines', ctx.crmLocationId)
        data = await res.json()
        break
      }

      case 'crm.opportunities.create':
      case 'crm_opportunities_create': {
        if (!ctx.crmLocationId) throw new Error('CRM not connected')
        const res = await crmPost('/opportunities/', ctx.crmLocationId, input as Record<string, unknown>)
        data = await res.json()
        break
      }

      case 'crm.calendar.list':
      case 'crm_calendars_list': {
        if (!ctx.crmLocationId) throw new Error('CRM not connected')
        const res = await crmGet('/calendars/', ctx.crmLocationId)
        data = await res.json()
        break
      }

      case 'crm.calendar.create_event':
      case 'crm_calendar_create_event': {
        if (!ctx.crmLocationId) throw new Error('CRM not connected')
        const res = await crmPost('/calendars/events/appointments', ctx.crmLocationId, input as Record<string, unknown>)
        data = await res.json()
        break
      }

      case 'stripe.customers.list': {
        const stripeCreds = await getUserServiceCreds(ctx.userId, 'stripe')
        const stripeKey = stripeCreds?.api_key || process.env.STRIPE_SECRET_KEY || ''
        const res = await fetch('https://api.stripe.com/v1/customers?limit=10', {
          headers: { Authorization: `Bearer ${stripeKey}` },
        })
        data = await res.json()
        break
      }

      case 'stripe.invoices.list': {
        const stripeCreds = await getUserServiceCreds(ctx.userId, 'stripe')
        const stripeKey = stripeCreds?.api_key || process.env.STRIPE_SECRET_KEY || ''
        const res = await fetch('https://api.stripe.com/v1/invoices?limit=10', {
          headers: { Authorization: `Bearer ${stripeKey}` },
        })
        data = await res.json()
        break
      }

      case 'slack.message': {
        const slackCreds = await getUserServiceCreds(ctx.userId, 'slack')
        const slackToken = slackCreds?.bot_token || process.env.SLACK_BOT_TOKEN || ''
        const slackChannel = (input.channel as string) || slackCreds?.default_channel || ''
        const text = input.text as string
        if (!text) throw new Error('Missing text')
        const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: { Authorization: `Bearer ${slackToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: slackChannel, text }),
        })
        data = await res.json()
        break
      }

      case 'sendgrid.send': {
        const sgCreds = await getUserServiceCreds(ctx.userId, 'sendgrid')
        if (!sgCreds?.api_key) throw new Error('SendGrid not connected')
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sgCreds.api_key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        data = { status: res.status, ok: res.ok }
        break
      }

      case 'twilio.sms': {
        const twCreds = await getUserServiceCreds(ctx.userId, 'twilio')
        if (!twCreds?.account_sid || !twCreds?.auth_token) throw new Error('Twilio not connected')
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twCreds.account_sid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${twCreds.account_sid}:${twCreds.auth_token}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: input.to as string,
            From: (input.from as string) || twCreds.phone_number || '',
            Body: input.body as string || input.text as string || '',
          }),
        })
        data = await res.json()
        break
      }

      case 'openai.chat': {
        const oaCreds = await getUserServiceCreds(ctx.userId, 'openai')
        if (!oaCreds?.api_key) throw new Error('OpenAI not connected')
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${oaCreds.api_key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: (input.model as string) || 'gpt-4o-mini',
            messages: input.messages || [{ role: 'user', content: input.prompt || input.text }],
            max_tokens: (input.max_tokens as number) || 500,
          }),
        })
        data = await res.json()
        break
      }

      case 'notion.search':
      case 'notion.query': {
        const noCreds = await getUserServiceCreds(ctx.userId, 'notion')
        if (!noCreds?.api_key) throw new Error('Notion not connected')
        const res = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: { Authorization: `Bearer ${noCreds.api_key}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: input.query || input.text || '' }),
        })
        data = await res.json()
        break
      }

      case 'airtable.list': {
        const atCreds = await getUserServiceCreds(ctx.userId, 'airtable')
        if (!atCreds?.api_key) throw new Error('Airtable not connected')
        const baseId = input.base_id as string || ''
        const tableId = input.table_id as string || input.table as string || ''
        const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}?maxRecords=20`, {
          headers: { Authorization: `Bearer ${atCreds.api_key}` },
        })
        data = await res.json()
        break
      }

      case 'github.repos': {
        const ghCreds = await getUserServiceCreds(ctx.userId, 'github')
        if (!ghCreds?.api_key) throw new Error('GitHub not connected')
        const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
          headers: { Authorization: `Bearer ${ghCreds.api_key}`, Accept: 'application/vnd.github.v3+json' },
        })
        data = await res.json()
        break
      }

      case 'shopify.products': {
        const shCreds = await getUserServiceCreds(ctx.userId, 'shopify')
        if (!shCreds?.api_key || !shCreds?.store_url) throw new Error('Shopify not connected')
        const res = await fetch(`https://${shCreds.store_url}/admin/api/2024-01/products.json?limit=10`, {
          headers: { 'X-Shopify-Access-Token': shCreds.api_key },
        })
        data = await res.json()
        break
      }

      case 'mailchimp.lists': {
        const mcCreds = await getUserServiceCreds(ctx.userId, 'mailchimp')
        if (!mcCreds?.api_key || !mcCreds?.server) throw new Error('Mailchimp not connected')
        const res = await fetch(`https://${mcCreds.server}.api.mailchimp.com/3.0/lists`, {
          headers: { Authorization: 'Basic ' + Buffer.from(`anystring:${mcCreds.api_key}`).toString('base64') },
        })
        data = await res.json()
        break
      }

      case 'hubspot.contacts': {
        const hsCreds = await getUserServiceCreds(ctx.userId, 'hubspot')
        if (!hsCreds?.api_key) throw new Error('HubSpot not connected')
        const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=10', {
          headers: { Authorization: `Bearer ${hsCreds.api_key}` },
        })
        data = await res.json()
        break
      }

      case 'resolve':
      default: {
        // AI intent resolution — parse the natural language command
        const command = (input.command as string) || ''
        data = await resolveIntent(command, ctx)
        break
      }
    }

    return { stepId: step.id, status: 'success', data, durationMs: Date.now() - start }
  } catch (err) {
    return {
      stepId: step.id,
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
      durationMs: Date.now() - start,
    }
  }
}

/**
 * Resolve natural language intent to a structured action.
 * Returns the matched action + extracted parameters.
 */
async function resolveIntent(command: string, ctx: UserContext): Promise<unknown> {
  const lower = command.toLowerCase()

  // Contact operations
  if (lower.match(/(?:show|list|get|find)\s+(?:my\s+)?contacts/)) {
    if (!ctx.crmLocationId) return { action: 'crm.contacts.list', error: 'CRM not connected' }
    const res = await crmGet('/contacts/?limit=10', ctx.crmLocationId)
    return { action: 'crm.contacts.list', result: await res.json() }
  }

  if (lower.match(/(?:create|add|new)\s+(?:a\s+)?contact/)) {
    const nameMatch = command.match(/(?:named?|called?)\s+([A-Za-z]+\s+[A-Za-z]+)/i)
    const emailMatch = command.match(/(?:email|with)\s+([\w.+-]+@[\w.-]+)/i)
    if (ctx.crmLocationId && (nameMatch || emailMatch)) {
      const body: Record<string, unknown> = {}
      if (nameMatch) {
        const [first, ...rest] = nameMatch[1].split(' ')
        body.firstName = first
        body.lastName = rest.join(' ')
      }
      if (emailMatch) body.email = emailMatch[1]
      const res = await crmPost('/contacts/', ctx.crmLocationId, body)
      return { action: 'crm.contacts.create', result: await res.json() }
    }
    return { action: 'crm.contacts.create', parsed: { name: nameMatch?.[1], email: emailMatch?.[1] } }
  }

  // Pipeline operations
  if (lower.match(/(?:show|list|get)\s+(?:my\s+)?(?:pipeline|deals|opportunities)/)) {
    if (!ctx.crmLocationId) return { action: 'crm.pipeline.list', error: 'CRM not connected' }
    const res = await crmGet('/opportunities/pipelines', ctx.crmLocationId)
    return { action: 'crm.pipeline.list', result: await res.json() }
  }

  // Calendar operations
  if (lower.match(/(?:show|list|get)\s+(?:my\s+)?(?:calendar|appointments|events)/)) {
    if (!ctx.crmLocationId) return { action: 'crm.calendar.list', error: 'CRM not connected' }
    const res = await crmGet('/calendars/', ctx.crmLocationId)
    return { action: 'crm.calendar.list', result: await res.json() }
  }

  // Conversation operations
  if (lower.match(/(?:show|list|get)\s+(?:my\s+)?(?:conversations|messages|inbox)/)) {
    if (!ctx.crmLocationId) return { action: 'crm.conversations.list', error: 'CRM not connected' }
    const res = await crmGet('/conversations/search?limit=10', ctx.crmLocationId)
    return { action: 'crm.conversations.list', result: await res.json() }
  }

  // Slack operations
  if (lower.match(/(?:send|post)\s+(?:a\s+)?(?:message|slack)/)) {
    return { action: 'slack.message', parsed: { text: command } }
  }

  // Health check
  if (lower.match(/(?:check|show|get)\s+(?:my\s+)?(?:health|status|connections)/)) {
    const auth = ctx.crmLocationId ? await getAuthForLocation(ctx.crmLocationId) : null
    return {
      action: 'health_check',
      crm: auth ? { source: auth.source, connected: true } : { connected: false },
      tier: ctx.tier,
    }
  }

  return { action: 'unresolved', command, message: 'Command not yet mapped. This will be routed through AI in a future update.' }
}
