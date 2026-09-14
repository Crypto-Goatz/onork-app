/**
 * vault-mirror — a client CRM key the agency pastes into 0nCore also lands in
 * the agency owner's 0n3 vault, as one .0n connection record.
 *
 * WHY. 0nCore, 0nmcp.com, 0nTask and 0n3 share one identity (one 0n_ token
 * answers on all four, measured 2026-09-14) but did not share the CRM keys:
 * 0nCore kept them in location_connections, 0n3 held three unrelated crm
 * records, 0nTask minted its own through the bridge. "In sync" means the same
 * account sees the same connections from every door, and the vault is the
 * store the three other surfaces already read. 0nCore stays the writer (its
 * /connect page is where a key is pasted and verified); this is the
 * write-through.
 *
 * Idempotent: the vault upserts on (account, service, label).
 */
import { on3Url } from '@/lib/on3'

const CRM_BASE = 'https://services.leadconnectorhq.com'

export type MirrorInput = {
  ownerToken: string
  locationId: string
  locationName: string | null
  companyId: string | null
  pit: string
  isFree?: boolean
}

export function crmLabelFor(locationName: string | null, locationId: string): string {
  return `CRM · ${(locationName || locationId).trim().slice(0, 80)}`
}

export async function mirrorLocationKeyToVault(input: MirrorInput): Promise<{ ok: boolean; label: string; error?: string }> {
  const now = new Date().toISOString()
  const label = crmLabelFor(input.locationName, input.locationId)
  const envelope = {
    $0n: { type: 'connection', version: '2.1.1', name: label, created: now, updated: now },
    service: 'crm',
    environment: 'production',
    auth: { type: 'pit', credentials: { pit: input.pit, location_id: input.locationId } },
    options: { base_url: CRM_BASE },
    meta: {
      location_id: input.locationId,
      location_name: input.locationName,
      company_id: input.companyId,
      api_version: '2021-07-28',
      source: '0ncore:location_connections',
      ...(input.isFree ? { free_account: true } : {}),
    },
  }
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 15_000)
    const r = await fetch(`${on3Url()}/vault/crm`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${input.ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      signal: ctl.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return { ok: false, label, error: `0n3 answered ${r.status}: ${text.slice(0, 160)}` }
    }
    return { ok: true, label }
  } catch (e) {
    return { ok: false, label, error: e instanceof Error ? e.message : String(e) }
  }
}
