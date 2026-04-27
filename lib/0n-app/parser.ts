/**
 * .0n App Format Parser
 *
 * A .0n app is a JSON file that describes a self-contained automation:
 * trigger + steps + metadata. The marketplace ships them as installable units.
 */

export interface OnAppManifest {
  format: '0n-app'
  version: string
  id: string
  name: string
  slug: string
  description: string
  category: string
  tags?: string[]
  author?: string
  vendor_id?: string
  icon?: string
  screenshots?: string[]
  required_services?: string[]
  required_plan?: string
  price_cents?: number
  trigger: OnAppTrigger
  steps: OnAppStep[]
  variables?: Record<string, string>
  config_schema?: ConfigField[]
}

export interface OnAppTrigger {
  type: 'scheduled' | 'webhook' | 'crm_event' | 'manual' | 'on_install'
  event?: string
  cron?: string
  config?: Record<string, unknown>
}

export type StepType =
  | 'ai_execute'
  | 'crm_action'
  | 'condition'
  | 'webhook'
  | 'email'
  | 'slack'
  | 'wordpress'
  | 'delay'
  | 'log'

export interface OnAppStep {
  id: string
  name: string
  type: StepType
  inputs: Record<string, unknown>
  condition?: string
  on_fail?: 'stop' | 'continue' | 'retry'
  retry_count?: number
  depends_on?: string[]
}

export interface ConfigField {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'secret'
  required?: boolean
  default?: string | number | boolean
  options?: { label: string; value: string }[]
  description?: string
}

export interface ParseResult {
  ok: boolean
  app?: OnAppManifest
  errors: string[]
}

const REQUIRED_FIELDS: (keyof OnAppManifest)[] = ['name', 'slug', 'description', 'category', 'trigger', 'steps']
const VALID_STEP_TYPES = new Set<StepType>([
  'ai_execute', 'crm_action', 'condition', 'webhook', 'email', 'slack', 'wordpress', 'delay', 'log',
])
const VALID_TRIGGER_TYPES = new Set(['scheduled', 'webhook', 'crm_event', 'manual', 'on_install'])

export function parseOnApp(content: string | Record<string, unknown>): ParseResult {
  const errors: string[] = []
  let raw: Record<string, unknown>

  if (typeof content === 'string') {
    try {
      raw = JSON.parse(content)
    } catch (err) {
      return { ok: false, errors: [`Invalid JSON: ${(err as Error).message}`] }
    }
  } else {
    raw = content
  }

  if (raw.format !== '0n-app') {
    errors.push('Missing or invalid format field — must be "0n-app"')
  }

  for (const field of REQUIRED_FIELDS) {
    if (!raw[field]) errors.push(`Missing required field: ${field}`)
  }

  if (typeof raw.slug === 'string' && !/^[a-z0-9-]+$/.test(raw.slug)) {
    errors.push('Slug must be lowercase letters, numbers, and hyphens only')
  }

  const trigger = raw.trigger as OnAppTrigger | undefined
  if (trigger) {
    if (!VALID_TRIGGER_TYPES.has(trigger.type)) {
      errors.push(`Invalid trigger.type: ${trigger.type}`)
    }
    if (trigger.type === 'scheduled' && !trigger.cron) {
      errors.push('Scheduled trigger requires a cron expression')
    }
  }

  const steps = raw.steps as OnAppStep[] | undefined
  if (Array.isArray(steps)) {
    if (steps.length === 0) errors.push('Steps array is empty')
    const ids = new Set<string>()
    for (const step of steps) {
      if (!step.id) errors.push('Step missing id')
      else if (ids.has(step.id)) errors.push(`Duplicate step id: ${step.id}`)
      else ids.add(step.id)
      if (!VALID_STEP_TYPES.has(step.type)) errors.push(`Invalid step type: ${step.type}`)
      if (!step.inputs || typeof step.inputs !== 'object') errors.push(`Step ${step.id}: inputs required`)
    }
  } else if (raw.steps !== undefined) {
    errors.push('Steps must be an array')
  }

  if (errors.length > 0) return { ok: false, errors }

  return { ok: true, app: raw as unknown as OnAppManifest, errors: [] }
}

export interface RequirementsCheckResult {
  ok: boolean
  missing_services: string[]
  plan_ok: boolean
  required_plan: string
  user_plan: string
}

const PLAN_TIERS: Record<string, number> = {
  starter: 1,
  free: 1,
  supporter: 2,
  builder: 3,
  enterprise: 4,
  penthouse: 5,
}

export function validateRequirements(
  app: OnAppManifest,
  userPlan: string,
  userServices: string[],
): RequirementsCheckResult {
  const requiredServices = app.required_services || []
  const missing = requiredServices.filter(s => !userServices.includes(s))

  const requiredPlan = app.required_plan || 'starter'
  const requiredTier = PLAN_TIERS[requiredPlan.toLowerCase()] || 1
  const userTier = PLAN_TIERS[(userPlan || 'starter').toLowerCase()] || 1
  const planOk = userTier >= requiredTier

  return {
    ok: missing.length === 0 && planOk,
    missing_services: missing,
    plan_ok: planOk,
    required_plan: requiredPlan,
    user_plan: userPlan || 'starter',
  }
}

export function getDefaultConfig(app: OnAppManifest): Record<string, unknown> {
  const config: Record<string, unknown> = {}
  for (const field of app.config_schema || []) {
    if (field.default !== undefined) config[field.key] = field.default
  }
  return config
}
