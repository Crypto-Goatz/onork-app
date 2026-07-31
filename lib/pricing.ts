/**
 * 0nCore pricing tiers — single source of truth.
 *
 * Both the homepage pricing section and /pricing read from TIERS here, so the
 * two never drift. Stripe price IDs come from env; the four paid tiers map to:
 *
 *   STRIPE_PRICE_TIER_1 → Starter    ($47/mo)
 *   STRIPE_PRICE_TIER_2 → Pro        ($97/mo)
 *   STRIPE_PRICE_TIER_3 → Agency     ($297/mo)
 *   STRIPE_PRICE_TIER_4 → Enterprise ($497/mo — flat, "everything", no sales call)
 *
 * The displayed price MUST equal the real Stripe unit_amount for that env var.
 * If you change a price here, create a new Stripe price at the matching amount
 * and re-point the env var — Stripe prices are immutable.
 */

export type TierSlug = 'free' | 'starter' | 'pro' | 'agency' | 'enterprise'

export interface Tier {
  slug: TierSlug
  name: string
  price: string
  priceCents: number | null // null = free (no checkout)
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
    tagline: 'See it work in 60 seconds. No card.',
    ctaLabel: 'Start free',
    ctaHref: '/signup',
    features: [
      'Browse the full catalog — 1,640+ tools, 109 services',
      'Connect 1 service',
      '100 tool executions / month',
      'Jaxx AI in read-only mode',
      'Community support',
    ],
    limits: [
      { tag: 'Executions', value: '100/mo' },
      { tag: 'Services', value: '1' },
      { tag: 'Automations', value: '—' },
    ],
  },
  {
    slug: 'starter',
    name: 'Starter',
    price: '$47',
    priceCents: 4700,
    cadence: '/ month',
    tagline: 'For the solo operator ready to wire it up.',
    ctaLabel: 'Start with Starter',
    ctaHref: '/api/billing/subscribe?tier=starter',
    features: [
      'Everything in Free, plus —',
      'Unlimited connected services',
      '2,000 tool executions / month',
      '10 active automations',
      'Visual workflow builder',
      'Switches — save any run, replay anytime',
      'Jaxx executes your tools (not just read-only)',
      'Email support',
    ],
    limits: [
      { tag: 'Executions', value: '2,000/mo' },
      { tag: 'Services', value: 'Unlimited' },
      { tag: 'Automations', value: '10' },
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
      '15,000 tool executions / month',
      'Unlimited automations',
      'Agentic Automation Generator — outcome → plan → run',
      'CRO9 conversion engine',
      'Course Builder + Lead Magnet Loop (included)',
      'CrewAI agent crews',
      'Commerce + Stripe checkout inside Jaxx chat',
      'Priority support',
    ],
    limits: [
      { tag: 'Executions', value: '15,000/mo' },
      { tag: 'Automations', value: 'Unlimited' },
      { tag: 'AI agents', value: 'Included' },
    ],
  },
  {
    slug: 'agency',
    name: 'Agency',
    price: '$297',
    priceCents: 29700,
    cadence: '/ month',
    tagline: 'Run 0nCore as your client-delivery layer.',
    ctaLabel: 'Go Agency',
    ctaHref: '/api/billing/subscribe?tier=agency',
    features: [
      'Everything in Pro, plus —',
      'Unlimited tool executions',
      'White-label dashboard — your brand on /dashboard',
      '10 sub-accounts with full client isolation',
      'SaaS Factory — spin up a SaaS per client in one shot',
      'App Factory + Website Factory',
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
    price: '$497',
    priceCents: 49700,
    cadence: '/ month',
    tagline: 'Everything, unlimited — without the sales call.',
    ctaLabel: 'Get everything',
    ctaHref: '/api/billing/subscribe?tier=enterprise',
    features: [
      'Everything in Agency, plus —',
      'Unlimited sub-accounts',
      'Custom MCP servers + private registry',
      'SSO / SAML',
      'Dedicated Supabase + Vercel option (single-tenant)',
      'Audit log export + SOC 2 path',
      '99.9% uptime SLA',
      'Named CSM + monthly architecture reviews',
      'Early access to every new capability',
    ],
    limits: [
      { tag: 'Sub-accounts', value: 'Unlimited' },
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
