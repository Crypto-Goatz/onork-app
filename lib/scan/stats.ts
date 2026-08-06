import { crmGet } from '@/lib/crm'

/**
 * Live numbers for the daily website-buyer scan.
 *
 * WHY THIS READS THE CRM RATHER THAN A LOCAL TABLE. The scan's output IS the
 * CRM — contacts tagged daily-scan, opportunities in the Marketing Pipeline. A
 * separate counter would be a second version of the truth that drifts the first
 * time a lead is edited or deleted by hand, and the point of a board on the wall
 * is that it matches what is actually there.
 */

export const ROCKETOPP_LOCATION = 'nphConTwfHcVE1oA0uep'
export const MARKETING_PIPELINE = 'SYeVtvnuMIUhn3LtS23q'
export const NEW_LEAD_STAGE = '9fe04f16-4fce-4eea-84a7-6ee58083091e'
/** $497 build + 12 x $49 — the value the playbook assigns every lead. */
export const LEAD_VALUE = 1085

export interface ScanLead {
  id: string
  name: string
  email?: string
  phone?: string
  website?: string
  tags: string[]
  source?: string
  createdAt?: string
  reach: 'emailable' | 'phone-only' | 'social-only'
}

export interface ScanStats {
  ok: boolean
  locationId: string
  totalLeads: number
  today: number
  pipelineValue: number
  split: { emailable: number; phoneOnly: number; socialOnly: number }
  byDay: { date: string; count: number }[]
  recent: ScanLead[]
  problems: string[]
}

const PLACEHOLDER = /@example\.com$/i

function reachOf(c: Record<string, unknown>): ScanLead['reach'] {
  const email = String(c.email || '')
  const phone = String(c.phone || '')
  if (email && !PLACEHOLDER.test(email)) return 'emailable'
  if (phone) return 'phone-only'
  return 'social-only'
}

async function json(res: Response): Promise<Record<string, unknown>> {
  const t = await res.text()
  try { return JSON.parse(t) } catch { return { _raw: t.slice(0, 200) } }
}

export async function getScanStats(locationId = ROCKETOPP_LOCATION): Promise<ScanStats> {
  const problems: string[] = []
  const contacts: Record<string, unknown>[] = []

  // Cursor pagination, not offset. /contacts/ rejects `skip` outright —
  // 422 "property skip should not exist" — and pages with startAfterId.
  let cursor = ''
  for (let page = 0; page < 5; page++) {
    const res = await crmGet(`/contacts/?limit=100${cursor ? `&startAfterId=${cursor}` : ''}`, locationId)
    if (!res.ok) {
      problems.push(`Contact list returned ${res.status} on page ${page + 1}.`)
      break
    }
    const body = await json(res)
    const batch = Array.isArray(body.contacts) ? (body.contacts as Record<string, unknown>[]) : []
    contacts.push(...batch)
    if (batch.length < 100) break
    cursor = String(batch[batch.length - 1]?.id || '')
    if (!cursor) break
  }

  const scanned = contacts.filter((c) => {
    const tags = (Array.isArray(c.tags) ? c.tags : []).map((t) => String(t).toLowerCase())
    const source = String(c.source || '').toLowerCase()
    return tags.includes('daily-scan') || tags.includes('website-prospect') || source.startsWith('daily-scan')
  })

  const leads: ScanLead[] = scanned.map((c) => ({
    id: String(c.id || ''),
    name: String(c.contactName || c.firstName || 'Unnamed'),
    email: c.email ? String(c.email) : undefined,
    phone: c.phone ? String(c.phone) : undefined,
    website: c.website ? String(c.website) : undefined,
    tags: (Array.isArray(c.tags) ? c.tags : []).map(String),
    source: c.source ? String(c.source) : undefined,
    createdAt: c.dateAdded ? String(c.dateAdded) : undefined,
    reach: reachOf(c),
  }))

  const dayOf = (iso?: string) => (iso ? iso.slice(0, 10) : 'unknown')
  const counts = new Map<string, number>()
  for (const l of leads) counts.set(dayOf(l.createdAt), (counts.get(dayOf(l.createdAt)) ?? 0) + 1)

  const today = new Date().toISOString().slice(0, 10)

  return {
    ok: true,
    locationId,
    totalLeads: leads.length,
    today: counts.get(today) ?? 0,
    pipelineValue: leads.length * LEAD_VALUE,
    split: {
      emailable: leads.filter((l) => l.reach === 'emailable').length,
      phoneOnly: leads.filter((l) => l.reach === 'phone-only').length,
      socialOnly: leads.filter((l) => l.reach === 'social-only').length,
    },
    byDay: [...counts.entries()]
      .filter(([d]) => d !== 'unknown')
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 14)
      .map(([date, count]) => ({ date, count })),
    recent: leads
      .sort((a, b) => (a.createdAt && b.createdAt ? (a.createdAt < b.createdAt ? 1 : -1) : 0))
      .slice(0, 25),
    problems,
  }
}
