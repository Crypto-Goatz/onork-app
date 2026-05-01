/**
 * Convert a saved automation's nodes+edges into the 0nFlow `steps[]` shape.
 *
 * Engine contract (verified against pwujhhmlrtxjmjzyttwn.flow_steps):
 *   { action: 'email'|'sms'|'tag_add'|'slack'|'webhook'|'wait',
 *     params: jsonb,
 *     delay_seconds: number }
 *
 * Templating: the engine resolves {{contact.email}}, {{contact.id}},
 * {{contact.data.<field>}}, {{flow.slug}} per-step before dispatch — so we
 * pass param strings through as-is.
 *
 * Mapping policy:
 *   - 5 native actions get direct mapping.
 *   - "wait_*" capabilities collapse into delay_seconds on the next step
 *     (the flow engine itself has no concept of a stand-alone wait node —
 *      it just schedules each step at enrolled_at + cumulative_delay).
 *   - Any unmapped capability emits `webhook` action POSTing to
 *     /api/flows/callback/run-capability so the existing capability
 *     runner stays the source of truth for behavior.
 */

import { readDelaySeconds } from '@/lib/automations/delay'

export type FlowAction = 'email' | 'sms' | 'tag_add' | 'slack' | 'webhook' | 'wait'

export interface FlowStep {
  action: FlowAction
  params: Record<string, unknown>
  delay_seconds: number
}

export interface ToFlowResult {
  steps: FlowStep[]
  hasDelays: boolean
  warnings: string[]
}

// ─── Capability id → flow action ─────────────────────────────────────────────
// Only the obvious 1:1 mappings. Anything missing falls through to `webhook`
// + the callback runner.
export const CAPABILITY_TO_FLOW_ACTION: Record<string, FlowAction> = {
  // email
  send_email: 'email',
  send_email_template: 'email',
  send_review_request: 'email',
  follow_up_no_show: 'email',
  send_website_report: 'email',

  // sms
  send_sms: 'sms',
  send_reminder: 'sms',

  // tag_add
  add_tag: 'tag_add',

  // slack (capability not yet defined; reserved)
  slack_notify: 'slack',

  // webhook (native)
  post_webhook: 'webhook',

  // wait — handled specially below; not actually emitted as a flow step
  wait: 'wait',
  wait_minutes: 'wait',
  wait_hours: 'wait',
  wait_days: 'wait',
}

const WAIT_CAPABILITY_IDS = new Set(['wait', 'wait_minutes', 'wait_hours', 'wait_days'])

// ─── Builder node shape (matches CapabilityNodeData) ─────────────────────────
interface BuilderNode {
  id: string
  data: {
    capabilityId: string
    name?: string
    category?: string
    config?: Record<string, string>
  }
}

interface BuilderEdge {
  source: string
  target: string
}

// Topological sort via Kahn's algorithm. Returns nodes in execution order
// starting from any source (a node with no incoming edges). For typical
// linear workflows this just returns the chain in order.
function topoSort(nodes: BuilderNode[], edges: BuilderEdge[]): BuilderNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, string[]>()
  for (const n of nodes) {
    incoming.set(n.id, 0)
    outgoing.set(n.id, [])
  }
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue
    incoming.set(e.target, (incoming.get(e.target) || 0) + 1)
    outgoing.get(e.source)!.push(e.target)
  }
  const queue: string[] = []
  for (const [id, count] of incoming) if (count === 0) queue.push(id)
  const result: BuilderNode[] = []
  while (queue.length) {
    const id = queue.shift()!
    const n = byId.get(id)
    if (n) result.push(n)
    for (const next of outgoing.get(id) || []) {
      incoming.set(next, (incoming.get(next) || 0) - 1)
      if ((incoming.get(next) || 0) === 0) queue.push(next)
    }
  }
  // Append any nodes left disconnected so we don't silently drop them
  if (result.length < nodes.length) {
    const seen = new Set(result.map((n) => n.id))
    for (const n of nodes) if (!seen.has(n.id)) result.push(n)
  }
  return result
}

// ─── Param shaping per action ────────────────────────────────────────────────
function shapeEmailParams(config: Record<string, string>): Record<string, unknown> {
  return {
    to: config.to || '{{contact.email}}',
    subject: config.subject || '',
    body: config.body || config.message || '',
    from: config.from || undefined,
    template_id: config.template_id || undefined,
  }
}

function shapeSmsParams(config: Record<string, string>): Record<string, unknown> {
  return {
    to: config.to || '{{contact.phone}}',
    message: config.message || config.body || '',
  }
}

function shapeTagAddParams(config: Record<string, string>): Record<string, unknown> {
  return {
    contact_id: config.contact_id || '{{contact.id}}',
    tags: (config.tag || config.tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  }
}

function shapeSlackParams(config: Record<string, string>): Record<string, unknown> {
  return {
    channel: config.channel || '',
    text: config.text || config.message || '',
  }
}

function shapePostWebhookParams(config: Record<string, string>): Record<string, unknown> {
  let headers: Record<string, string> | undefined
  if (config.headers) {
    try {
      const parsed = JSON.parse(config.headers)
      if (parsed && typeof parsed === 'object') headers = parsed as Record<string, string>
    } catch {
      // ignore malformed JSON; let the engine surface the param string
    }
  }
  let body: unknown = config.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      // leave as string
    }
  }
  return {
    url: config.url || '',
    method: config.method || 'POST',
    headers,
    body,
  }
}

function shapeFallbackCallbackParams(args: {
  capabilityId: string
  workflowId: string
  config: Record<string, string>
  callbackUrl: string
  callbackSecret: string
}): Record<string, unknown> {
  // Strip delay_seconds — only relevant to the builder UI.
  const { delay_seconds: _drop, ...payloadConfig } = args.config
  return {
    url: args.callbackUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-flow-callback-secret': args.callbackSecret,
    },
    body: {
      capability_id: args.capabilityId,
      workflow_id: args.workflowId,
      config: payloadConfig,
      contact: {
        id: '{{contact.id}}',
        email: '{{contact.email}}',
        name: '{{contact.data.name}}',
        phone: '{{contact.data.phone}}',
        trigger: '{{contact.data.trigger}}',
      },
    },
  }
}

// ─── Main mapper ─────────────────────────────────────────────────────────────
export interface ToFlowOptions {
  workflowId: string
  // Where the flow engine should POST when it encounters an unmapped capability.
  // Defaults to https://www.0ncore.com/api/flows/callback/run-capability.
  callbackUrl?: string
  callbackSecret: string
}

export function toFlowSteps(
  rawNodes: BuilderNode[],
  edges: BuilderEdge[],
  opts: ToFlowOptions,
): ToFlowResult {
  const callbackUrl =
    opts.callbackUrl || 'https://www.0ncore.com/api/flows/callback/run-capability'
  const warnings: string[] = []

  // 1. Drop trigger nodes — they are the entry point, not a step.
  const ordered = topoSort(rawNodes, edges).filter((n) => {
    const cat = n.data.category
    const id = n.data.capabilityId
    return cat !== 'triggers' && !id.startsWith('trigger_')
  })

  // 2. Walk in order. Wait nodes collapse into the next non-wait step's delay.
  const steps: FlowStep[] = []
  let pendingDelaySeconds = 0

  for (const node of ordered) {
    const config = node.data.config || {}
    const capId = node.data.capabilityId
    const ownDelay = readDelaySeconds(config)

    if (WAIT_CAPABILITY_IDS.has(capId)) {
      pendingDelaySeconds += ownDelay
      // wait nodes that have value 0 are still useful as visual markers; collapse
      continue
    }

    const action: FlowAction = CAPABILITY_TO_FLOW_ACTION[capId] ?? 'webhook'
    const totalDelay = pendingDelaySeconds + ownDelay
    pendingDelaySeconds = 0

    let params: Record<string, unknown>
    if (action === 'email') {
      params = shapeEmailParams(config)
    } else if (action === 'sms') {
      params = shapeSmsParams(config)
    } else if (action === 'tag_add') {
      params = shapeTagAddParams(config)
    } else if (action === 'slack') {
      params = shapeSlackParams(config)
    } else if (action === 'webhook' && capId === 'post_webhook') {
      params = shapePostWebhookParams(config)
    } else {
      // Unmapped capability → callback runner
      if (CAPABILITY_TO_FLOW_ACTION[capId] === undefined) {
        warnings.push(
          `Capability "${capId}" has no native flow action; routing through /api/flows/callback/run-capability.`,
        )
      }
      params = shapeFallbackCallbackParams({
        capabilityId: capId,
        workflowId: opts.workflowId,
        config,
        callbackUrl,
        callbackSecret: opts.callbackSecret,
      })
    }

    steps.push({ action, params, delay_seconds: totalDelay })
  }

  // 3. If any wait time is left over (workflow ends with a wait), surface it
  //    via metadata — the engine has no way to schedule a "future no-op".
  if (pendingDelaySeconds > 0) {
    warnings.push(
      `Trailing wait of ${pendingDelaySeconds}s ignored — the flow ends after the last action step.`,
    )
  }

  const hasDelays = steps.some((s) => s.delay_seconds > 0)
  return { steps, hasDelays, warnings }
}
