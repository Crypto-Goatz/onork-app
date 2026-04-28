/**
 * Jaxx automation tool surface — the ONLY execution capability in L1.
 *
 * 6 tools wrapping existing /api/automations/* endpoints:
 *   - generate    — NL description → .0n workflow JSON
 *   - test        — dry-run (non-mutating, returns step plan)
 *   - activate    — save + register trigger + activate
 *   - run         — on-demand execution of a saved workflow
 *   - list        — owner's workflows
 *   - disable     — flip status to inactive
 *
 * Every mutating tool requires:
 *   1. Capability flag set in conversation_ai_config (per-category opt-in)
 *   2. Explicit user confirmation in chat (auto_execute=false)
 *
 * Tools are dispatched server-side from the webhook handler. The model
 * proposes a tool call; we validate against the per-conversation capability
 * surface; if mutating and not yet confirmed, we surface a plan to the user
 * and wait for "yes" / "go" / "do it".
 */

import type { GroqToolDef } from '../groq'
import type { JaxxConfig } from '../security'

// ─────────────────────────────────────────────────────────────────────────
// Tool definitions (OpenAI-compatible function schema)
// ─────────────────────────────────────────────────────────────────────────

export const TOOL_AUTOMATION_GENERATE: GroqToolDef = {
  type: 'function',
  function: {
    name: 'automation_generate',
    description:
      'Generate a workflow from a natural-language description. Returns a draft .0n workflow JSON. NON-MUTATING — no side effects.',
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Plain-English description of the automation to build.',
        },
        suggested_trigger: {
          type: 'string',
          description: 'Optional hint at the trigger type (e.g. "new lead", "form submit", "every Monday").',
        },
      },
      required: ['description'],
    },
  },
}

export const TOOL_AUTOMATION_TEST: GroqToolDef = {
  type: 'function',
  function: {
    name: 'automation_test',
    description:
      'Dry-run a workflow against sample input. Returns the step plan with resolved variables and any unresolved bindings. NON-MUTATING.',
    parameters: {
      type: 'object',
      properties: {
        workflow: {
          type: 'object',
          description: 'The full .0n workflow JSON to test.',
        },
        sample_trigger: {
          type: 'object',
          description: 'Sample data to bind into trigger variables for this dry-run.',
        },
      },
      required: ['workflow'],
    },
  },
}

export const TOOL_AUTOMATION_ACTIVATE: GroqToolDef = {
  type: 'function',
  function: {
    name: 'automation_activate',
    description:
      'Save a workflow, register its trigger (webhook or cron), and activate it. MUTATING — requires explicit user confirmation first.',
    parameters: {
      type: 'object',
      properties: {
        workflow: {
          type: 'object',
          description: 'The full .0n workflow JSON to save and activate.',
        },
        cron_schedule: {
          type: 'string',
          description: 'Optional cron expression if the trigger is scheduled (e.g. "0 9 * * 1-5").',
        },
      },
      required: ['workflow'],
    },
  },
}

export const TOOL_AUTOMATION_RUN: GroqToolDef = {
  type: 'function',
  function: {
    name: 'automation_run',
    description:
      'Execute a previously-saved workflow on demand. MUTATING — requires explicit user confirmation first.',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'UUID of the saved workflow to run.' },
        trigger_data: { type: 'object', description: 'Optional input data to seed the run.' },
      },
      required: ['workflow_id'],
    },
  },
}

export const TOOL_AUTOMATION_LIST: GroqToolDef = {
  type: 'function',
  function: {
    name: 'automation_list',
    description: 'List the user\'s saved workflows. NON-MUTATING.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive', 'all'] },
      },
    },
  },
}

export const TOOL_AUTOMATION_DISABLE: GroqToolDef = {
  type: 'function',
  function: {
    name: 'automation_disable',
    description: 'Disable a saved workflow (flip to inactive). MUTATING — requires explicit user confirmation first.',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string' },
      },
      required: ['workflow_id'],
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────
// Capability gating — emit only the tools the config has opted into
// ─────────────────────────────────────────────────────────────────────────

const MUTATING_TOOL_NAMES = new Set([
  'automation_activate',
  'automation_run',
  'automation_disable',
])

export function isMutating(toolName: string): boolean {
  return MUTATING_TOOL_NAMES.has(toolName)
}

export function getEnabledAutomationTools(config: JaxxConfig): GroqToolDef[] {
  if (!config.allowed_actions.includes('automation')) return []
  const tools: GroqToolDef[] = []
  if (config.automation_can_generate) tools.push(TOOL_AUTOMATION_GENERATE)
  if (config.automation_can_test) tools.push(TOOL_AUTOMATION_TEST, TOOL_AUTOMATION_LIST)
  if (config.automation_can_activate) tools.push(TOOL_AUTOMATION_ACTIVATE)
  if (config.automation_can_run) tools.push(TOOL_AUTOMATION_RUN, TOOL_AUTOMATION_DISABLE, TOOL_AUTOMATION_LIST)
  return tools
}

// ─────────────────────────────────────────────────────────────────────────
// Dispatcher — invoked by webhook handler after confirmation gate
// ─────────────────────────────────────────────────────────────────────────

export interface DispatchArgs {
  toolName: string
  arguments: Record<string, unknown>
  // Required for mutating calls
  authedFetcher: AuthedFetcher
  baseUrl: string // e.g. https://0ncore.com
}

export type AuthedFetcher = (path: string, init?: RequestInit) => Promise<Response>

export interface DispatchResult {
  ok: boolean
  status: number
  data: unknown
  toolName: string
}

export async function dispatchAutomationTool(args: DispatchArgs): Promise<DispatchResult> {
  const { toolName, arguments: a, authedFetcher, baseUrl } = args

  const post = async (path: string, body: unknown): Promise<DispatchResult> => {
    const res = await authedFetcher(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data, toolName }
  }

  const get = async (path: string): Promise<DispatchResult> => {
    const res = await authedFetcher(`${baseUrl}${path}`, { method: 'GET' })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data, toolName }
  }

  switch (toolName) {
    case 'automation_generate':
      return post('/api/automations/generate', { description: a.description, suggestedTrigger: a.suggested_trigger })
    case 'automation_test':
      return post('/api/automations/execute', { workflow: a.workflow, triggerData: a.sample_trigger ?? {}, dryRun: true })
    case 'automation_activate':
      return post('/api/automations/activate', { workflow: a.workflow, cronSchedule: a.cron_schedule })
    case 'automation_run':
      return post('/api/automations/execute', { workflowId: a.workflow_id, triggerData: a.trigger_data ?? {} })
    case 'automation_list':
      return get(`/api/automations/list${a.status ? `?status=${encodeURIComponent(String(a.status))}` : ''}`)
    case 'automation_disable':
      return post('/api/automations/list', { workflowId: a.workflow_id, status: 'inactive' })
    default:
      return { ok: false, status: 400, data: { error: `unknown tool: ${toolName}` }, toolName }
  }
}
