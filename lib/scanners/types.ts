/**
 * Shared types for the Ultimate Report Builder.
 *
 * Every scanner exports a function that accepts ScanInput and returns
 * ScanOutput<T>. The aggregator collects results into a ReportResult bundle.
 */

export type ScannerSlug =
  | 'crm_stack'        // ⭐ marketing/CRM/email/analytics stack detection
  | 'tech_stack'       // platform / framework / CDN / hosting
  | 'sxo_living_dom'   // 5-pillar SXO score
  | 'ai_readiness'     // ChatGPT / Perplexity / Claude / AI Overviews visibility
  | 'step_by_step'     // Groq-generated copy-paste fix plan
  | 'schema_audit'     // structured data presence + completeness
  | 'performance'      // Core Web Vitals + PageSpeed
  | 'security_headers' // HSTS / CSP / X-Frame-Options / etc.
  | 'robots_llms'      // robots.txt + llms.txt audit for AI crawlers
  | 'content_depth'    // word count, heading structure, media ratio
  | 'competitors'      // similar sites in the niche
  | 'backlink_gap'     // external citations
  | 'local_seo'        // GBP, NAP, local citations

export interface ScanInput {
  url: string
  domain: string
  /** Pre-fetched HTML when available — saves a round-trip for chained scanners. */
  html?: string
  /** Pre-fetched response headers when available. */
  headers?: Record<string, string>
}

export interface ScanOutput<T = unknown> {
  scanner: ScannerSlug
  ok: boolean
  duration_ms: number
  data?: T
  error?: string
  /** Optional human-readable summary line for the dashboard list view. */
  summary?: string
  /** Optional 0-100 score this scanner contributed. */
  score?: number
}

export interface ReportRequest {
  url: string
  scanners: ScannerSlug[]
  /** Optional contact ID — when set, results can be auto-emailed via CRM. */
  contact_id?: string
  /** Free-form label for sales/admin tracking. */
  label?: string
}

export interface ReportResult {
  id: string
  url: string
  domain: string
  requested_at: string
  duration_ms: number
  scanners: ScannerSlug[]
  results: ScanOutput[]
  /** Aggregate 0-100 score across all scoring scanners. */
  composite_score?: number
}

export interface ScannerMeta {
  slug: ScannerSlug
  name: string
  /** One-sentence description shown in the builder UI. */
  description: string
  category: 'stack' | 'sxo' | 'technical' | 'content' | 'competitive'
  /** Approximate runtime in seconds — UI uses this to set expectations. */
  estimated_seconds: number
  /** Which scanners this one needs to run first (e.g. step_by_step needs sxo). */
  requires?: ScannerSlug[]
  /** Pro-tier or always-free? */
  tier: 'free' | 'pro' | 'agency'
  /** Implementation status — UI dims unimplemented scanners. */
  status: 'live' | 'beta' | 'planned'
}
