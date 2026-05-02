/**
 * Plan → capability matrix.
 *
 * Single source of truth for what each tier can do. The dashboard reads
 * this to decide which sections / nav items to show, and route handlers
 * call `assertCapability(plan, 'cap')` before running anything billable.
 *
 * Free tier defaults are intentionally generous on read, gated on write
 * and on capability surfaces that consume Groq/CRM/external API quotas.
 */

import type { TierSlug } from '@/lib/pricing'

export type Capability =
  // Browse / read
  | 'view:dashboard'
  | 'view:marketplace'
  | 'view:registry'
  | 'view:platform'
  // Free-tier surfaces
  | 'use:scanner'           // Stack scanner — 5 scans/mo
  | 'use:vpis_score'        // VPIS scoring — 100 tasks/mo against platform Groq
  | 'use:fiverr_generator'  // Limited Fiverr gig generator
  | 'install:free_apps'     // One-click install for free / no-API products
  // Pro+ surfaces
  | 'use:automations'       // Visual automation builder
  | 'use:flows'             // 0nFlow time-delayed flows
  | 'use:slack_bot'         // Add Slack bot to a workspace
  | 'use:chrome_extension'  // Per-user token issued for the Chrome ext
  | 'use:linkedin_engine'   // VPIS LinkedIn posting
  | 'use:exec_dashboard'    // 0nExec
  | 'install:any_app'       // Install paid + API-required products
  // Agency+ surfaces
  | 'use:vip_provisioning'  // Spin up VIP customer accounts
  | 'use:saas_factory'      // SaaS Factory
  | 'use:white_label'       // Branded white-label
  // Admin
  | 'admin:platform'

export interface TierCapabilities {
  plan: TierSlug
  label: string
  caps: Capability[]
  /** Quotas: per-month task budgets that map to specific surfaces. */
  quotas: {
    groq_tasks: number
    scans: number
    fiverr_gigs: number
    flows: number
  }
  /** Onboarding hints surfaced as `next steps` cards. */
  onboardingActions: string[]
}

const FREE: TierCapabilities = {
  plan: 'free',
  label: 'Free',
  caps: [
    'view:dashboard',
    'view:marketplace',
    'view:registry',
    'view:platform',
    'use:scanner',
    'use:vpis_score',
    'use:fiverr_generator',
    'install:free_apps',
  ],
  quotas: {
    groq_tasks: 100,
    scans: 5,
    fiverr_gigs: 3,
    flows: 0,
  },
  onboardingActions: [
    'Connect your free Groq key for unlimited AI',
    'Run your first stack scan',
    'Generate a Fiverr gig from a scan',
    'Browse the marketplace',
  ],
}

const STARTER: TierCapabilities = {
  plan: 'starter',
  label: 'Starter',
  caps: [
    ...FREE.caps,
    'use:automations',
    'use:flows',
    'use:slack_bot',
    'use:chrome_extension',
  ],
  quotas: {
    groq_tasks: 1_000,
    scans: 50,
    fiverr_gigs: 25,
    flows: 5,
  },
  onboardingActions: [
    'Connect Slack',
    'Install the Chrome extension',
    'Build your first automation',
  ],
}

const PRO: TierCapabilities = {
  plan: 'pro',
  label: 'Pro',
  caps: [
    ...STARTER.caps,
    'use:linkedin_engine',
    'use:exec_dashboard',
    'install:any_app',
  ],
  quotas: {
    groq_tasks: 10_000,
    scans: 500,
    fiverr_gigs: 250,
    flows: 50,
  },
  onboardingActions: [
    'Connect LinkedIn',
    'Set up 0nExec',
    'Wire your full automation stack',
  ],
}

const AGENCY: TierCapabilities = {
  plan: 'agency',
  label: 'Agency',
  caps: [
    ...PRO.caps,
    'use:vip_provisioning',
    'use:saas_factory',
    'use:white_label',
  ],
  quotas: {
    groq_tasks: 10_000,
    scans: 5_000,
    fiverr_gigs: 2_500,
    flows: 500,
  },
  onboardingActions: [
    'Provision your first VIP customer',
    'Spin up a SaaS for a client',
    'Brand the white-label portal',
  ],
}

const ENTERPRISE: TierCapabilities = {
  plan: 'enterprise',
  label: 'Enterprise',
  caps: [...AGENCY.caps, 'admin:platform'],
  quotas: {
    groq_tasks: Number.MAX_SAFE_INTEGER,
    scans: Number.MAX_SAFE_INTEGER,
    fiverr_gigs: Number.MAX_SAFE_INTEGER,
    flows: Number.MAX_SAFE_INTEGER,
  },
  onboardingActions: [
    'Custom SSO + audit logging',
    'Direct integration with your CRM agency',
    'Dedicated success manager',
  ],
}

const TIER_TABLE: Record<TierSlug, TierCapabilities> = {
  free: FREE,
  starter: STARTER,
  pro: PRO,
  agency: AGENCY,
  enterprise: ENTERPRISE,
}

export function getTierCapabilities(plan: string | null | undefined): TierCapabilities {
  const slug = (plan || 'free').toLowerCase() as TierSlug
  return TIER_TABLE[slug] || FREE
}

export function hasCapability(plan: string | null | undefined, cap: Capability): boolean {
  return getTierCapabilities(plan).caps.includes(cap)
}

export function assertCapability(plan: string | null | undefined, cap: Capability): void {
  if (!hasCapability(plan, cap)) {
    throw new CapabilityDeniedError(plan || 'free', cap)
  }
}

export class CapabilityDeniedError extends Error {
  plan: string
  capability: Capability
  constructor(plan: string, cap: Capability) {
    super(`Plan "${plan}" does not include capability "${cap}". Upgrade at /pricing.`)
    this.name = 'CapabilityDeniedError'
    this.plan = plan
    this.capability = cap
  }
}
