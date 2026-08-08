/**
 * GHL Marketplace wallet billing — charge the agency's/sub-account's HighLevel
 * WALLET (the payment method already on file with GHL) for our app's usage.
 *
 * This is the "billed through the marketplace" path: instead of collecting a
 * card ourselves, GHL charges their wallet and pays us out. It only works once
 * the app's pricing is configured Usage-Based in the developer portal and the
 * app carries the payments scopes — the portal config is what actually turns
 * charging on; this code posts the charges.
 *
 * Endpoint: POST https://services.leadconnectorhq.com/marketplace/billing/charges
 */
import { getAuthForLocation } from '@/lib/crm'
import { getValidAgencyToken } from '@/lib/crm/agency-token'

const CHARGE_URL = 'https://services.leadconnectorhq.com/marketplace/billing/charges'
const VERSION = '2021-07-28'
const UA = 'Mozilla/5.0 (0nCORE)' // CRM edge blocks empty UAs (Cloudflare 1010)

export interface WalletChargeResult { ok: boolean; status: number; id?: string; error?: string }

/**
 * Charge a wallet for `amountCents`. Rebilling target is decided by GHL's app
 * config (sub-account vs agency wallet); we pass the installed location/company
 * so the charge lands on the right one. Never throws — billing must not break
 * the action it's billing for.
 */
export async function chargeWallet(opts: {
  locationId?: string
  companyId?: string
  amountCents: number
  description: string
  eventId?: string // idempotency: a retried action must not double-charge
}): Promise<WalletChargeResult> {
  try {
    if (opts.amountCents <= 0) return { ok: true, status: 0 }

    // Token: a location charge uses the location token; an agency-level charge
    // uses the agency token.
    let token: string | null = null
    if (opts.locationId) token = (await getAuthForLocation(opts.locationId)).token
    if (!token) token = (await getValidAgencyToken()).token
    if (!token) return { ok: false, status: 0, error: 'no CRM token' }

    const body: Record<string, unknown> = {
      amount: opts.amountCents / 100,
      currency: 'USD',
      description: opts.description,
      ...(opts.locationId ? { locationId: opts.locationId } : {}),
      ...(opts.companyId ? { companyId: opts.companyId } : {}),
      ...(opts.eventId ? { eventId: opts.eventId } : {}),
    }

    const res = await fetch(CHARGE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': UA,
      },
      body: JSON.stringify(body),
    })
    const text = await res.text().catch(() => '')
    if (!res.ok) {
      console.error('[wallet-charge] failed', res.status, text.slice(0, 300))
      return { ok: false, status: res.status, error: text.slice(0, 200) }
    }
    let id: string | undefined
    try { id = JSON.parse(text)?.id } catch {}
    return { ok: true, status: res.status, id }
  } catch (err) {
    console.error('[wallet-charge] threw (ignored):', err instanceof Error ? err.message : err)
    return { ok: false, status: 0, error: 'threw' }
  }
}
