import { crmGet, crmPut } from '@/lib/crm'
import { keyOf } from '@/lib/saas/configure'

/**
 * Turning a client's selections into a CRM that only contains what they chose.
 *
 * THIS IS THE ENDPOINT THAT MAKES THE CONFIGURATOR REAL. Until now the plan
 * builder produced a priced list and nothing else — an agency could show a
 * client a quote, but the sub-account still arrived with all twenty-five
 * features whether they were paid for or not. `PUT /locations/{id}/permissions`
 * takes the exact set to leave enabled, so "pick your services" stops being a
 * pricing exercise and becomes what the client actually logs into.
 *
 * It is a REPLACE, not a merge: the array you send becomes the whole permission
 * set. Sending a partial list silently switches off everything you omitted, so
 * `applyFeatures` always starts from the current state and is explicit about
 * what it is removing.
 *
 * SCOPE: needs `locations/write`, which lives on the AGENCY token. A location
 * PIT returns 401 "not authorized for this scope" — which reads like a broken
 * endpoint and is not one.
 */

/** Every feature the platform lets us toggle. Verified against locations-v3. */
export const TOGGLEABLE_FEATURES = [
  '2-way-text-messaging', 'gmb-messaging', 'web-chat', 'reputation-management',
  'facebook-messenger', 'gmb-call-tracking', 'missed-call-text-back', 'text-to-pay',
  'calendar', 'crm', 'opportunities', 'email-marketing', 'form-builder',
  'survey-builder', 'trigger-links', 'html-builder', 'sms-email-templates',
  'funnels', 'websites', 'workflow', 'membership', 'all-reports', 'triggers',
  'campaigns', 'launchpad',
] as const

export type Feature = (typeof TOGGLEABLE_FEATURES)[number]

/**
 * Features every sub-account keeps regardless of what was bought.
 *
 * `crm` and `calendar` back the base platform that ships free with any plan, and
 * `launchpad` is the onboarding screen — switching those off leaves a client
 * staring at an empty product wondering what they paid for. The base being free
 * is precisely why these are not negotiable.
 */
export const ALWAYS_ON: Feature[] = ['crm', 'calendar', 'launchpad', 'all-reports']

/**
 * Catalogue add-on → the CRM features it switches on.
 *
 * Not one-to-one, and that is the point. "SMS & Text Marketing" is meaningless
 * without missed-call-text-back and templates; selling it as one line and
 * enabling one flag would leave a client with a feature that half works.
 */
export const ADDON_FEATURES: Record<string, Feature[]> = {
  'funnels-landing-pages': ['funnels', 'websites', 'html-builder', 'form-builder'],
  'email-marketing': ['email-marketing', 'sms-email-templates', 'campaigns'],
  'sms-text-marketing': ['2-way-text-messaging', 'missed-call-text-back', 'sms-email-templates'],
  'unified-inbox': ['2-way-text-messaging', 'web-chat', 'facebook-messenger', 'gmb-messaging'],
  'social-media-manager': ['campaigns'],
  'reputation-management': ['reputation-management'],
  'sales-pipeline': ['opportunities'],
  'workflow-automation': ['workflow', 'triggers', 'trigger-links'],
  'smart-triggers': ['triggers', 'trigger-links'],
  'payments-invoicing': ['text-to-pay'],
  'e-commerce-products': ['text-to-pay', 'websites'],
  'membership-courses': ['membership'],
  communities: ['membership'],
  'call-tracking': ['gmb-call-tracking', 'missed-call-text-back'],
  'rocket-ai-mods': ['workflow', 'triggers'],
}

/** The exact feature set for a chosen plan, base included. */
export function featuresForPlan(addonKeys: string[]): Feature[] {
  const set = new Set<Feature>(ALWAYS_ON)
  for (const k of addonKeys) {
    for (const f of ADDON_FEATURES[keyOf(k)] ?? []) set.add(f)
  }
  // Ordered by the canonical list so two identical plans always produce an
  // identical array — otherwise every diff looks like a change.
  return TOGGLEABLE_FEATURES.filter((f) => set.has(f))
}

export interface FeatureDiff {
  enabling: Feature[]
  disabling: Feature[]
  unchanged: Feature[]
  next: Feature[]
}

async function readJson(res: Response): Promise<any> {
  const t = await res.text()
  try { return JSON.parse(t) } catch { return { _raw: t.slice(0, 300) } }
}

export async function currentFeatures(locationId: string): Promise<{ features: Feature[]; error?: string }> {
  const res = await crmGet(`/locations/${locationId}/permissions`, locationId)
  if (!res.ok) {
    const d = await readJson(res)
    const hint = res.status === 401
      ? ' This needs the AGENCY token — locations/write is not on a location PIT.'
      : ''
    return { features: [], error: `${res.status}: ${d?.message || d?._raw || 'could not read permissions'}${hint}` }
  }
  const d = await readJson(res)
  const list = Array.isArray(d?.permissions) ? d.permissions : []
  return { features: list.filter((f: string) => (TOGGLEABLE_FEATURES as readonly string[]).includes(f)) as Feature[] }
}

/**
 * What WOULD change. Computed before anything is written so a human approving
 * the plan sees the removals, which are the part that can lose a client work.
 */
export async function planFeatureChange(
  locationId: string,
  addonKeys: string[]
): Promise<FeatureDiff | { error: string }> {
  const { features: before, error } = await currentFeatures(locationId)
  if (error) return { error }
  const next = featuresForPlan(addonKeys)
  const beforeSet = new Set(before)
  const nextSet = new Set(next)
  return {
    next,
    enabling: next.filter((f) => !beforeSet.has(f)),
    disabling: before.filter((f) => !nextSet.has(f)),
    unchanged: next.filter((f) => beforeSet.has(f)),
  }
}

export interface ApplyResult {
  ok: boolean
  enabled?: Feature[]
  disabled?: Feature[]
  error?: string
}

/**
 * Write the feature set.
 *
 * `allowDisable` defaults FALSE. Switching a feature off can hide a client's
 * existing funnels, workflows or membership content behind a paywall they did
 * not know they crossed — that is a support ticket at best and lost work at
 * worst. Turning things ON is safe; turning them OFF has to be asked for.
 */
export async function applyFeatures(
  locationId: string,
  addonKeys: string[],
  opts: { allowDisable?: boolean } = {}
): Promise<ApplyResult> {
  const diff = await planFeatureChange(locationId, addonKeys)
  if ('error' in diff) return { ok: false, error: diff.error }

  const { features: before } = await currentFeatures(locationId)
  // Without allowDisable the write is additive: keep everything already on.
  const payload = opts.allowDisable
    ? diff.next
    : TOGGLEABLE_FEATURES.filter((f) => diff.next.includes(f) || before.includes(f))

  const res = await crmPut(`/locations/${locationId}/permissions`, locationId, { permissions: payload })
  if (!res.ok) {
    const d = await readJson(res)
    return { ok: false, error: `${res.status}: ${d?.message || d?._raw || 'permission update rejected'}` }
  }

  return {
    ok: true,
    enabled: diff.enabling,
    disabled: opts.allowDisable ? diff.disabling : [],
  }
}
