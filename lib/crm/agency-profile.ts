import { getValidAgencyToken } from '@/lib/crm/agency-token'

/**
 * The agency's own identity — name, logo, white-label domain.
 *
 * UNLOCKED BY THE AGENCY INSTALL. /companies/{id} needs companies.readonly,
 * which the older app never had; it answered 401 until the new app was
 * installed. This is what turns the dashboard header from "Agency Command" into
 * the customer's actual brand, which matters more here than on most products —
 * agencies white-label everything, and a header showing OUR name inside THEIR
 * CRM is the fastest way to look like a bolted-on tool.
 */

const CRM_API = 'https://services.leadconnectorhq.com'

export interface AgencyProfile {
  name: string | null
  logoUrl: string | null
  website: string | null
  domain: string | null
  email: string | null
}

export async function readAgencyProfile(companyId: string): Promise<AgencyProfile | null> {
  const agency = await getValidAgencyToken(companyId)
  if (!agency.token) return null
  try {
    const res = await fetch(`${CRM_API}/companies/${encodeURIComponent(companyId)}`, {
      headers: { Authorization: `Bearer ${agency.token}`, Version: '2021-07-28', Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { company?: Record<string, unknown> }
    const c = json.company ?? {}
    return {
      name: (c.name as string) ?? null,
      logoUrl: (c.logoUrl as string) ?? null,
      website: (c.website as string) ?? null,
      domain: (c.domain as string) ?? null,
      email: (c.email as string) ?? null,
    }
  } catch (err) {
    console.error('[crm/agency-profile]', err)
    return null
  }
}

export interface Snapshot { id: string; name: string; type?: string }

/**
 * The agency's snapshot library — their own templates, which is the ONLY thing
 * 0nCORE ever deploys into a client. We never ship ours.
 */
export async function listSnapshots(companyId: string): Promise<{ snapshots: Snapshot[]; error?: string }> {
  const agency = await getValidAgencyToken(companyId)
  if (!agency.token) return { snapshots: [], error: agency.error || 'Not connected.' }
  try {
    const res = await fetch(`${CRM_API}/snapshots/?companyId=${encodeURIComponent(companyId)}`, {
      headers: { Authorization: `Bearer ${agency.token}`, Version: '2021-07-28', Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[crm/snapshots] ${res.status}: ${body.slice(0, 160)}`)
      return { snapshots: [], error: 'Could not read your snapshots.' }
    }
    const json = (await res.json()) as { snapshots?: { id?: string; _id?: string; name?: string; type?: string }[] }
    return {
      snapshots: (json.snapshots ?? [])
        .map((s) => ({ id: String(s.id || s._id || ''), name: s.name || 'Untitled snapshot', type: s.type }))
        .filter((s) => s.id),
    }
  } catch (err) {
    console.error('[crm/snapshots]', err)
    return { snapshots: [], error: 'Could not reach the CRM.' }
  }
}
