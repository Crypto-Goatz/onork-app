import { getValidAgencyToken } from '@/lib/crm/agency-token'

/**
 * The agency's SaaS/rebilling configuration — which client is on which plan,
 * at what price, and whether their subscription is healthy.
 *
 * ONE ENDPOINT, AND IT IS THE ONLY ONE. Discovery probed seven plausible SaaS
 * paths against a live agency token. Exactly one exists:
 *
 *   GET /saas-api/public-api/locations?companyId=…   401 → exists, needs scope
 *   …/agency-plan, …/update-saas-subscription,
 *   …/bulk-disable-saas, …/enable-saas/{id},
 *   …/generate-payment-link, …/plans                 404 → no such route
 *
 * A 401 means the route is real and our token lacks the scope; a 404 means the
 * path does not exist at all. That distinction is the whole map — anything built
 * against the 404s would be built against nothing.
 *
 * SO THERE IS NO "LIST THE AGENCY'S PLANS" CALL. Plans are only visible through
 * the locations that are subscribed to them, which is why buildPlans() derives
 * the plan list by grouping locations rather than reading it directly. If the
 * agency has a plan nobody is on, we cannot see it, and the UI must not imply
 * the list is complete.
 *
 * REQUIRES THE AGENCY APP INSTALL (saas/company.read). Until that exists this
 * returns needsInstall, not an empty list — "no plans" and "we are not allowed
 * to look" are completely different facts.
 */

const CRM_API = 'https://services.leadconnectorhq.com'

export interface SaasLocation {
  locationId: string
  name?: string
  planId?: string
  planName?: string
  /** Cents per interval, when the platform reports it. */
  priceCents?: number
  interval?: string
  status?: string
  trialEndsAt?: string
  provider?: string
}

export interface SaasPlan {
  id: string
  name: string
  priceCents?: number
  interval?: string
  clientCount: number
  /** Monthly recurring across every client on this plan, in cents. */
  mrrCents: number
}

export type SaasResult =
  | { ok: true; enabled: true; locations: SaasLocation[]; plans: SaasPlan[]; partial?: string }
  | { ok: true; enabled: false; reason: string; needsInstall?: boolean }
  | { ok: false; error: string }

/** Money arrives as dollars, cents, or a string, depending on the field. */
function toCents(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) {
    // A plain integer under 1000 is almost certainly dollars (a $97 plan), and
    // treating it as cents would report $0.97. Over that, assume cents already.
    return v < 1000 ? Math.round(v * 100) : Math.round(v)
  }
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.]/g, ''))
    return Number.isFinite(n) ? toCents(n) : undefined
  }
  return undefined
}

interface RawSaasLocation {
  _id?: string; id?: string; locationId?: string; name?: string
  planId?: string; plan?: { _id?: string; id?: string; name?: string; price?: unknown; interval?: string }
  planName?: string; price?: unknown; amount?: unknown; interval?: string
  status?: string; subscriptionStatus?: string; trialEndDate?: string; provider?: string
}

export async function readSaas(companyId: string): Promise<SaasResult> {
  const agency = await getValidAgencyToken(companyId)
  if (!agency.token) {
    return { ok: true, enabled: false, reason: agency.error || 'No agency connection yet.', needsInstall: true }
  }

  let res: Response
  try {
    res = await fetch(`${CRM_API}/saas-api/public-api/locations?companyId=${encodeURIComponent(companyId)}`, {
      headers: {
        Authorization: `Bearer ${agency.token}`,
        Version: '2021-04-15',
        Accept: 'application/json',
        channel: 'OAUTH',
        source: 'INTEGRATION',
      },
      cache: 'no-store',
    })
  } catch (err) {
    console.error('[crm/saas] unreachable:', err)
    return { ok: false, error: 'Could not reach the CRM.' }
  }

  if (res.status === 401 || res.status === 403) {
    // The specific, actionable case — and the one that is true right now.
    return {
      ok: true,
      enabled: false,
      needsInstall: true,
      reason: 'Connect your agency to 0nCORE to see your plans and rebilling.',
    }
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[crm/saas] ${res.status}: ${body.slice(0, 200)}`)
    return { ok: false, error: 'Could not read your plans.' }
  }

  const json = (await res.json().catch(() => ({}))) as { locations?: RawSaasLocation[] } | RawSaasLocation[]
  const raw = Array.isArray(json) ? json : (json.locations ?? [])

  const locations: SaasLocation[] = raw.map((l) => ({
    locationId: String(l.locationId || l._id || l.id || ''),
    name: l.name,
    planId: l.planId || l.plan?._id || l.plan?.id,
    planName: l.planName || l.plan?.name,
    priceCents: toCents(l.price ?? l.amount ?? l.plan?.price),
    interval: l.interval || l.plan?.interval,
    status: l.status || l.subscriptionStatus,
    trialEndsAt: l.trialEndDate,
    provider: l.provider,
  })).filter((l) => l.locationId)

  return { ok: true, enabled: true, locations, plans: buildPlans(locations) }
}

/**
 * Group subscribed clients into plans.
 *
 * DERIVED, NOT READ. There is no endpoint that lists an agency's plans, so this
 * is the plan list as seen through its subscribers. A plan with no clients on it
 * is invisible here — which is honest, because it is also invisible to the API.
 */
export function buildPlans(locations: SaasLocation[]): SaasPlan[] {
  const byPlan = new Map<string, SaasPlan>()
  for (const l of locations) {
    const id = l.planId || l.planName || 'unknown'
    const existing = byPlan.get(id)
    // Only count money towards MRR for a subscription that is actually running.
    // Counting cancelled and trialing clients would inflate the number an agency
    // might quote to an investor.
    const live = !l.status || /active|trialing/i.test(l.status)
    const monthly = l.priceCents && /year|annual/i.test(l.interval ?? '') ? Math.round(l.priceCents / 12) : l.priceCents
    if (existing) {
      existing.clientCount += 1
      if (live && monthly) existing.mrrCents += monthly
    } else {
      byPlan.set(id, {
        id,
        name: l.planName || 'Unnamed plan',
        priceCents: l.priceCents,
        interval: l.interval,
        clientCount: 1,
        mrrCents: live && monthly ? monthly : 0,
      })
    }
  }
  return [...byPlan.values()].sort((a, b) => b.mrrCents - a.mrrCents)
}
