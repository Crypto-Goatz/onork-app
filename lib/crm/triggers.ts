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
 * FIRED THROUGH SUBSCRIPTIONS, with a webhook fallback.
 *
 * The platform POSTs to /api/crm/trigger/:key/subscribe when a workflow adds
 * our trigger, handing over the URL to call. That is the primary path and it
 * costs the agency nothing — dropping the trigger into a workflow wires it.
 *
 * The inbound-webhook bridge stays as a fallback, because a client provisioned
 * from the snapshot is already wired before anyone opens the builder to
 * subscribe. Both resolve to a list of target URLs and one delivery function.
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
  // ── membership portal ──
  // Course Builder. The stalled one is the commercially interesting trigger:
  // completion is a nice-to-know, but a student who has gone quiet is a refund
  // waiting to happen, and it is the only one of the three that fires without
  // the student doing anything.
  { key: 'oncore_course_completed', name: '0nCORE: Course Completed', when: 'a contact finishes a whole course' },
  { key: 'oncore_module_completed', name: '0nCORE: Module Completed', when: 'a contact finishes one module of a course' },
  { key: 'oncore_student_stalled', name: '0nCORE: Student Stalled', when: 'an enrolled contact has made no progress for a while' },
  { key: 'oncore_member_updated', name: '0nCORE: Member Updated Profile', when: 'a member edits their own details' },
  { key: 'oncore_member_viewed', name: '0nCORE: Member Opened Portal', when: 'a member opens their portal' },
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

    const sb = admin()

    // Subscriptions first — the platform tells us where to call when a workflow
    // adds our trigger, so this needs nothing from the agency.
    const { data: subs } = await sb
      .from('trigger_subscriptions')
      .select('target_url, workflow_id')
      .eq('trigger_key', input.trigger)
      .eq('location_id', input.locationId)
      .eq('active', true)

    const targets = (subs ?? []).map((s) => s.target_url).filter(Boolean)

    // Fallback: a snapshot workflow listening on its own inbound webhook. Kept
    // because a client provisioned from the snapshot is wired before anyone
    // opens the workflow builder to subscribe.
    if (!targets.length) {
      const { data: hook } = await sb
        .from('location_webhooks')
        .select('webhook_url')
        .eq('location_id', input.locationId)
        .eq('intent', input.trigger)
        .maybeSingle()
      if (hook?.webhook_url) targets.push(hook.webhook_url)
    }

    if (!targets.length) return { fired: false, reason: 'no workflow listening for this trigger' }

    const payload = {
      trigger: input.trigger,
      locationId: input.locationId,
      companyId: input.companyId ?? null,
      contactId: input.contactId ?? null,
      firedAt: new Date().toISOString(),
      ...(input.data ?? {}),
    }

    // Every subscriber gets it, and one dead endpoint does not stop the others.
    const results = await Promise.all(targets.map((t) => deliver(t, payload)))
    const fired = results.some((r) => r.fired)
    return fired ? { fired: true } : { fired: false, reason: results[0]?.reason ?? 'delivery failed' }
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
