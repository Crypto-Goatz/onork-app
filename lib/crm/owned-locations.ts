/**
 * Which CRM sub-accounts the signed-in person may act on — the ONE answer.
 *
 * 2026-11-24: /api/crm/proxy took `locationId` from the request body and used
 * it as-is, so any signed-in account could read or write any sub-account the
 * agency key reaches by naming its id. Same class as the ten user_id holes
 * closed in 1b1b14c. Every caller that accepts a location from the browser
 * now asks this module first.
 *
 * A person owns: their profile's own location, plus every sub-account they
 * CONNECTED (location_connections active, under their active agency
 * connection). The 87 locations an agency merely has listed are not owned
 * until connected — that is the step where the agency chose to act there.
 */
import { createServiceClient } from '@/lib/connect/service-client'

export interface OwnedLocation { id: string; name: string; isDefault: boolean }

export async function ownedLocations(userId: string): Promise<{ locations: OwnedLocation[]; defaultId: string | null; isAdmin: boolean }> {
  const db = createServiceClient()
  if (!db) return { locations: [], defaultId: null, isAdmin: false }

  const { data: profile } = await db.from('profiles').select('crm_location_id, is_admin').eq('id', userId).maybeSingle()
  const defaultId = (profile?.crm_location_id as string | null)?.trim() || null
  const isAdmin = Boolean(profile?.is_admin)

  const byId = new Map<string, string>()
  const { data: agency } = await db
    .from('agency_connections')
    .select('company_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (agency?.company_id) {
    const { data: rows } = await db
      .from('location_connections')
      .select('location_id, location_name')
      .eq('company_id', agency.company_id)
      .eq('status', 'active')
    for (const r of rows ?? []) byId.set(r.location_id as string, (r.location_name as string) || (r.location_id as string))
  }
  if (defaultId && !byId.has(defaultId)) byId.set(defaultId, 'Your account')

  const locations = [...byId.entries()]
    .map(([id, name]) => ({ id, name, isDefault: id === defaultId }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name))
  return { locations, defaultId: defaultId ?? locations[0]?.id ?? null, isAdmin }
}

export async function canUseLocation(userId: string, locationId: string): Promise<boolean> {
  const { locations, isAdmin } = await ownedLocations(userId)
  return isAdmin || locations.some((l) => l.id === locationId)
}
