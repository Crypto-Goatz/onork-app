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
import { provisionSubLocation } from '@/lib/provision'
import { generateProfileToken } from '@/lib/0n-token'

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
  /** Caller should wrap kickOffBackgroundProvision(userId) in after() */
  needsBackgroundProvision: boolean
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
  // Reuse an existing VALID token; the raw `0n_<hex>` format used before never
  // passed validation. A proper `0n_live_…` token is minted after the upsert
  // (generateProfileToken needs the row to exist).
  const hasValidToken = !!existing?.access_token && existing.access_token.startsWith('0n_live_')
  let token = hasValidToken ? existing!.access_token! : ''

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

  // Mint a proper 0n_live_ token now that the profile row exists (fixes the
  // old raw-hex tokens that never validated against the auth system).
  if (!hasValidToken) {
    try {
      token = await generateProfileToken(input.userId)
    } catch (err) {
      console.error('[post-signup] token mint failed:', err)
    }
  }

  // 4. CRM contact (only if we don't already have one)
  let crmContactId: string | null = existing?.crm_contact_id || null
  if (!crmContactId) {
    const { firstName, lastName } = splitName(input.fullName)
    const contactLocationId = familyLocationId || MASTER_LOCATION_ID
    const contactPit = familyLocationId
      ? getPitForLocation(familyLocationId) || MASTER_PIT
      : MASTER_PIT
    const contactTags = familyVip
      ? ['0n User', 'VIP', 'Family', 'signed-up']
      : family
        ? ['0n User', 'Family Signup', family.location.name.replace(/\s+/g, '-'), 'signed-up']
        : ['0n User', 'Trial', 'Signup', 'signed-up']

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

  // 4b. GUARANTEE the "signed-up" conversion is tagged + tracked on EVERY signup.
  // New contacts already include the tag at creation; this also covers re-runs /
  // pre-existing contacts, and records the conversion so it's visible to us + CRO9.
  if (crmContactId) {
    const tagPit = familyLocationId
      ? getPitForLocation(familyLocationId) || MASTER_PIT
      : MASTER_PIT
    try {
      await fetch(`${CRM_API}/contacts/${crmContactId}/tags`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tagPit}`, Version: CRM_VERSION, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: ['signed-up'] }),
      })
    } catch (err) {
      console.error('[post-signup] signed-up tag failed:', err)
    }
  }

  // Track the signup as a CRO9 conversion — durable, reportable, CRO9 reads it.
  if (!alreadyProvisioned) {
    const { error: convErr } = await sb.from('cro9_events').insert({
      site_slug: '0ncore',
      session_id: `signup:${input.userId}`,
      event_type: 'conversion',
      path: '/signup',
      metadata: {
        kind: 'signup',
        email: input.email,
        crm_contact_id: crmContactId,
        crm_synced: !!crmContactId,
        source: input.source || '0ncore-signup',
        tag: 'signed-up',
      },
    })
    if (convErr) console.error('[post-signup] cro9 conversion log failed:', convErr.message)
  }

  // 5. Sub-location provisioning OR location-token mint
  //
  // CHANGED 2026-05-15 (reversed 2026-05-13 decision): non-family users
  // now auto-provision a sub-location in the background at signup.
  // Rationale: 73% claim-drop on the manual "claim your workspace"
  // button (38 of 52 users). Auto-provisioning at signup + polling UI
  // on /welcome closes the gap. Sub-location creation takes ~15-20s, so
  // we fire-and-forget here and let the /welcome page poll
  // /api/profile/provision-status.
  if (familyLocationId) {
    // Family users share an existing location — just ensure the
    // location-token is installed. No new sub-location created.
    ensureLocationInstall(familyLocationId)
      .then((m) =>
        console.log(`[post-signup] location-token mint ${familyLocationId}: ${m.source}`),
      )
      .catch((err) =>
        console.error(`[post-signup] location-token mint threw:`, err),
      )
  } else if (!existing?.crm_location_id) {
    // Non-family users — stamp provisioning_started_at so the polling UI
    // shows "in progress" immediately. The actual provisionSubLocation()
    // call is fired by the route handler via after() (next/server) so the
    // Vercel lambda stays alive past the response — fire-and-forget DOES
    // NOT work on serverless (lambda dies on response, killing the
    // background promise). Return needsBackgroundProvision: true to signal
    // the caller to wrap kickOffBackgroundProvision in after().
    try {
      await sb
        .from('profiles')
        .update({
          provisioning_started_at: new Date().toISOString(),
          provisioning_error: null,
        })
        .eq('id', input.userId)
    } catch (err) {
      console.error('[post-signup] failed to stamp provisioning_started_at:', err)
    }
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
    // Non-family, no existing location → caller MUST kick off provisioning
    // via after() so the Vercel lambda stays alive past the response.
    needsBackgroundProvision: !familyLocationId && !existing?.crm_location_id,
  }
}

/**
 * Kicks off CRM sub-location provisioning for a non-family user.
 * MUST be wrapped in `after()` from 'next/server' by the route handler so
 * the Vercel lambda stays alive past the HTTP response. Fire-and-forget
 * from inside lib code does NOT work — the lambda dies on response and
 * the background promise never completes.
 *
 * Writes profiles.provisioning_error on failure. provisionSubLocation()
 * itself writes crm_location_id + provisioned_at on success.
 */
export async function kickOffBackgroundProvision(userId: string): Promise<void> {
  const sb = admin()
  try {
    const result = await provisionSubLocation(userId)
    // A deliberate skip is not a failure. Writing provisioning_error here would
    // make the smoke suite's own synthetic account show up as a broken signup on
    // the admin page — a red that means "working as designed".
    if (result.skipped) {
      console.log(`[post-signup] background provision SKIPPED for ${userId}: ${result.errors[0] || 'synthetic account'}`)
      return
    }
    if (result.success) {
      console.log(
        `[post-signup] background provision OK for ${userId}: ${result.locationId}`,
      )
    } else {
      const errMsg = result.errors.join('; ').slice(0, 1000) || 'unknown failure'
      console.error(`[post-signup] background provision failed ${userId}:`, errMsg)
      try {
        await sb
          .from('profiles')
          .update({ provisioning_error: errMsg })
          .eq('id', userId)
      } catch (writeErr) {
        console.error('[post-signup] failed to write provisioning_error:', writeErr)
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[post-signup] background provision threw ${userId}:`, errMsg)
    try {
      await sb
        .from('profiles')
        .update({ provisioning_error: errMsg.slice(0, 1000) })
        .eq('id', userId)
    } catch (writeErr) {
      console.error('[post-signup] failed to write provisioning_error:', writeErr)
    }
  }
}
