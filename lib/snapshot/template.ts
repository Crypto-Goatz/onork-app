/**
 * Template builder — everything in the sterile template that a script can make.
 *
 * WHAT THIS CAN AND CANNOT DO, verified by live call 2026-08-14:
 *
 *   POST /locations/{id}/tags          → 201   scriptable
 *   POST /locations/{id}/customFields  → 201   scriptable
 *   POST /locations/{id}/customValues  → 201   scriptable
 *   POST /conversation-ai/agents       → 422   scriptable (validation, not absent)
 *   POST /workflows/                   → 404   NOT scriptable, ever
 *
 * So the template is built by script except for the workflows, which have no
 * create endpoint and must be drawn by hand in the builder. That is a one-time
 * cost, not a per-integration one: the routers are generic and branch on a
 * versioned verb, so a new integration adds a verb server-side and ships the
 * same day without touching a workflow or cutting a snapshot.
 *
 * Cutting the snapshot itself is also manual — the Snapshots API is list, share
 * link, and push status. There is no create.
 *
 * THE TEMPLATE IS STERILE BY CONSTRUCTION. It writes only the managed contract:
 * `0ncore_*` values with neutral defaults, no branding, no endpoints, no ops
 * config. Anything a location legitimately varies is written at provisioning,
 * never baked into the snapshot — because a push can never correct a Custom
 * Value it shipped wrong.
 */
import { crmPostRaw, crmGet } from '@/lib/crm'
import { ROUTER_FIELD, VERBS } from '@/lib/crm/router'
import { MANAGED_VALUES } from './backfill'

/** Fields the routers and integrations read. Managed layer — clients must not edit. */
export const TEMPLATE_FIELDS = [
  { name: ROUTER_FIELD, dataType: 'TEXT', purpose: 'Verb the generic router branches on.' },
  { name: '0ncore_payload', dataType: 'LARGE_TEXT', purpose: 'JSON payload for the routed verb.' },
  { name: '0ncore_status', dataType: 'TEXT', purpose: 'Last result written back by a router.' },
] as const

/** Tags used as trigger surfaces and as state a human can see in the UI. */
export const TEMPLATE_TAGS = [
  '0ncore-managed',
  '0ncore-router',
  ...VERBS.map((v) => `0ncore:${v.verb}`),
] as const

export interface TemplateResult {
  locationId: string
  created: { fields: string[]; tags: string[]; values: string[] }
  skipped: { fields: string[]; tags: string[]; values: string[] }
  failed: { kind: string; name: string; error: string }[]
  manualStepsRemaining: string[]
}

/**
 * Build (or top up) the template location.
 *
 * Idempotent: reads what exists first and only creates what is missing, so it is
 * safe to re-run after adding a verb. Never deletes — a template that prunes on
 * every run would fight anything added by hand in the builder, which is exactly
 * where the workflows live.
 */
export async function buildTemplate(locationId: string): Promise<TemplateResult> {
  const result: TemplateResult = {
    locationId,
    created: { fields: [], tags: [], values: [] },
    skipped: { fields: [], tags: [], values: [] },
    failed: [],
    manualStepsRemaining: [],
  }

  // ── Custom fields ────────────────────────────────────────────────────────
  const fieldsRes = await crmGet(`/locations/${encodeURIComponent(locationId)}/customFields`, locationId)
  const existingFields = new Set<string>()
  if (fieldsRes.ok) {
    const j = (await fieldsRes.json().catch(() => ({}))) as { customFields?: { name?: string }[] }
    for (const f of j.customFields ?? []) existingFields.add(String(f.name ?? ''))
  }

  for (const f of TEMPLATE_FIELDS) {
    if (existingFields.has(f.name)) { result.skipped.fields.push(f.name); continue }
    const res = await crmPostRaw(`/locations/${encodeURIComponent(locationId)}/customFields`, locationId, {
      name: f.name, dataType: f.dataType,
    })
    if (res.ok) result.created.fields.push(f.name)
    else result.failed.push({ kind: 'field', name: f.name, error: `HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 100)}` })
  }

  // ── Tags ─────────────────────────────────────────────────────────────────
  const tagsRes = await crmGet(`/locations/${encodeURIComponent(locationId)}/tags`, locationId)
  const existingTags = new Set<string>()
  if (tagsRes.ok) {
    const j = (await tagsRes.json().catch(() => ({}))) as { tags?: { name?: string }[] }
    for (const t of j.tags ?? []) existingTags.add(String(t.name ?? '').toLowerCase())
  }

  for (const name of TEMPLATE_TAGS) {
    if (existingTags.has(name.toLowerCase())) { result.skipped.tags.push(name); continue }
    const res = await crmPostRaw(`/locations/${encodeURIComponent(locationId)}/tags`, locationId, { name })
    if (res.ok) result.created.tags.push(name)
    else result.failed.push({ kind: 'tag', name, error: `HTTP ${res.status}` })
  }

  // ── Managed Custom Values ────────────────────────────────────────────────
  const { backfillLocation } = await import('./backfill')
  const bf = await backfillLocation(locationId)
  if (bf.ok) {
    result.created.values = bf.result.created
    result.skipped.values = bf.result.skipped
    result.failed.push(...bf.result.failed.map((f) => ({ kind: 'value', name: f.name, error: f.error })))
  } else {
    result.failed.push({ kind: 'value', name: '(all)', error: bf.error })
  }

  // ── What a script cannot do ──────────────────────────────────────────────
  result.manualStepsRemaining = [
    `Build the generic router workflow(s) by hand — POST /workflows/ returns 404, there is no create endpoint. Trigger on "${ROUTER_FIELD} changed", branch on the verb, clear the field at the end.`,
    `Verbs to branch on (${VERBS.length}): ${VERBS.map((v) => v.verb).join(', ')}`,
    'Set every Conversation AI agent to mode "off" before snapshotting — agents ship live otherwise.',
    'Cut the snapshot in the UI — the Snapshots API has no create endpoint.',
    'Freeze the previous master as 0n-master-vN-frozen before refreshing.',
  ]

  return result
}
