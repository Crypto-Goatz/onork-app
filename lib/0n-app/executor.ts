/**
 * .0n App Executor
 *
 * Runs a parsed .0n app's workflow. Resolves {{template.path}} variables,
 * executes steps in order with depends_on awareness, and supports 9 step types.
 */

import { createClient } from '@supabase/supabase-js'
import { OnAppManifest, OnAppStep } from './parser'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'

export interface ExecutionContext {
  userId: string
  installationId: string
  appSlug: string
  trigger: Record<string, unknown>
  outputs: Record<string, unknown>
  variables: Record<string, unknown>
  config: Record<string, unknown>
}

export interface StepResult {
  step_id: string
  name: string
  type: string
  status: 'success' | 'failed' | 'skipped'
  output?: unknown
  error?: string
  duration_ms: number
}

export interface ExecutionResult {
  ok: boolean
  installation_id: string
  app_slug: string
  steps: StepResult[]
  total_duration_ms: number
  error?: string
}

export function resolveTemplate(value: unknown, context: ExecutionContext): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
      const parts = path.trim().split('.')
      let current: unknown = context

      for (const part of parts) {
        if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[part]
        } else {
          return `{{${path}}}`
        }
      }

      if (current === null || current === undefined) return ''
      if (typeof current === 'object') return JSON.stringify(current)
      return String(current)
    })
  }

  if (Array.isArray(value)) {
    return value.map(v => resolveTemplate(v, context))
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveTemplate(v, context)
    }
    return out
  }

  return value
}

function evaluateCondition(condition: string, context: ExecutionContext): boolean {
  if (!condition) return true
  const resolved = resolveTemplate(condition, context) as string

  // Supported: ==, !=, >, <, >=, <=, contains, startsWith, endsWith, truthy
  const opMatch = resolved.match(/^(.+?)\s*(==|!=|>=|<=|>|<|contains|startsWith|endsWith)\s*(.+)$/)
  if (opMatch) {
    const [, leftRaw, op, rightRaw] = opMatch
    const left = leftRaw.trim().replace(/^["']|["']$/g, '')
    const right = rightRaw.trim().replace(/^["']|["']$/g, '')
    const leftNum = Number(left)
    const rightNum = Number(right)
    switch (op) {
      case '==': return left === right
      case '!=': return left !== right
      case '>': return leftNum > rightNum
      case '<': return leftNum < rightNum
      case '>=': return leftNum >= rightNum
      case '<=': return leftNum <= rightNum
      case 'contains': return left.includes(right)
      case 'startsWith': return left.startsWith(right)
      case 'endsWith': return left.endsWith(right)
    }
  }

  return Boolean(resolved && resolved !== 'false' && resolved !== '0')
}

async function executeAiStep(step: OnAppStep, context: ExecutionContext): Promise<unknown> {
  const inputs = resolveTemplate(step.inputs, context) as Record<string, unknown>
  const prompt = String(inputs.prompt || '')
  const systemPrompt = String(inputs.system || 'You are a helpful AI assistant.')
  const model = String(inputs.model || 'llama-3.3-70b-versatile')

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: typeof inputs.temperature === 'number' ? inputs.temperature : 0.7,
      max_tokens: typeof inputs.max_tokens === 'number' ? inputs.max_tokens : 1024,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq error ${res.status}: ${text}`)
  }

  const json = await res.json()
  return {
    text: json.choices?.[0]?.message?.content || '',
    usage: json.usage || null,
  }
}

async function executeCrmStep(step: OnAppStep, context: ExecutionContext): Promise<unknown> {
  const inputs = resolveTemplate(step.inputs, context) as Record<string, unknown>
  const action = String(inputs.action || '')
  const proxyUrl = `${SITE_URL}/api/crm/proxy`

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': context.userId,
    },
    body: JSON.stringify({ action, ...inputs }),
  })

  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = text }

  if (!res.ok) {
    throw new Error(`CRM proxy error ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  }
  return data
}

async function executeWebhookStep(step: OnAppStep, context: ExecutionContext): Promise<unknown> {
  const inputs = resolveTemplate(step.inputs, context) as Record<string, unknown>
  const url = String(inputs.url || '')
  const method = String(inputs.method || 'POST').toUpperCase()
  const headers = (inputs.headers as Record<string, string>) || { 'Content-Type': 'application/json' }
  const body = inputs.body !== undefined ? (typeof inputs.body === 'string' ? inputs.body : JSON.stringify(inputs.body)) : undefined

  const res = await fetch(url, {
    method,
    headers,
    body: method === 'GET' ? undefined : body,
  })

  const text = await res.text()
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { parsed = text }
  return { status: res.status, ok: res.ok, body: parsed }
}

async function executeEmailStep(step: OnAppStep, context: ExecutionContext): Promise<unknown> {
  const inputs = resolveTemplate(step.inputs, context) as Record<string, unknown>
  const to = String(inputs.to || '')
  const subject = String(inputs.subject || '')
  const body = String(inputs.body || '')

  const res = await fetch(`${SITE_URL}/api/crm/conversations/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': context.userId },
    body: JSON.stringify({ to, subject, body }),
  })

  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = text }
  if (!res.ok) throw new Error(`Email send error ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  return data
}

async function executeSlackStep(step: OnAppStep, context: ExecutionContext): Promise<unknown> {
  const inputs = resolveTemplate(step.inputs, context) as Record<string, unknown>
  const channel = String(inputs.channel || '')
  const text = String(inputs.text || '')

  const token = process.env.SLACK_BOT_TOKEN
  if (!token) throw new Error('SLACK_BOT_TOKEN not configured')

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel, text }),
  })

  const json = await res.json()
  if (!json.ok) throw new Error(`Slack error: ${json.error}`)
  return json
}

async function executeWordpressStep(step: OnAppStep, context: ExecutionContext): Promise<unknown> {
  const inputs = resolveTemplate(step.inputs, context) as Record<string, unknown>
  const action = String(inputs.action || 'create_post')

  const res = await fetch(`${SITE_URL}/api/wordpress/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': context.userId },
    body: JSON.stringify(inputs),
  })

  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = text }
  if (!res.ok) throw new Error(`WordPress error ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  return data
}

async function executeDelayStep(step: OnAppStep, context: ExecutionContext): Promise<unknown> {
  const inputs = resolveTemplate(step.inputs, context) as Record<string, unknown>
  const seconds = Number(inputs.seconds || 0)
  const capped = Math.min(seconds, 25)
  if (capped > 0) await new Promise(r => setTimeout(r, capped * 1000))
  return { delayed_seconds: capped, requested_seconds: seconds }
}

async function executeLogStep(step: OnAppStep, context: ExecutionContext): Promise<unknown> {
  const inputs = resolveTemplate(step.inputs, context) as Record<string, unknown>
  const message = String(inputs.message || '')
  const level = String(inputs.level || 'info')
  console.log(`[0n-app:${context.appSlug}] [${level}] ${message}`)
  return { logged: message, level }
}

export async function executeApp(
  app: OnAppManifest,
  context: ExecutionContext,
): Promise<ExecutionResult> {
  const supabase = getSupabase()
  const start = Date.now()
  const results: StepResult[] = []
  const completedIds = new Set<string>()

  context.variables = { ...(app.variables || {}), ...context.variables }

  for (const step of app.steps) {
    const stepStart = Date.now()

    if (step.depends_on && step.depends_on.length > 0) {
      const missing = step.depends_on.filter(d => !completedIds.has(d))
      if (missing.length > 0) {
        results.push({
          step_id: step.id, name: step.name, type: step.type,
          status: 'skipped',
          error: `Missing deps: ${missing.join(', ')}`,
          duration_ms: Date.now() - stepStart,
        })
        continue
      }
    }

    if (step.condition && !evaluateCondition(step.condition, context)) {
      results.push({
        step_id: step.id, name: step.name, type: step.type,
        status: 'skipped',
        duration_ms: Date.now() - stepStart,
      })
      continue
    }

    try {
      let output: unknown
      switch (step.type) {
        case 'ai_execute': output = await executeAiStep(step, context); break
        case 'crm_action': output = await executeCrmStep(step, context); break
        case 'webhook': output = await executeWebhookStep(step, context); break
        case 'email': output = await executeEmailStep(step, context); break
        case 'slack': output = await executeSlackStep(step, context); break
        case 'wordpress': output = await executeWordpressStep(step, context); break
        case 'delay': output = await executeDelayStep(step, context); break
        case 'log': output = await executeLogStep(step, context); break
        case 'condition':
          output = { evaluated: evaluateCondition(String(step.inputs.expression || ''), context) }
          break
        default:
          throw new Error(`Unknown step type: ${(step as { type: string }).type}`)
      }

      context.outputs[step.id] = output
      completedIds.add(step.id)
      results.push({
        step_id: step.id, name: step.name, type: step.type,
        status: 'success',
        output,
        duration_ms: Date.now() - stepStart,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({
        step_id: step.id, name: step.name, type: step.type,
        status: 'failed',
        error: message,
        duration_ms: Date.now() - stepStart,
      })
      if (step.on_fail !== 'continue') break
    }
  }

  const totalDuration = Date.now() - start
  const ok = results.every(r => r.status !== 'failed')

  await supabase
    .from('user_installed_apps')
    .update({
      total_executions: undefined,
      last_executed_at: new Date().toISOString(),
    })
    .eq('id', context.installationId)
    .then(() => {}, () => {})

  await supabase.rpc('increment_app_executions', { installation_id_param: context.installationId }).then(() => {}, () => {})

  return {
    ok,
    installation_id: context.installationId,
    app_slug: context.appSlug,
    steps: results,
    total_duration_ms: totalDuration,
  }
}
