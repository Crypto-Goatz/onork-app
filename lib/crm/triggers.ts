import { createClient } from '@supabase/supabase-js'

/**
 * 0nCORE events that START a native workflow.
 *
 * THE DIRECTION IS THE OPPOSITE OF AN ACTION. An action is the platform calling
 * us mid-workflow; a trigger is us calling the platform to begin one. That is
 * what lets an agency build native, editable automations that REACT to AI work:
 * "when 0nCORE builds a site, email the client the link."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FIRED THROUGH INBOUND WEBHOOKS, not a custom-trigger API.
 *
 * The portal's custom-trigger shell has a fire contract that is only revealed
 * once a shell is saved — the same situation as the action callback, and it has
 * not been captured yet. Rather than guess at an endpoint, this uses the
 * mechanism that demonstrably works today: each location's workflow carries an
 * inbound-webhook trigger whose URL we store at provision time, and firing is a
 * POST to that URL.
 *
 * The upgrade path is one function. When the custom-trigger contract is
 * captured, `deliver()` changes and every caller stays put.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NEVER THROWS. A trigger is a notification about work that already happened —
 * if the notification fails, the work is still done and the caller must not be
 * rolled back or reported as failed because a webhook was unreachable.
 */

export const TRIGGERS = [
  { key: 'oncore_burst_completed', name: '0nCORE: Burst Completed', when: 'a command finishes acting on a contact' },
  { key: 'oncore_site_built', name: '0nCORE: Site Built', when: 'a site is deployed' },
  { key: 'oncore_client_provisioned', name: '0nCORE: Client Provisioned', when: 'a new sub-account finishes provisioning' },
  { key: 'oncore_lead_scored', name: '0nCORE: AI Lead Scored', when: 'a contact is scored past a threshold' },
  { key: 'oncore_recovery_fired', name: '0nCORE: Recovery Fired', when: 'a failed step recovered another way' },
] as const

export type TriggerKey = typeof TRIGGERS[number]['key']

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export interface FireInput {
  trigger: TriggerKey
  locationId: string
  companyId?: string
  contactId?: string
  /** Flat, string-ish values only — workflow fields cannot read nested objects. */
  data?: Record<string, string | number | boolean | null>
}

export type FireResult = { fired: boolean; reason?: string }

/**
 * Fire a trigger for one location. Safe to call from anywhere; failures are
 * logged and swallowed.
 */
export async function fireTrigger(input: FireInput): Promise<FireResult> {
  try {
    if (!input.locationId) return { fired: false, reason: 'no location' }

    const { data: hook } = await admin()
      .from('location_webhooks')
      .select('webhook_url')
      .eq('location_id', input.locationId)
      .eq('intent', input.trigger)
      .maybeSingle()

    if (!hook?.webhook_url) {
      // Expected until a client is provisioned from a snapshot that carries the
      // workflow. Not an error — just nothing listening yet.
      return { fired: false, reason: 'no workflow listening for this trigger' }
    }

    return await deliver(hook.webhook_url, {
      trigger: input.trigger,
      locationId: input.locationId,
      companyId: input.companyId ?? null,
      contactId: input.contactId ?? null,
      firedAt: new Date().toISOString(),
      ...(input.data ?? {}),
    })
  } catch (err) {
    console.error(`[crm/triggers] ${input.trigger} threw:`, err)
    return { fired: false, reason: 'error' }
  }
}

/** The one place that knows HOW a trigger reaches the platform. */
async function deliver(url: string, body: Record<string, unknown>): Promise<FireResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // A workflow that is slow to accept must not hold up the caller's response.
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.warn(`[crm/triggers] delivery ${res.status} for ${body.trigger}`)
      return { fired: false, reason: `delivery failed (${res.status})` }
    }
    return { fired: true }
  } catch {
    return { fired: false, reason: 'unreachable' }
  }
}

/** Record where a location's workflow listens. Called at provision, read from the snapshot. */
export async function registerWebhook(locationId: string, trigger: TriggerKey, webhookUrl: string, installId?: string) {
  await admin().from('location_webhooks').upsert({
    location_id: locationId,
    intent: trigger,
    webhook_url: webhookUrl,
    install_id: installId ?? null,
  })
}
