/**
 * 0nCore pricing tiers — single source of truth.
 *
 * Stripe price IDs come from env. The same five env vars wire to:
 *   - this pricing table
 *   - /api/billing/checkout
 *   - the Stripe webhook handler
 *
 * Mapping:
 *   STRIPE_PRICE_TIER_1 → Starter
 *   STRIPE_PRICE_TIER_2 → Pro
 *   STRIPE_PRICE_TIER_3 → Agency
 *   STRIPE_PRICE_TIER_4 → Enterprise (placeholder — usually quoted custom)
 */

export type TierSlug = 'free' | 'starter' | 'pro' | 'agency' | 'enterprise'

export interface Tier {
  slug: TierSlug
  name: string
  price: string
  priceCents: number | null // null = custom/free
  cadence: string
  tagline: string
  ctaLabel: string
  ctaHref: string
  highlight?: boolean
  features: string[]
  limits: { tag: string; value: string }[]
}

export const TIERS: Tier[] = [
  {
    slug: 'free',
    name: 'Free',
    price: '$0',
    priceCents: 0,
    cadence: 'forever',
    tagline: 'Try every capability in 60 seconds. No credit card.',
    ctaLabel: 'Get started free',
    ctaHref: '/signup',
    features: [
      'Browse the full 0nMCP catalog (1,598 tools, 106 services)',
      'Connect 1 service',
      '100 tool executions / month',
      'Read-only marketplace browse',
      'Knowledge mode in Jaxx (read-only AI assistant)',
    ],
    limits: [
      { tag: 'Executions', value: '100/mo' },
      { tag: 'Connected services', value: '1' },
      { tag: 'Automations', value: '0' },
    ],
  },
  {
    slug: 'starter',
    name: 'Starter',
    price: '$29',
    priceCents: 2900,
    cadence: '/ month',
    tagline: 'For solo founders and operators ready to wire it up.',
    ctaLabel: 'Start with Starter',
    ctaHref: '/api/billing/subscribe?tier=starter',
    features: [
      'Everything in Free, plus —',
      'Unlimited connected services',
      '1,000 tool executions / month',
      '5 active automations',
      'Switches (save tool runs, replay any time)',
      'Visual workflow builder',
      'Email support',
    ],
    limits: [
      { tag: 'Executions', value: '1,000/mo' },
      { tag: 'Connected services', value: 'Unlimited' },
      { tag: 'Automations', value: '5' },
    ],
  },
  {
    slug: 'pro',
    name: 'Pro',
    price: '$97',
    priceCents: 9700,
    cadence: '/ month',
    tagline: 'The full 0nCore stack. Everything we ship lives here.',
    ctaLabel: 'Get Pro',
    ctaHref: '/api/billing/subscribe?tier=pro',
    highlight: true,
    features: [
      'Everything in Starter, plus —',
      '10,000 tool executions / month',
      'Unlimited automations',
      'Course Builder ($29/mo standalone — included)',
      'Lead Magnet Loop ($49/mo standalone — included)',
      'Jaxx with automation execution + commerce + Stripe checkout in chat',
      'Agentic Automation Generator (outcome → plan → run)',
      'CrewAI integration (50 free crew runs/mo via the free tier)',
      'Priority support',
    ],
    limits: [
      { tag: 'Executions', value: '10,000/mo' },
      { tag: 'Connected services', value: 'Unlimited' },
      { tag: 'Automations', value: 'Unlimited' },
    ],
  },
  {
    slug: 'agency',
    name: 'Agency',
    price: '$297',
    priceCents: 29700,
    cadence: '/ month',
    tagline: 'Multi-client agencies running 0nCore as their delivery layer.',
    ctaLabel: 'Go Agency',
    ctaHref: '/api/billing/subscribe?tier=agency',
    features: [
      'Everything in Pro, plus —',
      'Unlimited tool executions',
      'White-label dashboard (your brand on /dashboard)',
      '10 sub-accounts (full client isolation)',
      'SaaS Factory — provision a SaaS per client in one shot',
      'Bulk snapshot deploy across sub-accounts',
      'Client course management + revenue share',
      'Dedicated Slack channel + onboarding call',
    ],
    limits: [
      { tag: 'Executions', value: 'Unlimited' },
      { tag: 'Sub-accounts', value: '10' },
      { tag: 'White-label', value: 'Included' },
    ],
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceCents: null,
    cadence: '',
    tagline: 'Unlimited everything, dedicated infra, your terms.',
    ctaLabel: 'Talk to us',
    ctaHref: 'mailto:mike@rocketopp.com?subject=0nCore%20Enterprise',
    features: [
      'Everything in Agency, plus —',
      'Unlimited sub-accounts',
      'Dedicated Supabase + Vercel deployment (single-tenant)',
      'Custom MCP servers + private registry',
      'SSO / SAML',
      'Audit log export, SOC 2 path',
      '99.9% uptime SLA',
      'Named CSM + monthly architecture reviews',
    ],
    limits: [
      { tag: 'Tenancy', value: 'Single-tenant' },
      { tag: 'SLA', value: '99.9%' },
      { tag: 'Support', value: 'Named CSM' },
    ],
  },
]

export const TIER_TO_PRICE_ENV: Record<TierSlug, string | null> = {
  free: null,
  starter: 'STRIPE_PRICE_TIER_1',
  pro: 'STRIPE_PRICE_TIER_2',
  agency: 'STRIPE_PRICE_TIER_3',
  enterprise: 'STRIPE_PRICE_TIER_4',
}

export function getTier(slug: TierSlug): Tier | undefined {
  return TIERS.find((t) => t.slug === slug)
}

export function getStripePriceId(slug: TierSlug): string | null {
  const envKey = TIER_TO_PRICE_ENV[slug]
  if (!envKey) return null
  return process.env[envKey] ?? null
}
