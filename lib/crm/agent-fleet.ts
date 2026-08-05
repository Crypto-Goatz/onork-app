import { listAgentsForLocation } from '@/lib/crm/agents'
import { listAgencyLocations } from '@/lib/crm/locations'

/**
 * Every client's agents, across the whole agency.
 *
 * THE VIEW THAT ONLY WE CAN OFFER. Natively an agency owner opens each
 * sub-account to see what its agents are — which is why nobody audits them and
 * why an agent left on `auto-pilot` in a client nobody has opened for months is
 * a real risk. One list makes that visible.
 *
 * BOUNDED. Reading every location on a large agency is one call each, so this
 * caps the sweep and reports what it did not reach rather than pretending the
 * list is complete.
 */

const MAX_CLIENTS = 25

export interface FleetRow {
  locationId: string
  client: string
  agents: { id: string; name: string; status: string }[]
  error?: string
}

export async function listAgentsForAgency(companyId: string): Promise<{
  ok: boolean
  fleet: FleetRow[]
  totals: { clients: number; agents: number; active: number }
  notChecked: number
  error?: string
}> {
  const { locations, error } = await listAgencyLocations(companyId)
  if (error) return { ok: false, fleet: [], totals: { clients: 0, agents: 0, active: 0 }, notChecked: 0, error }

  const scope = locations.slice(0, MAX_CLIENTS)
  const fleet = await Promise.all(scope.map(async (l): Promise<FleetRow> => {
    const { agents, error: e } = await listAgentsForLocation(l.id)
    return { locationId: l.id, client: l.name, agents, error: e }
  }))

  const all = fleet.flatMap((f) => f.agents)
  return {
    ok: true,
    fleet: fleet.filter((f) => f.agents.length > 0 || f.error),
    totals: {
      clients: fleet.filter((f) => f.agents.length > 0).length,
      agents: all.length,
      active: all.filter((a) => a.status === 'active').length,
    },
    notChecked: Math.max(0, locations.length - scope.length),
  }
}
