/**
 * 0n Service Packager — shared types.
 *
 * One input → 8 outputs. Each generator returns the typed shape it owns;
 * the orchestrator (packager.ts) bundles them into a ServicePackage.
 */

export type SourceType = 'url' | 'prompt' | 'mcp_registry' | 'manual'

export interface IngestResult {
  service_name: string
  service_description: string
  target_audience: string
  primary_deliverable: string
  delivery_time: string
  price_anchor_cents: number
  keywords: string[]
  category: string
  images: string[] // extracted image URLs
  raw_content: string // the fetched/source content
}

// ── Fiverr gig ─────────────────────────────────────────────────────────

export interface FiverrPackage {
  name: string // e.g. "Basic"
  title: string
  description: string // ≤100 chars
  price_usd: number
  delivery_days: number
  revisions: number
  features: string[]
}

export interface FiverrGig {
  title: string // ≤80 chars, starts with "I will"
  category: string
  subcategory: string
  service_type: string
  tags: string[] // exactly 5, each ≤20 chars
  packages: { basic: FiverrPackage; standard: FiverrPackage; premium: FiverrPackage }
  description: string // 1200-5000 chars
  requirements: string[] // 3-5
  faq: Array<{ question: string; answer: string }> // 4-6
  extras: Array<{ title: string; description: string; price_usd: number; delivery_days: number }>
  portfolio_images: Array<{ url: string; width: number; height: number }>
}

// ── Portfolio item ─────────────────────────────────────────────────────

export interface PortfolioItem {
  title: string
  subtitle: string
  description: string // 200-400 words
  features: string[] // 5-8
  pricing_display: string
  delivery_display: string
  target_audience: string
  case_study_hook: string
  cta_text: string
  cta_url: string
  cover_image: { url: string; alt: string }
  tags: string[]
}

// ── Upwork listing ─────────────────────────────────────────────────────

export interface UpworkListing {
  title: string // ≤100 chars
  overview: string // 500-2000 chars
  skills: string[]
  hourly_rate_range: { min: number; max: number }
  fixed_price_range: { min: number; max: number }
  portfolio_description: string
  proposal_template: string
}

// ── .0n marketplace app + UCP product ──────────────────────────────────

export interface OnApp {
  name: string
  slug: string
  description: string
  category: string
  version: string
  workflow: {
    trigger: { type: string; config?: Record<string, unknown> }
    steps: Array<{ id: string; type: string; config: Record<string, unknown> }>
  }
}

export interface UCPProduct {
  name: string
  slug: string
  description: string
  category: string
  price_cents: number
  fulfillment_type: string
}

// ── CRM productized service ────────────────────────────────────────────

export interface CRMService {
  pipeline: { name: string; stages: string[] }
  custom_fields: Array<{ name: string; key: string; type: string }>
  email_templates: Array<{ name: string; subject: string; body: string }>
  tags: string[]
}

// ── Landing page ───────────────────────────────────────────────────────

export interface LandingPage {
  headline: string
  subheadline: string
  hero_cta: string
  problem_section: string
  solution_section: string
  features: Array<{ title: string; description: string; icon: string }>
  pricing_section: {
    tiers: Array<{ name: string; price: string; features: string[]; cta: string }>
  }
  social_proof: string
  faq: Array<{ q: string; a: string }>
  final_cta: { headline: string; subtext: string; button: string }
  meta_title: string
  meta_description: string
  og_title: string
  og_description: string
}

// ── Social posts ───────────────────────────────────────────────────────

export interface SocialPosts {
  linkedin: { text: string; vpis_score: number; patterns_fired: string[] }
  reddit: { title: string; body: string; subreddits: string[] }
  twitter: { text: string }
}

// ── Master service package ─────────────────────────────────────────────

export interface ServicePackage {
  id?: string
  user_id?: string
  source: {
    type: SourceType
    url?: string
    prompt?: string
    mcp_server?: string
  }
  ingest: IngestResult
  outputs: {
    fiverr_gig?: FiverrGig
    portfolio_item?: PortfolioItem
    upwork_listing?: UpworkListing
    on_marketplace_app?: OnApp
    ucp_product?: UCPProduct
    crm_service?: CRMService
    landing_page?: LandingPage
    social_posts?: SocialPosts
  }
  vpis_score?: number
  status?: 'draft' | 'generated' | 'published' | 'archived'
}

export type OutputKey = keyof ServicePackage['outputs']

export const ALL_OUTPUTS: OutputKey[] = [
  'fiverr_gig',
  'portfolio_item',
  'upwork_listing',
  'on_marketplace_app',
  'ucp_product',
  'crm_service',
  'landing_page',
  'social_posts',
]
