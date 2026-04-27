/**
 * K-Layer S2 — Execution Authorization
 *
 * Controls WHAT a verified user can do based on their plan/tier.
 * Runs after S1 identity verification. Never exposed in UI.
 *
 * - VIP and admin bypass ALL gates
 * - Permissions checked via plan tier + purchased add-ons
 * - Wildcard matching: 'crm.*' matches 'crm.contacts.read'
 * - Returns upgrade path when unauthorized
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { IdentityResult } from './s1-identity'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Plan → permissions mapping
const TIER_PERMISSIONS: Record<string, string[]> = {
  free: [
    'crm.contacts.read', 'crm.conversations.read', 'crm.pipeline.read',
    'ai.chat', 'ai.compose.basic',
    'market_intel.skills.read', 'market_intel.trends.read',
    'profile.read', 'profile.update',
  ],
  starter: [
    'crm.contacts.read', 'crm.contacts.write', 'crm.conversations.read', 'crm.conversations.write',
    'crm.pipeline.read', 'crm.pipeline.write', 'crm.calendar.read', 'crm.calendar.write',
    'ai.chat', 'ai.compose.all', 'ai.execute.basic',
    'automations.read', 'automations.run.basic',
    'market_intel.skills.read', 'market_intel.trends.read',
    'market_intel.profiles.write', 'market_intel.matches.read',
    'linkedin.compose', 'linkedin.queue',
    'wordpress.read',
    'profile.read', 'profile.update',
  ],
  pro: [
    'crm.*', 'ai.*', 'automations.*', 'market_intel.*',
    'linkedin.*', 'wordpress.*', 'freelancer.*', 'addons.*', 'sheets.*',
    'profile.*',
  ],
  unlimited: ['*'],
  enterprise: ['*'],
  penthouse: ['*'],
}

// Add-on → extra permissions
const ADDON_PERMISSIONS: Record<string, string[]> = {
  'linkedin-scraper-pro': ['linkedin.scrape', 'linkedin.export', 'linkedin.auto_post', 'linkedin.auto_comment'],
  'ai-composer-pro': ['ai.compose.all', 'ai.voice_profile', 'ai.council'],
  'crm-sync': ['crm.sync', 'crm.bulk_operations'],
  'site-manager': ['wordpress.*', 'hipaa.scan', 'cro9.run'],
  'market-intel-pro': ['market_intel.ai_matches', 'market_intel.build_suggestions', 'market_intel.competitor'],
}

export interface AuthzResult {
  authorized: boolean
  reason?: string
  requiredPlan?: string
  requiredAddon?: string
}

export async function checkAuthorization(
  userId: string,
  action: string,
  plan: string,
  isAdmin: boolean,
  isVip: boolean,
): Promise<AuthzResult> {
  // VIP and admin bypass ALL gates — always
  if (isAdmin || isVip) {
    logAuthz(userId, action, true, 'vip_bypass')
    return { authorized: true }
  }

  // Get plan permissions
  const planPerms = TIER_PERMISSIONS[plan] || TIER_PERMISSIONS.free

  // Check plan access
  if (hasPermission(planPerms, action)) {
    logAuthz(userId, action, true, 'plan')
    return { authorized: true }
  }

  // Check add-ons
  const { data: addons } = await supabase
    .from('user_addons')
    .select('addon_slug')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (addons) {
    for (const addon of addons) {
      const addonPerms = ADDON_PERMISSIONS[addon.addon_slug] || []
      if (hasPermission(addonPerms, action)) {
        logAuthz(userId, action, true, `addon:${addon.addon_slug}`)
        return { authorized: true }
      }
    }
  }

  // Not authorized — determine what they need
  const requiredPlan = findRequiredPlan(action)
  const requiredAddon = findRequiredAddon(action)

  logAuthz(userId, action, false, `needs:${requiredPlan || requiredAddon || 'unknown'}`)

  return {
    authorized: false,
    reason: requiredPlan
      ? `This feature requires the ${requiredPlan} plan.`
      : requiredAddon
      ? `This feature requires the ${requiredAddon} add-on.`
      : 'This feature is not available on your current plan.',
    requiredPlan: requiredPlan || undefined,
    requiredAddon: requiredAddon || undefined,
  }
}

function hasPermission(perms: string[], action: string): boolean {
  if (perms.includes('*')) return true
  if (perms.includes(action)) return true
  // Wildcard: 'crm.*' matches 'crm.contacts.read'
  const parts = action.split('.')
  for (let i = parts.length - 1; i > 0; i--) {
    const wildcard = parts.slice(0, i).join('.') + '.*'
    if (perms.includes(wildcard)) return true
  }
  return false
}

function findRequiredPlan(action: string): string | null {
  for (const [plan, perms] of Object.entries(TIER_PERMISSIONS)) {
    if (plan === 'free') continue // don't suggest free
    if (hasPermission(perms, action)) return plan
  }
  return null
}

function findRequiredAddon(action: string): string | null {
  for (const [addon, perms] of Object.entries(ADDON_PERMISSIONS)) {
    if (hasPermission(perms, action)) return addon
  }
  return null
}

function logAuthz(userId: string, action: string, success: boolean, reason: string) {
  try {
    supabase.from('k_layer_logs').insert({
      user_id: userId,
      layer: 's2',
      action,
      success,
      reason,
      timestamp: new Date().toISOString(),
    })
  } catch {}
}

/**
 * Combined S1 + S2 wrapper. Verifies identity AND checks permission for a specific action.
 * Usage: export const POST = withAuth('linkedin.compose', async (req, identity) => { ... })
 */
export function withAuth(
  action: string,
  handler: (req: NextRequest, identity: IdentityResult) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const { verifyIdentity } = await import('./s1-identity')
    const identity = await verifyIdentity(req)
    if (!identity.verified) {
      return NextResponse.json({ error: identity.error }, { status: 401 })
    }

    const authz = await checkAuthorization(
      identity.userId!,
      action,
      identity.plan || 'free',
      identity.isAdmin,
      identity.isVip,
    )

    if (!authz.authorized) {
      return NextResponse.json({
        error: authz.reason,
        upgrade: authz.requiredPlan ? `/pricing?plan=${authz.requiredPlan}` : undefined,
        addon: authz.requiredAddon ? `/addons/${authz.requiredAddon}` : undefined,
      }, { status: 403 })
    }

    return handler(req, identity)
  }
}
