/**
 * Which two sub-accounts the acceptance test is allowed to write into.
 *
 * Pure, and separate from the route, so the rule can be exercised without a
 * CRM: `scripts/test/acceptance-targets.test.ts` is the control. The rule it
 * encodes is a single sentence — the caller names both accounts, each name
 * matches exactly one, and the two are different — and every other outcome
 * writes nothing.
 *
 * It exists because the route used to say `|| locations[0]`. See the comment
 * in app/api/burst/acceptance/route.ts for what index 0 turned out to be.
 */
import { resolveLocation, type AgencyLocation } from '@/lib/crm/locations'

export type TargetRefusal =
  | { kind: 'unnamed' }
  | { kind: 'unresolved'; unresolved: { field: 'locationA' | 'locationB'; spoken: string; ambiguous: string[] | null }[] }
  | { kind: 'same'; name: string }

export type TargetPick =
  | { ok: true; locA: AgencyLocation; locB: AgencyLocation }
  | { ok: false; refusal: TargetRefusal }

export function pickAcceptanceTargets(
  rawA: unknown,
  rawB: unknown,
  locations: AgencyLocation[],
): TargetPick {
  const wantA = typeof rawA === 'string' ? rawA.trim() : ''
  const wantB = typeof rawB === 'string' ? rawB.trim() : ''
  if (!wantA || !wantB) return { ok: false, refusal: { kind: 'unnamed' } }

  const pickA = resolveLocation(wantA, locations)
  const pickB = resolveLocation(wantB, locations)
  const unresolved: { field: 'locationA' | 'locationB'; spoken: string; ambiguous: string[] | null }[] = []
  if (!pickA.location) unresolved.push({ field: 'locationA', spoken: wantA, ambiguous: pickA.ambiguous?.map((l) => l.name) ?? null })
  if (!pickB.location) unresolved.push({ field: 'locationB', spoken: wantB, ambiguous: pickB.ambiguous?.map((l) => l.name) ?? null })
  if (unresolved.length) return { ok: false, refusal: { kind: 'unresolved', unresolved } }

  const locA = pickA.location!
  const locB = pickB.location!
  if (locA.id === locB.id) return { ok: false, refusal: { kind: 'same', name: locA.name } }
  return { ok: true, locA, locB }
}
