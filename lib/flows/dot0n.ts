/**
 * A FLOW AS A .0n FILE — save it here, run it in any sub-account.
 *
 * Mike, 2026-08-21: *"this is where we use something called an 0n file for them
 * to be able to save the entire workflow and it be imported into another
 * sub-account within the ecosystem."*
 *
 * THE ONE THING THAT MAKES A FLOW PORTABLE. A canvas flow is full of ids that
 * mean nothing anywhere else — a pipeline id, a calendar id, a user id, a
 * location id. Copy the JSON to another account and every one of those points
 * at something that does not exist there, so the flow imports "successfully"
 * and then misfires on the first run. That is worse than a failed import,
 * because nobody looks.
 *
 * So export does two things:
 *   1. STRIPS every account-bound id out of node config and records it as a
 *      REQUIREMENT — "this flow needs a pipeline" — rather than a dead pointer.
 *   2. Keeps `{{custom_values.*}}` references INTACT, because those are the
 *      portable half. A flow that says {{custom_values.booking_link}} works in
 *      any account that has the key, which is exactly why the snapshot seeds
 *      all 22 keys empty.
 *
 * Import is therefore honest by construction: it can tell you what the flow
 * needs before it writes anything, and refuse rather than half-land.
 */

/** An id shape that only means something inside one account. */
const ACCOUNT_BOUND = [
  'locationId', 'location_id',
  'pipelineId', 'pipeline_id', 'stageId', 'stage_id',
  'calendarId', 'calendar_id',
  'userId', 'user_id', 'assignedTo', 'assigned_to',
  'contactId', 'contact_id',
  'workflowId', 'workflow_id',
  'tagId', 'tag_id',
  'customFieldId', 'custom_field_id',
]

export interface FlowRequirement {
  /** The field that was stripped, e.g. "pipelineId". */
  field: string
  /** Which node needed it, so an importer can point at the right step. */
  nodeId: string
  nodeLabel: string
  /** What it was in the source account — for a human mapping it, never re-used. */
  wasValue: string
}

export interface Dot0nFlow {
  schemaVersion: '0nflow-v1'
  name: string
  description: string
  exportedAt: string
  /** Purely informational. An importer must never trust this to grant anything. */
  exportedFrom: { locationId: string | null }
  nodes: unknown[]
  edges: unknown[]
  /** Every account-bound id that was stripped, so import can ask for them. */
  requires: FlowRequirement[]
  /** Custom value keys this flow reads. The account must have them, or steps render blank. */
  usesCustomValues: string[]
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Every {{custom_values.x}} referenced anywhere in the flow. */
function collectCustomValues(value: unknown, found: Set<string>): void {
  if (typeof value === 'string') {
    for (const m of value.matchAll(/\{\{\s*custom_values\.([a-z0-9_]+)\s*\}\}/gi)) {
      found.add(m[1])
    }
    return
  }
  if (Array.isArray(value)) { for (const v of value) collectCustomValues(v, found); return }
  if (isObj(value)) { for (const v of Object.values(value)) collectCustomValues(v, found) }
}

/**
 * Canvas flow → portable .0n.
 *
 * The source ids are recorded in `requires` but NEVER written back into the
 * nodes. A stripped field that still carries its old value is the same bug as
 * not stripping it — the next reader copies it forward.
 */
export function exportFlow(
  flow: { name?: string; description?: string; blocks?: unknown; edges?: unknown },
  fromLocationId: string | null,
): Dot0nFlow {
  const nodes = Array.isArray(flow.blocks) ? flow.blocks : []
  const edges = Array.isArray(flow.edges) ? flow.edges : []
  const requires: FlowRequirement[] = []
  const customValues = new Set<string>()

  const cleaned = nodes.map((n) => {
    if (!isObj(n)) return n
    const nodeId = String(n.id ?? '')
    const data = isObj(n.data) ? { ...n.data } : {}
    const label = String(data.label ?? data.title ?? n.type ?? 'step')

    collectCustomValues(data, customValues)

    const config = isObj(data.config) ? { ...data.config } : null
    if (config) {
      for (const key of ACCOUNT_BOUND) {
        const v = config[key]
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          requires.push({ field: key, nodeId, nodeLabel: label, wasValue: String(v) })
          // Blanked, not deleted: the shape survives so the settings panel can
          // render the field as "needs a value" rather than losing it entirely.
          config[key] = ''
        }
      }
      data.config = config
    }
    return { ...n, data }
  })

  return {
    schemaVersion: '0nflow-v1',
    name: String(flow.name ?? 'Untitled flow'),
    description: String(flow.description ?? ''),
    exportedAt: new Date().toISOString(),
    exportedFrom: { locationId: fromLocationId },
    nodes: cleaned,
    edges,
    requires,
    usesCustomValues: [...customValues].sort(),
  }
}

export interface ImportCheck {
  ok: boolean
  /** Fields the importer must supply before this can run. */
  needs: FlowRequirement[]
  /** Custom value keys missing from the target account — steps would render blank. */
  missingCustomValues: string[]
  /** Plain-English refusals. Empty when the file is safe to import. */
  refusals: string[]
}

/**
 * Can this flow land in this account, and what does it need first?
 *
 * DRY-RUN BY DEFAULT. It reports before it writes, because a flow that imports
 * and then misfires against the wrong pipeline is worse than one that refuses:
 * a refusal gets fixed, a misfire gets discovered by a customer.
 */
export function checkImport(
  file: unknown,
  targetCustomValueKeys: string[],
): ImportCheck {
  const refusals: string[] = []

  if (!isObj(file) || file.schemaVersion !== '0nflow-v1') {
    return { ok: false, needs: [], missingCustomValues: [], refusals: ['Not a 0nflow-v1 file.'] }
  }
  if (!Array.isArray(file.nodes) || !file.nodes.length) {
    refusals.push('The flow has no steps.')
  }

  const needs = Array.isArray(file.requires) ? (file.requires as FlowRequirement[]) : []
  const uses = Array.isArray(file.usesCustomValues) ? (file.usesCustomValues as string[]) : []
  const have = new Set(targetCustomValueKeys)
  const missingCustomValues = uses.filter((k) => !have.has(k))

  // A missing KEY is a refusal, not a warning: the step renders the raw
  // {{custom_values.x}} token into whatever it sends. A missing VALUE is fine —
  // that renders blank, which is recoverable and visible.
  if (missingCustomValues.length) {
    refusals.push(
      `This account is missing ${missingCustomValues.length} custom value key(s) the flow reads: ` +
      `${missingCustomValues.join(', ')}. Deploy the snapshot first, or the steps will send the raw token.`,
    )
  }

  return { ok: refusals.length === 0, needs, missingCustomValues, refusals }
}
