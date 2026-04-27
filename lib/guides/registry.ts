/**
 * Build With 0n — guide registry
 *
 * Source of truth for the 8-guide series. Each entry powers:
 * - The /guides index card grid
 * - The /guides/[slug] dynamic page
 * - The "Build Guides" cross-sells in the marketplace + downloads
 */

export type GuideStatus = 'live' | 'in-progress' | 'queued'

export interface Guide {
  number: number
  slug: string
  title: string
  subtitle: string
  status: GuideStatus
  buildTime: string
  revenue: string
  keyProduct: string
  marketplaceSlug?: string  // matching marketplace_apps row, if shipped
  course?: string
  file: string  // markdown file under /content/guides/
}

export const GUIDES: Guide[] = [
  {
    number: 0,
    slug: 'series-overview',
    title: 'Build With 0n — Series Overview',
    subtitle: 'Real products. Built live. Your turn.',
    status: 'live',
    buildTime: '—',
    revenue: '—',
    keyProduct: '—',
    file: '00-series-overview.md',
  },
  {
    number: 1,
    slug: 'wordpress-ai-manager',
    title: 'WordPress AI Site Manager',
    subtitle: '43 tools. Plain English. Full site control from a chatbot.',
    status: 'live',
    buildTime: '~2 hours',
    revenue: '$29/mo per site',
    keyProduct: '0ncore-wordpress plugin (43 MCP tools)',
    course: 'Build an AI WordPress Manager in One Session',
    file: '01-wordpress-ai-site-manager.md',
  },
  {
    number: 2,
    slug: 'linkedin-vpis-engine',
    title: 'LinkedIn VPIS Content Engine',
    subtitle: 'Self-improving content scoring with gradient descent.',
    status: 'in-progress',
    buildTime: '~1 day',
    revenue: '$49–$497/mo SaaS',
    keyProduct: 'LinkedIn bot + VPIS scoring (8 factors, 35+ patterns)',
    course: 'Build an AI Social Media Engine That Gets Smarter',
    file: '02-linkedin-vpis-engine.md',
  },
  {
    number: 3,
    slug: 'hipaa-scanner',
    title: 'HIPAA Compliance Scanner',
    subtitle: '63-point scan. 30 seconds. Full report.',
    status: 'in-progress',
    buildTime: '~3 hours',
    revenue: '$149–$899 per scan',
    keyProduct: 'rocketopp.com/hipaa scanner (Tier 4 weighted scoring)',
    course: 'Build a Compliance Scanning Business in a Weekend',
    file: '03-hipaa-scanner.md',
  },
  {
    number: 4,
    slug: 'market-intel',
    title: 'Market Intelligence Platform',
    subtitle: 'Freelance demand data across 10 platforms. AI-matched opportunities.',
    status: 'queued',
    buildTime: '~1 day',
    revenue: 'Data product + lead gen',
    keyProduct: 'Market Intel pipeline + AI matcher',
    course: 'Build a Market Intelligence Tool With Public Data',
    file: '04-market-intel.md',
  },
  {
    number: 5,
    slug: 'sxo-indexer',
    title: 'SXO Auto-Indexer',
    subtitle: '900 URLs indexed in 1.08 seconds.',
    status: 'queued',
    buildTime: '~1 session',
    revenue: '$19–$199/mo',
    keyProduct: 'SXO indexer add-on',
    marketplaceSlug: 'sxo-auto-indexer',
    course: 'Build an SEO Tool That Actually Fixes Things',
    file: '05-sxo-indexer.md',
  },
  {
    number: 6,
    slug: 'automation-builder',
    title: 'AI Automation Builder',
    subtitle: '75 capabilities. 18 triggers. Visual drag-and-drop.',
    status: 'queued',
    buildTime: '~2 days',
    revenue: 'Core platform feature',
    keyProduct: '75-capability automation system',
    course: 'Build a Visual Automation Platform From Scratch',
    file: '06-automation-builder.md',
  },
  {
    number: 7,
    slug: 'crm-integration',
    title: 'CRM Integration Layer',
    subtitle: '13 dashboard pages. 51 SDK methods. Universal proxy.',
    status: 'queued',
    buildTime: '~3 days',
    revenue: 'Platform-level',
    keyProduct: '13-page CRM dashboard + proxy + OAuth',
    course: 'Build a CRM Integration That Handles Everything',
    file: '07-crm-integration.md',
  },
  {
    number: 8,
    slug: '0n-marketplace',
    title: '.0n App Marketplace',
    subtitle: 'Users build apps. Users sell apps. You take 30%.',
    status: 'queued',
    buildTime: '~2 days',
    revenue: '30% of all marketplace transactions',
    keyProduct: 'UCP + .0n format + vendor system',
    course: 'Build an App Marketplace With Built-In Revenue Share',
    file: '08-0n-marketplace.md',
  },
]

export function getGuide(slug: string): Guide | null {
  return GUIDES.find(g => g.slug === slug) || null
}

export function listLiveGuides(): Guide[] {
  return GUIDES.filter(g => g.status === 'live')
}
