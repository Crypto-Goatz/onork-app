/**
 * Auto-Provision CRM Sub-Location
 *
 * When a user completes onboarding, this:
 * 1. Creates a new CRM sub-location under the 0nCore agency
 * 2. Deploys the master snapshot (pipeline, custom fields, tags, KBs, workflows)
 * 3. Saves the location ID to their profile
 *
 * This is THE key function. Without a sub-location, nothing CRM-related works.
 */

import { createClient } from '@supabase/supabase-js'
import { deploySnapshot, MASTER_SNAPSHOT } from './snapshot'
import { ensureLocationInstall } from './crm/location-token'
import { writeStripeIdsToCrmContact } from './crm-billing-link'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface ProvisionResult {
  success: boolean
  locationId: string | null
  locationName: string
  snapshotDeployed: boolean
  errors: string[]
}

/**
 * Provision a new CRM sub-location for a user.
 * Called automatically when onboarding completes.
 */
export async function provisionSubLocation(userId: string): Promise<ProvisionResult> {
  const errors: string[] = []

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, business_name, crm_location_id, crm_contact_id, stripe_customer_id, stripe_subscription_id, website_scan')
    .eq('id', userId)
    .single()

  if (!profile) {
    return { success: false, locationId: null, locationName: '', snapshotDeployed: false, errors: ['Profile not found'] }
  }

  // Already has a location — don't create another
  if (profile.crm_location_id) {
    console.log(`[provision] User ${profile.email} already has location ${profile.crm_location_id}`)
    return { success: true, locationId: profile.crm_location_id, locationName: 'existing', snapshotDeployed: false, errors: [] }
  }

  // Use agency PIT to create sub-location
  const agencyPit = process.env.CRM_AGENCY_PIT_NEW || process.env.CRM_AGENCY_PIT || ''
  if (!agencyPit || !agencyPit.startsWith('pit-')) {
    return { success: false, locationId: null, locationName: '', snapshotDeployed: false, errors: ['Agency PIT not configured or invalid'] }
  }

  // Build location name from business or email
  const businessName = profile.business_name
    || (profile.website_scan as Record<string, unknown>)?.business_name as string
    || profile.email?.split('@')[0]
    || 'New Business'
  const locationName = `${businessName} — 0nCore`

  try {
    // Create the sub-location via CRM Agency API.
    // NOTE: trailing slash is REQUIRED — `/locations` returns 404, `/locations/` is the canonical endpoint.
    const createRes = await fetch(`${CRM_API}/locations/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${agencyPit}`,
        Version: CRM_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId: process.env.CRM_COMPANY_ID || '',
        name: locationName,
        email: profile.email,
        phone: '',
        address: '',
        city: '',
        state: '',
        country: 'US',
        postalCode: '',
        website: (profile.website_scan as Record<string, unknown>)?.site_url || '',
        timezone: 'America/New_York',
        settings: {
          allowDuplicateContact: false,
          allowDuplicateOpportunity: false,
        },
      }),
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      console.error(`[provision] Location creation failed: ${createRes.status}`, errText)
      errors.push(`Location creation: ${createRes.status} — ${errText.slice(0, 200)}`)
      return { success: false, locationId: null, locationName, snapshotDeployed: false, errors }
    }

    const createData = await createRes.json()
    const newLocationId = createData.location?.id || createData.id || createData.locationId

    if (!newLocationId) {
      errors.push('Location created but no ID returned')
      return { success: false, locationId: null, locationName, snapshotDeployed: false, errors }
    }

    console.log(`[provision] Location created: ${newLocationId} for ${profile.email}`)

    // Save location ID to profile IMMEDIATELY
    await supabase
      .from('profiles')
      .update({ crm_location_id: newLocationId })
      .eq('id', userId)

    // Auto-mint a marketplace location-token via the agency app. This is
    // what unlocks writes (tags, conversations, opportunities) on the new
    // sub-location WITHOUT manual PIT generation. Best-effort: if it fails
    // (agency token expired, app uninstalled), continue with snapshot deploy
    // — the verify wizard will surface and let admin fix it.
    try {
      const minted = await ensureLocationInstall(newLocationId)
      if (minted.token) {
        console.log(`[provision] Location-token minted (${minted.source}) for ${newLocationId}`)
      } else {
        console.warn(`[provision] Location-token mint failed for ${newLocationId}: ${minted.error}`)
        errors.push(`Location-token mint: ${minted.error}`)
      }
    } catch (mintErr) {
      console.error(`[provision] Location-token mint threw:`, mintErr)
      errors.push(`Location-token mint: ${mintErr instanceof Error ? mintErr.message : 'unknown'}`)
    }

    // Deploy master snapshot (pipeline, fields, tags, KBs, workflows)
    let snapshotDeployed = false
    try {
      const snapResult = await deploySnapshot(newLocationId, MASTER_SNAPSHOT, agencyPit)
      snapshotDeployed = snapResult.success
      if (snapResult.errors.length > 0) {
        console.warn(`[provision] Snapshot partial deploy:`, snapResult.errors)
        errors.push(...snapResult.errors.map(e => `Snapshot: ${e}`))
      }
      console.log(`[provision] Snapshot deployed: ${snapResult.deployed.length} items`)
    } catch (snapErr) {
      console.error(`[provision] Snapshot deploy failed:`, snapErr)
      errors.push(`Snapshot deploy: ${snapErr instanceof Error ? snapErr.message : 'unknown'}`)
    }

    // Bidirectional link: push Stripe IDs to the master-location CRM contact
    // so CRM-side workflows can react to billing state. Best-effort — webhook
    // handler will catch up later if the user hasn't checked out yet.
    try {
      if (profile.crm_contact_id && profile.stripe_customer_id) {
        const ok = await writeStripeIdsToCrmContact({
          contactId: profile.crm_contact_id,
          stripeCustomerId: profile.stripe_customer_id,
          stripeSubscriptionId: profile.stripe_subscription_id || null,
        })
        if (ok) {
          console.log(`[provision] Stripe IDs synced to CRM contact ${profile.crm_contact_id}`)
        } else {
          errors.push('Stripe→CRM link: write failed (see logs)')
        }
      } else if (!profile.crm_contact_id) {
        console.log(`[provision] No crm_contact_id yet for ${profile.email} — skipping Stripe→CRM link`)
      } else {
        console.log(`[provision] No stripe_customer_id yet for ${profile.email} — webhook will catch up`)
      }
    } catch (linkErr) {
      console.error('[provision] Stripe→CRM link threw:', linkErr)
      errors.push(`Stripe→CRM link: ${linkErr instanceof Error ? linkErr.message : 'unknown'}`)
    }

    // Log provisioning event
    await supabase.from('dashboard_notifications').insert({
      user_id: userId,
      type: 'success',
      title: 'CRM Provisioned',
      message: `Your CRM location "${locationName}" is ready. Pipeline, fields, tags, and workflows deployed.`,
      metadata: JSON.stringify({ locationId: newLocationId, snapshotDeployed }),
    })

    return { success: true, locationId: newLocationId, locationName, snapshotDeployed, errors }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[provision] Fatal error:`, msg)
    errors.push(msg)
    return { success: false, locationId: null, locationName, snapshotDeployed: false, errors }
  }
}
