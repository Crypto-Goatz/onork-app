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

  // Cursor pagination, and it needs BOTH cursors.
  //
  // /contacts/ rejects `skip` outright (422 "property skip should not exist").
  // It pages with startAfterId — but startAfterId ALONE returns the same page
  // forever, because the cursor is (timestamp, id) and the timestamp half is
  // `startAfter`. Sending only the id silently loops: five passes over the same
  // hundred contacts read as five times the leads and five times the pipeline
  // value, which is a wrong number that looks entirely plausible.
  //
  // The id set is belt and braces. If the cursor ever misbehaves again, the
  // count stays honest instead of inflating.
  const seenIds = new Set<string>()
  let afterId = ''
  let afterTs = ''
  for (let page = 0; page < 10; page++) {
    const cursor = afterId ? `&startAfterId=${afterId}&startAfter=${afterTs}` : ''
    const res = await crmGet(`/contacts/?limit=100${cursor}`, locationId)
    if (!res.ok) {
      problems.push(`Contact list returned ${res.status} on page ${page + 1}.`)
      break
    }
    const body = await json(res)
    const batch = Array.isArray(body.contacts) ? (body.contacts as Record<string, unknown>[]) : []

    const fresh = batch.filter((c) => {
      const id = String(c.id || '')
      if (!id || seenIds.has(id)) return false
      seenIds.add(id)
      return true
    })
    contacts.push(...fresh)

    // No new ids means the cursor stopped advancing — stop rather than spin.
    if (batch.length < 100 || fresh.length === 0) break

    const last = batch[batch.length - 1]
    afterId = String(last?.id || '')
    afterTs = String(Date.parse(String(last?.dateAdded || '')) || '')
    if (!afterId || !afterTs) break
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
