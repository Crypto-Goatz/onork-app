/**
 * Bidirectional Stripe ↔ CRM contact linking.
 *
 * The link:
 *   profiles.user_id  ←joins→  profiles.stripe_customer_id
 *                              profiles.crm_contact_id
 *
 * CRM side (master location nphConTwfHcVE1oA0uep) holds two custom fields:
 *   - "Stripe Customer ID" (id: ZuravTtwlKO5TYHc5bEf, key: contact.stripe_customer_id)
 *   - "Stripe Subscription ID" (id: SR3sRg3koRY5BxLD3Fve, key: contact.stripe_subscription_id)
 *
 * This module exposes two helpers:
 *   - writeStripeIdsToCrmContact()  — push Stripe IDs into the CRM contact
 *   - applyLifecycleTag()           — toggle subscriber-* tags based on Stripe state
 *
 * Both are defensive: missing PIT, missing contact, network errors — log and
 * return false. Never throws into a webhook handler.
 */

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

/** Master 0nCore CRM location — where customer contacts live. */
export const MASTER_LOCATION_ID = 'nphConTwfHcVE1oA0uep'

/** Custom field IDs on the master location, captured live 2026-05-15. */
export const CRM_CUSTOM_FIELDS = {
  stripe_customer_id: 'ZuravTtwlKO5TYHc5bEf',
  stripe_subscription_id: 'SR3sRg3koRY5BxLD3Fve',
} as const

/** Lifecycle tags applied based on subscription state. */
export const LIFECYCLE_TAGS = {
  active: 'subscriber-active',
  trialing: 'subscriber-active',
  past_due: 'subscriber-past-due',
  unpaid: 'subscriber-past-due',
  canceled: 'subscriber-canceled',
  incomplete_expired: 'subscriber-canceled',
} as const

/** All lifecycle tag values — used when clearing the others. */
const ALL_LIFECYCLE_TAGS = [
  'subscriber-active',
  'subscriber-past-due',
  'subscriber-canceled',
]

function getMasterPit(): string {
  const pit =
    process.env.CRM_PIT_ONCORE ||
    process.env.CRM_PIT_RAW ||
    ''
  if (!pit.startsWith('pit-')) {
    console.error(
      '[crm-billing-link] CRM_PIT_ONCORE / CRM_PIT_RAW missing or not a pit-* token (must be type:plain on Vercel)',
    )
    return ''
  }
  return pit
}

/**
 * Push Stripe IDs into the contact's custom fields on the master location.
 * Best-effort — returns true on success, false otherwise.
 */
export async function writeStripeIdsToCrmContact(args: {
  contactId: string
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
}): Promise<boolean> {
  const { contactId, stripeCustomerId, stripeSubscriptionId } = args
  if (!contactId) return false
  if (!stripeCustomerId && !stripeSubscriptionId) return false

  const pit = getMasterPit()
  if (!pit) return false

  const customFields: { id: string; field_value: string }[] = []
  if (stripeCustomerId) {
    customFields.push({ id: CRM_CUSTOM_FIELDS.stripe_customer_id, field_value: stripeCustomerId })
  }
  if (stripeSubscriptionId) {
    customFields.push({
      id: CRM_CUSTOM_FIELDS.stripe_subscription_id,
      field_value: stripeSubscriptionId,
    })
  }

  try {
    const res = await fetch(`${CRM_API}/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ customFields }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(
        `[crm-billing-link] writeStripeIdsToCrmContact failed ${res.status} for ${contactId}: ${errText.slice(0, 300)}`,
      )
      return false
    }
    return true
  } catch (err) {
    console.error('[crm-billing-link] writeStripeIdsToCrmContact threw:', err)
    return false
  }
}

/**
 * Apply a lifecycle tag based on Stripe subscription status. Removes any
 * other lifecycle tags first so only one is set at a time.
 */
export async function applyLifecycleTag(args: {
  contactId: string
  stripeStatus: string
}): Promise<boolean> {
  const { contactId, stripeStatus } = args
  if (!contactId) return false

  const targetTag = (LIFECYCLE_TAGS as Record<string, string>)[stripeStatus]
  if (!targetTag) {
    // Unknown status — skip (don't clobber existing tags)
    return false
  }

  const pit = getMasterPit()
  if (!pit) return false

  // Remove all other lifecycle tags, then add the target.
  const tagsToRemove = ALL_LIFECYCLE_TAGS.filter((t) => t !== targetTag)

  try {
    // Best-effort: remove the other lifecycle tags. CRM API tolerates
    // removing tags that don't exist on the contact.
    if (tagsToRemove.length > 0) {
      await fetch(`${CRM_API}/contacts/${contactId}/tags`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${pit}`,
          Version: CRM_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags: tagsToRemove }),
      }).catch((err) => {
        console.warn(
          `[crm-billing-link] tag remove threw for ${contactId}: ${err instanceof Error ? err.message : 'unknown'}`,
        )
      })
    }

    const addRes = await fetch(`${CRM_API}/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags: [targetTag] }),
    })

    if (!addRes.ok) {
      const errText = await addRes.text().catch(() => '')
      console.error(
        `[crm-billing-link] applyLifecycleTag add failed ${addRes.status} for ${contactId}: ${errText.slice(0, 300)}`,
      )
      return false
    }
    return true
  } catch (err) {
    console.error('[crm-billing-link] applyLifecycleTag threw:', err)
    return false
  }
}
