/**
 * Registry of every scanner the Ultimate Report Builder knows about.
 *
 * The UI reads this list to render checkboxes. The runner reads it to look up
 * the implementation. New scanners only need to be added here once.
 */

import type { ScannerMeta } from './types'

export const SCANNERS: ScannerMeta[] = [
  // ━━━ STACK DETECTION ━━━
  {
    slug: 'crm_stack',
    name: 'CRM + Marketing Stack',
    description:
      'Detects every CRM, email tool, analytics, chat widget, ad pixel, booking app, and payment processor on the site. The most actionable single scan for a sales call.',
    category: 'stack',
    estimated_seconds: 3,
    tier: 'free',
    status: 'live',
  },
  {
    slug: 'tech_stack',
    name: 'Tech Stack',
    description:
      'Platform (WordPress / Shopify / Webflow / Next.js), framework, CDN, hosting, plugins detected.',
    category: 'stack',
    estimated_seconds: 3,
    tier: 'free',
    status: 'beta',
  },

  // ━━━ SXO ━━━
  {
    slug: 'sxo_living_dom',
    name: 'SXO Living DOM Score',
    description:
      '5-pillar score across SEO / UX / CRO / AEO / GEO. The signature scan — same engine that scored sxowebsite.com.',
    category: 'sxo',
    estimated_seconds: 8,
    tier: 'free',
    status: 'live',
  },
  {
    slug: 'ai_readiness',
    name: 'AI Engine Readiness',
    description:
      'Per-engine visibility check: ChatGPT, Perplexity, Claude, Google AI Overviews. Identifies what AI assistants can find + cite about the site.',
    category: 'sxo',
    estimated_seconds: 10,
    tier: 'pro',
    status: 'beta',
  },
  {
    slug: 'step_by_step',
    name: 'Step-by-Step Fix Plan',
    description:
      'Groq-powered actionable fix list — copy-paste code, custom llms.txt, 30-day roadmap, expected score lift. Requires SXO Living DOM scan first.',
    category: 'sxo',
    estimated_seconds: 25,
    tier: 'pro',
    status: 'live',
    requires: ['sxo_living_dom'],
  },

  // ━━━ TECHNICAL ━━━
  {
    slug: 'schema_audit',
    name: 'Structured Data / Schema',
    description:
      'JSON-LD + microdata audit. Lists what schema types are present, what is missing for the business type, and what to add for AI Overviews.',
    category: 'technical',
    estimated_seconds: 4,
    tier: 'free',
    status: 'beta',
  },
  {
    slug: 'performance',
    name: 'Performance + Core Web Vitals',
    description:
      'PageSpeed metrics, LCP / FID / CLS, blocking resources, total page weight. Flags the 3 biggest offenders.',
    category: 'technical',
    estimated_seconds: 12,
    tier: 'free',
    status: 'planned',
  },
  {
    slug: 'security_headers',
    name: 'Security Headers',
    description:
      'HSTS, CSP, X-Frame-Options, Permissions-Policy, Referrer-Policy. Trust-signal scan that buyers will appreciate.',
    category: 'technical',
    estimated_seconds: 2,
    tier: 'free',
    status: 'beta',
  },
  {
    slug: 'robots_llms',
    name: 'Robots + llms.txt Audit',
    description:
      'Whether the site allows / blocks GPTBot, ChatGPT-User, Claude-Web, PerplexityBot, etc. — and whether llms.txt is present and well-formed.',
    category: 'technical',
    estimated_seconds: 3,
    tier: 'free',
    status: 'beta',
  },

  // ━━━ CONTENT ━━━
  {
    slug: 'content_depth',
    name: 'Content Depth + Structure',
    description:
      'Word count, heading hierarchy (H1/H2/H3), image-to-text ratio, FAQ presence, table presence. Signals the AI uses to judge authority.',
    category: 'content',
    estimated_seconds: 4,
    tier: 'free',
    status: 'beta',
  },

  // ━━━ COMPETITIVE ━━━
  {
    slug: 'competitors',
    name: 'Competitor Comparison',
    description:
      'Identifies the 5 most-similar sites and benchmarks each pillar score against them. Requires SerpAPI key.',
    category: 'competitive',
    estimated_seconds: 30,
    tier: 'agency',
    status: 'planned',
  },
  {
    slug: 'backlink_gap',
    name: 'Backlink + Citation Gap',
    description:
      'External mentions, citation strength, missing local directories. Shows where the site is invisible to discovery.',
    category: 'competitive',
    estimated_seconds: 20,
    tier: 'agency',
    status: 'planned',
  },
  {
    slug: 'local_seo',
    name: 'Local SEO Stack',
    description:
      'Google Business Profile presence, NAP consistency, local citations, review signal density. For brick-and-mortar + service-area businesses.',
    category: 'competitive',
    estimated_seconds: 8,
    tier: 'pro',
    status: 'planned',
  },
]

export function getScanner(slug: string): ScannerMeta | undefined {
  return SCANNERS.find((s) => s.slug === slug)
}

export function liveScanners(): ScannerMeta[] {
  return SCANNERS.filter((s) => s.status !== 'planned')
}
