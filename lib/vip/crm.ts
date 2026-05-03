/**
 * VIP-aware server-side CRM client.
 *
 * Each VIP client has its own PIT (`crmPitEnv` in the registry). This
 * module reads that env var, talks directly to services.leadconnectorhq.com,
 * and exposes the few aggregates the dashboard cares about. It does NOT
 * use the existing /api/crm/proxy because that proxy auths to the SIGNED-IN
 * user's location — VIP dashboards need to read the CLIENT's location no
 * matter who's looking at the page.
 *
 * All calls are cached for 60s via `unstable_cache` so dashboard refreshes
 * don't hammer the CRM. Failures are surfaced to the caller — the page
 * uses Promise.allSettled so one bad call doesn't break the whole render.
 */

import { unstable_cache } from 'next/cache'
import type { VipClient } from './clients'

const BASE = 'https://services.leadconnectorhq.com'
const VERSION = '2021-07-28'
const CACHE_TTL_S = 60

export class CrmError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
  }
}

function pitFor(client: VipClient): string {
  if (!client.sources.crmPitEnv) {
    throw new CrmError(`No PIT env configured for VIP client "${client.slug}"`)
  }
  const pit = process.env[client.sources.crmPitEnv]
  if (!pit || !pit.startsWith('pit-')) {
    throw new CrmError(
      `Env ${client.sources.crmPitEnv} missing or malformed (expected pit-... value)`,
    )
  }
  return pit
}

async function crmFetch(
  client: VipClient,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const pit = pitFor(client)
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${pit}`,
      Version: VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    // Server-side fetches; default cache off, we use unstable_cache instead.
    cache: 'no-store',
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new CrmError(
      `CRM ${res.status} on ${path}${txt ? `: ${txt.slice(0, 200)}` : ''}`,
      res.status,
    )
  }
  return res.json()
}

// ── Aggregates the dashboard reads ───────────────────────────

interface SearchResponse {
  contacts?: unknown[]
  total?: number
}

/** Count contacts that carry a tag. Cached 60s per (slug, tag). */
export async function countContactsWithTag(
  client: VipClient,
  tagName: string,
): Promise<number> {
  const fn = unstable_cache(
    async (slug: string, tag: string) => {
      const data = (await crmFetch(client, '/contacts/search', {
        method: 'POST',
        body: JSON.stringify({
          locationId: client.sources.crmLocationId,
          pageLimit: 1,
          filters: [
            { field: 'tags', operator: 'contains', value: tag },
          ],
        }),
      })) as SearchResponse
      return data?.total ?? 0
    },
    ['vip-tag-count', client.slug, tagName],
    { revalidate: CACHE_TTL_S },
  )
  return fn(client.slug, tagName)
}

/** Total contacts on the location. */
export async function countContactsTotal(client: VipClient): Promise<number> {
  const fn = unstable_cache(
    async () => {
      const data = (await crmFetch(client, '/contacts/search', {
        method: 'POST',
        body: JSON.stringify({
          locationId: client.sources.crmLocationId,
          pageLimit: 1,
          filters: [],
        }),
      })) as SearchResponse
      return data?.total ?? 0
    },
    ['vip-tag-count-total', client.slug],
    { revalidate: CACHE_TTL_S },
  )
  return fn()
}

interface CalendarEvent {
  id: string
  title?: string
  startTime?: string
  endTime?: string
  appointmentStatus?: string
  contactId?: string
}

/** Appointments in a date window across all calendars on the location. */
export async function listAppointments(
  client: VipClient,
  startISO: string,
  endISO: string,
): Promise<CalendarEvent[]> {
  const fn = unstable_cache(
    async () => {
      const qs = new URLSearchParams({
        locationId: client.sources.crmLocationId,
        startTime: startISO,
        endTime: endISO,
      })
      const data = (await crmFetch(
        client,
        `/calendars/events?${qs.toString()}`,
      )) as { events?: CalendarEvent[] }
      return data?.events ?? []
    },
    ['vip-appts', client.slug, startISO, endISO],
    { revalidate: CACHE_TTL_S },
  )
  return fn()
}

/** All workflows on the location with status. */
export async function listWorkflows(
  client: VipClient,
): Promise<Array<{ id: string; name: string; status: string }>> {
  const fn = unstable_cache(
    async () => {
      const qs = new URLSearchParams({
        locationId: client.sources.crmLocationId,
      })
      const data = (await crmFetch(
        client,
        `/workflows/?${qs.toString()}`,
      )) as { workflows?: Array<{ id: string; name: string; status: string }> }
      return data?.workflows ?? []
    },
    ['vip-workflows', client.slug],
    { revalidate: CACHE_TTL_S },
  )
  return fn()
}

interface ContactRow {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags?: string[]
  dateAdded?: string
  dateUpdated?: string
}

/** Most recent contacts (by dateUpdated desc), trimmed to N rows. */
export async function recentContacts(
  client: VipClient,
  limit = 10,
): Promise<ContactRow[]> {
  const fn = unstable_cache(
    async () => {
      const data = (await crmFetch(client, '/contacts/search', {
        method: 'POST',
        body: JSON.stringify({
          locationId: client.sources.crmLocationId,
          pageLimit: limit,
          sort: [{ field: 'dateUpdated', direction: 'desc' }],
        }),
      })) as { contacts?: ContactRow[] }
      return data?.contacts ?? []
    },
    ['vip-recent-contacts', client.slug, String(limit)],
    { revalidate: CACHE_TTL_S },
  )
  return fn()
}

/** All trigger links on the location with click counts. */
export async function listTriggerLinks(
  client: VipClient,
): Promise<Array<{ id: string; name: string; redirectTo: string; fieldKey?: string }>> {
  const fn = unstable_cache(
    async () => {
      const qs = new URLSearchParams({
        locationId: client.sources.crmLocationId,
      })
      const data = (await crmFetch(
        client,
        `/links/?${qs.toString()}`,
      )) as {
        links?: Array<{ id: string; name: string; redirectTo: string; fieldKey?: string }>
      }
      return data?.links ?? []
    },
    ['vip-trigger-links', client.slug],
    { revalidate: CACHE_TTL_S },
  )
  return fn()
}

/** Total tag count on the location — proxy for "list size". */
export async function listTags(
  client: VipClient,
): Promise<Array<{ id: string; name: string }>> {
  const fn = unstable_cache(
    async () => {
      const data = (await crmFetch(
        client,
        `/locations/${client.sources.crmLocationId}/tags`,
      )) as { tags?: Array<{ id: string; name: string }> }
      return data?.tags ?? []
    },
    ['vip-tags', client.slug],
    { revalidate: CACHE_TTL_S },
  )
  return fn()
}

// ── Convenience aggregator for the dashboard ──────────────────

export interface VipDashboardData {
  totalContacts: number
  totalTags: number
  totalWorkflows: number
  campaign?: {
    enrolled: number
    clicked: number
    purchased: number
  }
  bookingsThisWeek: number
  bookingsLastWeek: number
  recentContacts: ContactRow[]
  errors: Array<{ source: string; message: string }>
}

function startOfWeekUTC(d: Date): Date {
  const x = new Date(d)
  const dow = x.getUTCDay() // 0 = Sunday
  x.setUTCDate(x.getUTCDate() - dow)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

export async function loadVipDashboard(
  client: VipClient,
): Promise<VipDashboardData> {
  const errors: Array<{ source: string; message: string }> = []

  const now = new Date()
  const thisWeekStart = startOfWeekUTC(now)
  const nextWeekStart = new Date(thisWeekStart)
  nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7)

  const campaign = client.activeCampaigns?.[0]

  const [
    totalContactsR,
    tagsR,
    workflowsR,
    enrolledR,
    clickedR,
    purchasedR,
    apptThisWeekR,
    apptLastWeekR,
    recentR,
  ] = await Promise.allSettled([
    countContactsTotal(client),
    listTags(client),
    listWorkflows(client),
    campaign ? countContactsWithTag(client, campaign.enrollTag) : Promise.resolve(0),
    campaign ? countContactsWithTag(client, campaign.clickTag) : Promise.resolve(0),
    campaign ? countContactsWithTag(client, campaign.purchaseTag) : Promise.resolve(0),
    listAppointments(client, thisWeekStart.toISOString(), nextWeekStart.toISOString()),
    listAppointments(client, lastWeekStart.toISOString(), thisWeekStart.toISOString()),
    recentContacts(client, 8),
  ])

  function pull<T>(
    r: PromiseSettledResult<T>,
    fallback: T,
    src: string,
  ): T {
    if (r.status === 'fulfilled') return r.value
    errors.push({ source: src, message: r.reason?.message || 'unknown error' })
    return fallback
  }

  return {
    totalContacts: pull(totalContactsR, 0, 'total contacts'),
    totalTags: pull(tagsR, [], 'tags').length,
    totalWorkflows: pull(workflowsR, [], 'workflows').length,
    campaign: campaign
      ? {
          enrolled: pull(enrolledR, 0, `enrolled (${campaign.enrollTag})`),
          clicked: pull(clickedR, 0, `clicked (${campaign.clickTag})`),
          purchased: pull(purchasedR, 0, `purchased (${campaign.purchaseTag})`),
        }
      : undefined,
    bookingsThisWeek: pull(apptThisWeekR, [], 'this-week appointments').length,
    bookingsLastWeek: pull(apptLastWeekR, [], 'last-week appointments').length,
    recentContacts: pull(recentR, [], 'recent contacts'),
    errors,
  }
}
