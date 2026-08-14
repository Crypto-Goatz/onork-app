/**
 * Custom Value backfill — the release step a snapshot push cannot perform.
 *
 * WHY THIS HAS TO EXIST. A snapshot push never edits or deletes Custom Values.
 * That guarantee is the reason per-location config is safe across releases — and
 * it is also the hole: a release that introduces a NEW `0ncore_*` value cannot
 * rely on the push to create it. Whether a push *adds* new values is
 * undocumented, so this assumes it does not. If that assumption is wrong this
 * script is a no-op; if it is right, its absence means every workflow in the new
 * release reads a value that does not exist and fails quietly, per location.
 *
 * ASSUMING THE WORSE CASE IS FREE HERE. Being wrong in this direction costs one
 * redundant API call per value. Being wrong in the other direction costs a
 * silent, per-tenant outage that surfaces as "the automation just stopped
 * working" days later.
 *
 * CREATE-IF-MISSING, NEVER OVERWRITE. An existing value is a decision somebody
 * made for that location. The whole point of holding config in Custom Values is
 * that it survives releases; a backfill that "corrects" them would destroy the
 * exact property being relied on. Repair is a separate, deliberate act.
 */
import { crmGet, crmPostRaw } from '@/lib/crm'

/** Marks an asset as managed. Anything carrying it may be overwritten by a push. */
export const MANAGED_PREFIX = '0ncore_'

export interface ManagedValue {
  name: string
  /** Used only when creating. Never applied to a value that already exists. */
  defaultValue: string
  /** Recorded for the release manifest — what shipped when. */
  since: string
  notes?: string
}

/**
 * The managed Custom Value contract.
 *
 * ADD HERE WHEN A RELEASE INTRODUCES ONE, and never rename an entry — a rename
 * is a delete plus a create to every workflow that reads it, and the delete half
 * is silent.
 */
export const MANAGED_VALUES: ManagedValue[] = [
  { name: '0ncore_version', defaultValue: '1.0.0', since: '1.0.0',
    notes: 'Which managed-layer release this location is on. Stamped at provisioning; a push cannot update it.' },
  { name: '0ncore_api_endpoint', defaultValue: 'https://app.0ncore.com/api', since: '1.0.0' },
  { name: '0ncore_location_id', defaultValue: '', since: '1.0.0',
    notes: 'Filled per location at provisioning. Workflows must never hardcode an id.' },
  { name: '0ncore_enabled', defaultValue: 'true', since: '1.0.0',
    notes: 'Per-location kill switch for the managed layer.' },
]

export interface BackfillResult {
  locationId: string
  existing: number
  created: string[]
  skipped: string[]
  failed: { name: string; error: string }[]
}

/**
 * Bring one location up to the current managed contract.
 *
 * Idempotent by construction: it reads first, and only creates what is absent.
 * Safe to run on every release, and safe to run twice.
 */
export async function backfillLocation(
  locationId: string,
  overrides: Record<string, string> = {},
): Promise<{ ok: true; result: BackfillResult } | { ok: false; error: string }> {
  const res = await crmGet(`/locations/${encodeURIComponent(locationId)}/customValues`, locationId)
  if (!res.ok) {
    return { ok: false, error: `Could not read custom values (HTTP ${res.status}).` }
  }

  const json = (await res.json().catch(() => ({}))) as { customValues?: { name?: string }[] }
  const present = new Set((json.customValues ?? []).map((c) => String(c.name ?? '')))

  const result: BackfillResult = {
    locationId, existing: present.size, created: [], skipped: [], failed: [],
  }

  for (const v of MANAGED_VALUES) {
    if (present.has(v.name)) { result.skipped.push(v.name); continue }

    // An override beats the default — that is how per-location identity
    // (0ncore_location_id) gets its value without a second pass.
    const value = overrides[v.name] ?? v.defaultValue

    // crmPostRaw: the basic helper injects locationId into the body, which this
    // endpoint rejects with a 422. Verified against a live location.
    const created = await crmPostRaw(
      `/locations/${encodeURIComponent(locationId)}/customValues`,
      locationId,
      { name: v.name, value },
    )

    if (created.ok) result.created.push(v.name)
    else {
      const body = await created.text().catch(() => '')
      result.failed.push({ name: v.name, error: `HTTP ${created.status} ${body.slice(0, 120)}` })
    }
  }

  return { ok: true, result }
}

/**
 * Backfill a set of locations, sequentially.
 *
 * Sequential on purpose. A release touches every client an agency has, and firing
 * those concurrently is how a release trips a rate limit and half the estate ends
 * up on the new contract while the other half does not — the worst possible
 * outcome, because it looks like it worked.
 *
 * One location failing never stops the rest; the failures come back as data so a
 * re-run can target them.
 */
export async function backfillAll(
  locationIds: string[],
  perLocationOverrides: Record<string, Record<string, string>> = {},
): Promise<{ total: number; ok: number; results: BackfillResult[]; errors: { locationId: string; error: string }[] }> {
  const results: BackfillResult[] = []
  const errors: { locationId: string; error: string }[] = []

  for (const id of locationIds) {
    const r = await backfillLocation(id, { '0ncore_location_id': id, ...(perLocationOverrides[id] ?? {}) })
    if (r.ok) results.push(r.result)
    else errors.push({ locationId: id, error: r.error })
    await new Promise((res) => setTimeout(res, 300))
  }

  return { total: locationIds.length, ok: results.length, results, errors }
}
