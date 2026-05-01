/**
 * Fiverr field character limits — single source of truth.
 *
 * Fiverr changes these occasionally; the constant gets bumped when
 * their UI does. Mirrored from docs/fiverr-generator-and-stack-scanner-spec.md
 * §2.3.
 *
 * Used by:
 *   - server: /api/fiverr/generate retries the model up to 2x if any
 *     section overshoots
 *   - client: extension Compose tab renders live char counts; over-limit
 *     fields get a red border and the section's Copy button is disabled
 */

export const FIVERR_LIMITS = {
  title: 80, // "I will…" gig title
  description: 1200,
  tags: { count: 5, chars_per_tag: 20 },
  package_name: 35,
  package_description: 100,
  buyer_requirement: 400,
  faq_question: 100,
  faq_answer: 300,
} as const

export const TONES = ['authoritative', 'friendly', 'technical', 'bold'] as const
export type Tone = (typeof TONES)[number]

export const TIERS = ['basic', 'standard', 'premium'] as const
export type Tier = (typeof TIERS)[number]

/**
 * Validate generated sections against char limits. Returns a list of
 * field paths that overshot — the caller decides whether to retry the
 * model or surface a soft warning.
 */
export interface FiverrSections {
  title?: string
  category?: { category?: string; subcategory?: string }
  tags?: string[]
  description?: string
  basic?: PackageSection
  standard?: PackageSection
  premium?: PackageSection
  requirements?: string[]
  faq?: Array<{ q: string; a: string }>
  image_prompt?: string
}

export interface PackageSection {
  name?: string
  description?: string
  delivery_days?: number
  revisions?: number
  price_usd?: number
}

export function validateSections(s: FiverrSections): string[] {
  const out: string[] = []
  const len = (v: unknown) => (typeof v === 'string' ? v.length : 0)

  if (s.title && len(s.title) > FIVERR_LIMITS.title) out.push('title')
  if (s.description && len(s.description) > FIVERR_LIMITS.description) out.push('description')

  if (s.tags) {
    if (s.tags.length > FIVERR_LIMITS.tags.count) out.push('tags.count')
    for (let i = 0; i < s.tags.length; i++) {
      if (len(s.tags[i]) > FIVERR_LIMITS.tags.chars_per_tag) out.push(`tags[${i}]`)
    }
  }

  for (const tier of ['basic', 'standard', 'premium'] as const) {
    const p = s[tier]
    if (!p) continue
    if (p.name && len(p.name) > FIVERR_LIMITS.package_name) out.push(`${tier}.name`)
    if (p.description && len(p.description) > FIVERR_LIMITS.package_description) out.push(`${tier}.description`)
  }

  if (s.requirements) {
    for (let i = 0; i < s.requirements.length; i++) {
      if (len(s.requirements[i]) > FIVERR_LIMITS.buyer_requirement) out.push(`requirements[${i}]`)
    }
  }
  if (s.faq) {
    for (let i = 0; i < s.faq.length; i++) {
      if (len(s.faq[i]?.q) > FIVERR_LIMITS.faq_question) out.push(`faq[${i}].q`)
      if (len(s.faq[i]?.a) > FIVERR_LIMITS.faq_answer) out.push(`faq[${i}].a`)
    }
  }
  return out
}
