/**
 * The trigger router — how the server fires automation inside a location.
 *
 * WHY IT IS TAGS AND FIELDS, NOT WEBHOOKS. Each location's inbound-webhook
 * workflow gets a unique trigger URL generated when the snapshot loads, and
 * nothing exposes it: the workflows API returns seven fields with no URL among
 * them, and `/workflows/{id}`, `/workflows/{id}/triggers`, `/workflows/{id}/steps`
 * and `/hooks/` all 404. Verified 2026-08-14. There is nothing to harvest, so
 * harvesting is not an option that needs weighing.
 *
 * What IS verified-programmatic is writing a tag or a custom field. So the
 * server sets a marker, a snapshot-carried workflow triggers on that marker, and
 * the workflow clears it. No per-location setup, no URL knowledge, and the
 * trigger itself travels inside the snapshot like any other asset.
 *
 * ONE WORKFLOW PER VERB WOULD NOT SCALE. Every new integration would need a new
 * workflow, which means a snapshot release — the expensive path. Instead a small
 * number of GENERIC routers branch on a verb carried in a field, so a new
 * integration adds a verb server-side and ships the same day.
 *
 * VERBS ARE VERSIONED so an old workflow meeting a new verb does nothing rather
 * than something wrong. A router that has not been updated will not match
 * `v2:course.enrolled` and simply falls through — which is the correct
 * behaviour for automation running in someone's business.
 */
import { crmPostRaw, crmGet } from '@/lib/crm'

/** Bumped only when the payload shape changes incompatibly. */
export const VERB_VERSION = 'v1'

/**
 * The field the router reads. Managed-layer, so it is snapshot-carried and
 * overwritten by releases rather than owned by the client.
 */
export const ROUTER_FIELD = '0ncore_action'

/** The tag form, for routers that trigger on tag-applied instead. */
export const routerTag = (verb: string) => `0ncore:${verb}`

export interface RouteResult {
  ok: boolean
  verb: string
  contactId: string
  detail: string
}

/**
 * Fire a location's router for one contact.
 *
 * REQUIRES A CONTACT, and that is the honest limitation of this design. Tag and
 * field triggers are contact-scoped, so genuinely location-scoped events — a
 * nightly rollup, a finished site scan — have no natural carrier. Those either
 * stay server-side, or ride a dedicated per-location system contact. Do not
 * invent a contact per event; that fills a client's CRM with our plumbing.
 */
export async function fireRouter(
  locationId: string,
  contactId: string,
  verb: string,
  payload: Record<string, string | number | boolean> = {},
): Promise<RouteResult> {
  const versioned = `${VERB_VERSION}:${verb}`

  // The payload rides as a compact JSON string in one custom field. Workflow
  // steps can read it; anything richer would need a webhook we cannot address.
  const body = {
    customFields: [
      { key: ROUTER_FIELD, field_value: versioned },
      { key: '0ncore_payload', field_value: JSON.stringify(payload).slice(0, 900) },
    ],
  }

  try {
    // crmPostRaw: the standard helper injects locationId into the body and the
    // contacts endpoints reject it with a 422.
    const res = await crmPostRaw(`/contacts/${encodeURIComponent(contactId)}`, locationId, body)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, verb: versioned, contactId, detail: `HTTP ${res.status} ${text.slice(0, 140)}` }
    }
    return { ok: true, verb: versioned, contactId, detail: 'Router field set; the workflow fires on change.' }
  } catch (err) {
    return {
      ok: false, verb: versioned, contactId,
      detail: err instanceof Error ? err.message : 'Could not reach the CRM.',
    }
  }
}

/**
 * Is this location wired to receive routed events?
 *
 * Checks for the field rather than the workflow, because the workflow cannot be
 * read back — `/workflows/` is list-only and exposes no structure. The field is
 * the part we can verify, and its absence is the actionable half: no field means
 * the snapshot never landed, and the router will never fire whatever we set.
 */
export async function routerReady(locationId: string): Promise<{ ready: boolean; reason: string }> {
  try {
    const res = await crmGet(`/locations/${encodeURIComponent(locationId)}/customFields`, locationId)
    if (!res.ok) return { ready: false, reason: `Could not read custom fields (HTTP ${res.status}).` }

    const json = (await res.json().catch(() => ({}))) as { customFields?: { name?: string; fieldKey?: string }[] }
    const has = (json.customFields ?? []).some(
      (f) => f.name === ROUTER_FIELD || String(f.fieldKey ?? '').endsWith(ROUTER_FIELD),
    )
    return has
      ? { ready: true, reason: 'Router field present.' }
      : { ready: false, reason: `No ${ROUTER_FIELD} field — this location has not received the managed snapshot.` }
  } catch (err) {
    return { ready: false, reason: err instanceof Error ? err.message : 'Check failed.' }
  }
}

/**
 * The verbs the routers understand. Adding one here plus a branch in the
 * workflow is the whole cost of making an integration CRM-visible — no new
 * workflow, no snapshot release.
 */
export const VERBS = [
  { verb: 'course.enrolled', since: 'v1', describes: 'A contact was enrolled in a course.' },
  { verb: 'course.completed', since: 'v1', describes: 'A contact finished a course.' },
  { verb: 'course.stalled', since: 'v1', describes: 'An enrolled contact has gone quiet.' },
  { verb: 'scan.completed', since: 'v1', describes: 'A site scan finished for this contact’s business.' },
  { verb: 'lead.verified', since: 'v1', describes: 'A prospect passed verification.' },
  { verb: 'fact.promoted', since: 'v1', describes: 'The learning engine promoted a fact about this account.' },
] as const
