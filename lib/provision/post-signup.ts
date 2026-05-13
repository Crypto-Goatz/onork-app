/**
 * Shared post-signup provisioning. Called by both:
 *   - POST /api/auth/signup     (email/password flow)
 *   - GET  /auth/callback       (OAuth flow — Google, LinkedIn, Slack)
 *
 * Idempotent. Safe to call multiple times for the same user.
 *
 * Steps:
 *   1. Ensure a profiles row exists (may already exist from handle_new_user
 *      trigger or from an earlier run).
 *   2. Mint or reuse a 0n_ access token on the profile.
 *   3. Family-location match — if the email's domain belongs to a known
 *      family sub-account, link the profile to that location instead of
 *      provisioning a new one.
 *   4. Create a CRM contact in the right location (family or master).
 *   5. Kick off CRM sub-location provisioning in the background for non-family
 *      users (or mint a location-token for family users).
 *   6. Insert an onboarding_events row so we have a per-user audit trail.
 *
 * What this does NOT do:
 *   - Sign the user in (caller handles session establishment)
 *   - Send any email (left to GHL workflows)
 */

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { findFamilyMatch } from '@/lib/family-locations'
import { getPitForLocation } from '@/lib/crm'
import { ensureLocationInstall } from '@/lib/crm/location-token'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const MASTER_LOCATION_ID = 'nphConTwfHcVE1oA0uep'
const MASTER_PIT = process.env.CRM_PIT_RAW || 'pit-f5f41b5a-32e4-4aee-84f4-a130cd3aad91'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const trimmed = (fullName || '').trim()
  if (!trimmed) return { firstName: 'User', lastName: '' }
  const parts = trimmed.split(/\s+/)
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || '',
  }
}

export interface ProvisionInput {
  userId: string
  email: string
  fullName?: string | null
  company?: string | null
  website?: string | null
  /** Where the user came from — '0ncore-signup', 'oauth-google', etc. */
  source?: string
}

export interface ProvisionResult {
  ok: true
  userId: string
  /** 0n_ token for this user's profile */
  token: string
  /** CRM location they were linked into (family) or new sub-location (queued) */
  crmLocationId: string | null
  /** True if family-match — they already share an existing sub-account */
  familyMatched: boolean
  familyLocationName: string | null
  vip: boolean
  /** CRM contact id created (null if creation failed) */
  crmContactId: string | null
  /** Whether the profile was already provisioned (idempotent re-run) */
  alreadyProvisioned: boolean
}

export async function postSignupProvision(
  input: ProvisionInput,
): Promise<ProvisionResult> {
  const sb = admin()

  // 1. Profile — get current state (handle_new_user trigger may have already created it)
  const { data: existing } = await sb
    .from('profiles')
    .select(
      'id, access_token, crm_location_id, crm_contact_id, provisioned_at, plan, tier_level',
    )
    .eq('id', input.userId)
    .maybeSingle()

  const alreadyProvisioned = !!existing?.provisioned_at
  const token = existing?.access_token || `0n_${crypto.randomBytes(24).toString('hex')}`

  // 2. Family match
  const family = findFamilyMatch(input.email)
  const familyLocationId = family?.location.locationId || null
  const familyLocationName = family?.location.name || null
  const familyVip = !!family?.location.vip

  const targetLocation = familyLocationId || existing?.crm_location_id || null

  // 3. Upsert profile with all known data — onboarding flags untouched
  await sb
    .from('profiles')
    .upsert(
      {
        id: input.userId,
        email: input.email,
        full_name: input.fullName || null,
        company: input.company || familyLocationName || null,
        access_token: token,
        tier_level: existing?.tier_level ?? (familyVip ? 99 : 0),
        plan: existing?.plan || family?.location.defaultPlan || (familyVip ? 'enterprise' : 'free'),
        business_name: input.company || familyLocationName || null,
        website: input.website || null,
        crm_location_id: targetLocation,
      },
      { onConflict: 'id' },
    )

  // 4. CRM contact (only if we don't already have one)
  let crmContactId: string | null = existing?.crm_contact_id || null
  if (!crmContactId) {
    const { firstName, lastName } = splitName(input.fullName)
    const contactLocationId = familyLocationId || MASTER_LOCATION_ID
    const contactPit = familyLocationId
      ? getPitForLocation(familyLocationId) || MASTER_PIT
      : MASTER_PIT
    const contactTags = familyVip
      ? ['0n User', 'VIP', 'Family']
      : family
        ? ['0n User', 'Family Signup', family.location.name.replace(/\s+/g, '-')]
        : ['0n User', 'Trial', 'Signup']

    try {
      const res = await fetch(`${CRM_API}/contacts/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${contactPit}`,
          Version: CRM_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email: input.email,
          tags: contactTags,
          source: input.source || '0ncore-signup',
          companyName: input.company || familyLocationName || '',
          locationId: contactLocationId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        crmContactId = data?.contact?.id || data?.id || null
        if (crmContactId) {
          await sb
            .from('profiles')
            .update({ crm_contact_id: crmContactId })
            .eq('id', input.userId)
        }
      } else {
        const errText = await res.text().catch(() => '')
        console.error(
          `[post-signup] CRM contact creation failed ${res.status}:`,
          errText.slice(0, 200),
        )
      }
    } catch (err) {
      console.error('[post-signup] CRM contact threw:', err)
    }
  }

  // 5. Sub-location provisioning OR location-token mint
  //
  // CHANGED 2026-05-13: non-family users no longer auto-provision a
  // sub-location. They claim it on demand via /api/workspace/claim.
  // Rationale: free-tier seat hygiene + cleaner conversion signal +
  // failure isolation. The lead is already in the master CRM (step 4)
  // and gets the welcome workflow either way. See ADR / Mike's call.
  if (familyLocationId) {
    ensureLocationInstall(familyLocationId)
      .then((m) =>
        console.log(`[post-signup] location-token mint ${familyLocationId}: ${m.source}`),
      )
      .catch((err) =>
        console.error(`[post-signup] location-token mint threw:`, err),
      )
  }

  // 6. Audit row (idempotent on signup_complete)
  if (!alreadyProvisioned) {
    await sb.from('onboarding_events').insert({
      user_id: input.userId,
      step: 'signup_complete',
      metadata: {
        email: input.email,
        source: input.source || '0ncore-signup',
        has_website: !!input.website,
        has_company: !!input.company,
        crm_contact_id: crmContactId,
        family_match: family
          ? {
              location: familyLocationName,
              location_id: familyLocationId,
              by: family.matchedBy,
              vip: familyVip,
            }
          : null,
      },
    })
  }

  return {
    ok: true,
    userId: input.userId,
    token,
    crmLocationId: targetLocation,
    familyMatched: !!family,
    familyLocationName,
    vip: familyVip,
    crmContactId,
    alreadyProvisioned,
  }
}
