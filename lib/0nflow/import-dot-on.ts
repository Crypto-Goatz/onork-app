/**
 * .0n file → runnable workflow resolver.
 *
 * Pipeline:
 *   1. Validate schema (`schema: '0n-workflow/v1'`).
 *   2. Normalize step IDs + variable references (cap_2 → meaningful slug,
 *      step_001/002 → matching step id).
 *   3. Run action mapper to convert generic ai_generate_content stubs
 *      into real action types based on name + config shape.
 *   4. Detect what integrations are connected; swap unsupported actions
 *      for CRM-native equivalents.
 *   5. Resolve trigger config — CRM tag name → tag id (find or create).
 *   6. Resolve every CRM custom field referenced in update steps —
 *      find or queue for creation.
 *   7. Compile final list of clarifying questions for anything
 *      truly unresolvable; otherwise return a saveable workflow.
 */

import {
  mapStep,
  type RawStep,
  type NormalizedStep,
} from '@/lib/automations/action-mapper'
import {
  swapForAvailable,
  detectAvailable,
  type AvailableIntegrations,
} from '@/lib/automations/integration-aware-swap'
import {
  findOrCreateTag,
  findOrCreateCustomField,
  findCustomField,
} from '@/lib/automations/crm-lookup'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface DotOnFile {
  schema?: string
  name?: string
  version?: string
  description?: string
  triggers?: { type: string; config?: Record<string, unknown> }[]
  trigger?: { type: string; config?: Record<string, unknown> }
  steps?: RawStep[]
  metadata?: Record<string, unknown>
}

export interface ResolvedWorkflow {
  schema: '0n-workflow/v1'
  name: string
  description?: string
  trigger: { type: string; config: Record<string, unknown> }
  steps: NormalizedStep[]
  /** Resources we created during resolve (tags, fields). For audit. */
  created: { type: 'tag' | 'custom_field'; name: string; id: string }[]
  /** Notes from integration swaps (e.g. "GSheets → CRM tag"). */
  swap_notes: string[]
  /** Detected integrations available at resolve time. */
  available: AvailableIntegrations
}

export interface ImportQuestion {
  /** Stable id so the answers payload can map back. */
  key: string
  /** Human prompt. */
  question: string
  /** Where this came from in the workflow. */
  step_id?: string
  /** Type of input expected. */
  type: 'select' | 'text' | 'boolean'
  /** For select: list of options to show. */
  options?: { value: string; label: string }[]
  /** Default the UI can pre-pick. */
  suggested?: string
}

export interface ImportResult {
  ok: boolean
  workflow?: ResolvedWorkflow
  needs_input?: boolean
  questions?: ImportQuestion[]
  errors?: string[]
}

// ─────────────────────────────────────────────────────────────
// Step 1 — schema validation
// ─────────────────────────────────────────────────────────────

function validateSchema(input: unknown): { ok: true; file: DotOnFile } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Not a JSON object.' }
  }
  const file = input as DotOnFile
  if (file.schema && file.schema !== '0n-workflow/v1') {
    return { ok: false, error: `Unsupported schema: ${file.schema}` }
  }
  if (!Array.isArray(file.steps) || file.steps.length === 0) {
    return { ok: false, error: 'Workflow has no steps.' }
  }
  return { ok: true, file }
}

// ─────────────────────────────────────────────────────────────
// Step 2 — normalize step IDs + variable references
// ─────────────────────────────────────────────────────────────

/**
 * Build a map from old step ids → new (slug-based) ids, then rewrite
 * every variable reference in step configs.
 *
 * The visual builder uses two parallel naming schemes:
 *   - step ids are `cap_1`, `cap_2`, …
 *   - but variable refs use `step_001`, `step_002`, …
 *
 * Both refer to the same things. We unify on slugs derived from each step's
 * display name, then rewrite refs accordingly.
 */
function slugForStep(name: string, fallback: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30)
  return s || fallback
}

function buildIdMap(steps: RawStep[]): Map<string, string> {
  const map = new Map<string, string>()
  const used = new Set<string>()
  steps.forEach((s, i) => {
    let slug = slugForStep(s.input?.name || '', `step_${i + 1}`)
    let k = slug
    let n = 2
    while (used.has(k)) k = `${slug}_${n++}`
    used.add(k)

    map.set(s.id, k) // cap_2 → "gather_contact_data"
    // Visual builder also writes step_001 / step_002 with 0-padded sequence
    map.set(`step_${String(i + 1).padStart(3, '0')}`, k)
    // Some files use `cap_` zero-indexed offsets
    map.set(`cap_${i + 1}`, k)
  })
  return map
}

function rewriteRefs(value: unknown, idMap: Map<string, string>): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\.([^}]+)\}\}/g, (_, ref, path) => {
      const newRef = idMap.get(ref) || ref
      return `{{${newRef}.${path}}}`
    })
  }
  if (Array.isArray(value)) return value.map((v) => rewriteRefs(v, idMap))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = rewriteRefs(v, idMap)
    }
    return out
  }
  return value
}

// ─────────────────────────────────────────────────────────────
// Step 3-7 — main resolve
// ─────────────────────────────────────────────────────────────

export async function resolveDotOn(opts: {
  raw: unknown
  supabase: SupabaseClient
  userId: string
  locationId: string
  /** Optional: answers from a previous round, keyed by question.key. */
  answers?: Record<string, string>
}): Promise<ImportResult> {
  const { raw, supabase, userId, locationId, answers = {} } = opts

  // 1. Validate
  const v = validateSchema(raw)
  if (!v.ok) return { ok: false, errors: [v.error] }
  const file = v.file
  const triggerSrc = file.trigger || file.triggers?.[0]
  if (!triggerSrc) return { ok: false, errors: ['No trigger defined.'] }

  // 2. Normalize ids + rewrite refs
  const steps = file.steps!
  const idMap = buildIdMap(steps)
  const renamed: RawStep[] = steps.map((s) => ({
    ...s,
    id: idMap.get(s.id) || s.id,
    depends_on: (s.depends_on || []).map((d) => idMap.get(d) || d).filter((d) => d), // drop unmappable
    input: {
      ...s.input,
      config: rewriteRefs(s.input?.config || {}, idMap) as Record<string, unknown>,
    },
  }))

  // 3. Map generic actions → real actions
  const mapped: NormalizedStep[] = renamed.map(mapStep)

  // 4. Integration-aware swap
  const available = await detectAvailable(supabase, userId, locationId)
  const swapped: NormalizedStep[] = []
  const swapNotes: string[] = []
  for (const step of mapped) {
    const r = swapForAvailable(step, available)
    swapped.push(r.step)
    if (r.swapped && r.swap_note) swapNotes.push(r.swap_note)
  }

  // 5. Resolve trigger config (tag id from name, etc.)
  const created: ResolvedWorkflow['created'] = []
  const questions: ImportQuestion[] = []
  const triggerConfig: Record<string, unknown> = { ...(triggerSrc.config || {}) }

  // Surface trigger-resolution failures instead of returning silently
  // with a half-resolved trigger config — Mike noticed missing tag_id.
  const triggerNotes: string[] = []

  if (triggerSrc.type === 'trigger_tag_added') {
    const tagName = (triggerConfig.tag_name as string) || (triggerConfig.tag as string)
    if (!triggerConfig.tag_id && tagName) {
      // Find-or-create policy: tag-by-name is decidable, never ask.
      // Same as custom fields below — the agentic-first principle is "resolve
      // before asking; only ask when genuinely undecidable."
      const made = await findOrCreateTag(locationId, tagName)
      if (made) {
        triggerConfig.tag_id = made.tag.id
        if (made.created) {
          created.push({ type: 'tag', name: tagName, id: made.tag.id })
        }
      } else {
        triggerNotes.push(
          `Could not resolve trigger tag "${tagName}" — CRM tag list/create call failed. The workflow will save, but you'll need to set tag_id manually before activating.`,
        )
      }
    }
  }

  // 6. Resolve custom fields referenced in any crm_update_contact step
  for (const step of swapped) {
    if (step.action !== 'crm_update_contact') continue
    const fields = (step.config.custom_fields || {}) as Record<string, unknown>
    if (!fields || typeof fields !== 'object') continue
    const resolved: Record<string, { id?: string; name: string; value: unknown }> = {}
    for (const [name, value] of Object.entries(fields)) {
      const existing = await findCustomField(locationId, name)
      if (existing) {
        resolved[name] = { id: existing.id, name, value }
      } else if (answers[`field_${name}`] === 'create' || !answers[`field_${name}`]) {
        // Default policy: auto-create on first run.
        const made = await findOrCreateCustomField(locationId, name, 'TEXT')
        if (made) {
          resolved[name] = { id: made.field.id, name, value }
          if (made.created) {
            created.push({ type: 'custom_field', name, id: made.field.id })
          }
        }
      }
    }
    step.config.custom_fields_resolved = resolved
  }

  // 7. If anything remains unresolvable, ask
  if (questions.length > 0) {
    return { ok: false, needs_input: true, questions }
  }

  const workflow: ResolvedWorkflow = {
    schema: '0n-workflow/v1',
    name: file.name || 'Untitled Workflow',
    description: file.description,
    trigger: { type: triggerSrc.type, config: triggerConfig },
    steps: swapped,
    created,
    swap_notes: [...triggerNotes, ...swapNotes],
    available,
  }

  return { ok: true, workflow }
}
