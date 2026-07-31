/**
 * The 0nCore business profile — types, completeness, and the readiness gate.
 *
 * This record is the INPUT to generation. A LinkedIn bio, a company page, a cover
 * image, a website's about section — all of it is written from here. Which means
 * the quality of what comes out is capped by what is actually filled in, and the
 * honest thing to do is say so before generating rather than after.
 *
 * Hence `readiness()`. Generation refuses to run on a profile too thin to produce
 * something truthful: writing a CEO's LinkedIn bio from a name and a job title
 * means inventing the rest, and invented professional history is the single worst
 * possible output of this feature. It goes on a real person's public profile.
 */

export interface BusinessProfile {
  id?: string
  user_id?: string

  legal_name?: string | null
  trading_name?: string | null
  tagline?: string | null
  founded_year?: number | null
  industry?: string | null
  company_size?: string | null

  short_description?: string | null
  long_description?: string | null
  value_proposition?: string | null
  target_audience?: string | null
  differentiators?: string[] | null

  email?: string | null
  phone?: string | null
  website?: string | null
  address_line1?: string | null
  city?: string | null
  region?: string | null
  postal_code?: string | null
  country?: string | null
  service_areas?: string[] | null
  is_service_area_business?: boolean

  logo_url?: string | null
  logo_variants?: Record<string, string>
  colors?: Record<string, string>
  fonts?: Record<string, string>
  brand_voice?: string | null

  socials?: Record<string, string>
  extras?: Record<string, unknown>
}

export interface BusinessPerson {
  id?: string
  user_id?: string
  business_id?: string | null
  full_name: string
  role_title?: string | null
  email?: string | null
  phone?: string | null
  headshot_url?: string | null
  bio_short?: string | null
  bio_long?: string | null
  linkedin_url?: string | null
  socials?: Record<string, string>
  is_primary?: boolean
  sort_order?: number
  extras?: Record<string, unknown>
}

/** Weighted so the fields generation actually depends on carry the most. */
const FIELD_WEIGHTS: { key: keyof BusinessProfile; label: string; weight: number }[] = [
  { key: 'trading_name', label: 'Business name', weight: 12 },
  { key: 'short_description', label: 'What you do, in a sentence', weight: 14 },
  { key: 'industry', label: 'Industry', weight: 8 },
  { key: 'value_proposition', label: 'Why people choose you', weight: 12 },
  { key: 'target_audience', label: 'Who you serve', weight: 10 },
  { key: 'differentiators', label: 'What makes you different', weight: 10 },
  { key: 'long_description', label: 'The longer story', weight: 8 },
  { key: 'website', label: 'Website', weight: 6 },
  { key: 'logo_url', label: 'Logo', weight: 8 },
  { key: 'colors', label: 'Brand colours', weight: 6 },
  { key: 'brand_voice', label: 'How you sound', weight: 6 },
]

function filled(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v as object).length > 0
  return true
}

export interface Completeness {
  percent: number
  missing: { label: string; weight: number }[]
}

export function completeness(p: BusinessProfile): Completeness {
  let have = 0
  let total = 0
  const missing: { label: string; weight: number }[] = []

  for (const f of FIELD_WEIGHTS) {
    total += f.weight
    if (filled(p[f.key])) have += f.weight
    else missing.push({ label: f.label, weight: f.weight })
  }

  missing.sort((a, b) => b.weight - a.weight)
  return { percent: Math.round((have / total) * 100), missing }
}

export type GenerationKind =
  | 'linkedin_personal'
  | 'linkedin_company'
  | 'company_boilerplate'
  | 'cover_image_brief'

export interface Readiness {
  ready: boolean
  /** Written for the person, naming what to add and why it matters. */
  blockers: string[]
  percent: number
}

/**
 * Can we honestly generate this thing yet?
 *
 * Each kind names the fields it genuinely cannot fake. `linkedin_personal` is the
 * strictest on purpose — it publishes claims about a named human being.
 */
export function readiness(
  kind: GenerationKind,
  profile: BusinessProfile,
  person?: BusinessPerson,
): Readiness {
  const { percent } = completeness(profile)
  const blockers: string[] = []

  const needProfile = (key: keyof BusinessProfile, why: string) => {
    if (!filled(profile[key])) blockers.push(why)
  }

  if (kind === 'linkedin_personal') {
    if (!person) {
      blockers.push('Pick which person this profile is for.')
    } else {
      if (!filled(person.full_name)) blockers.push('That person needs a name.')
      if (!filled(person.role_title))
        blockers.push('Add their role — without it the bio would be inventing their job.')
    }
    needProfile('trading_name', 'Add your business name.')
    needProfile('short_description', 'Add one sentence on what the business does.')
    needProfile('industry', 'Add your industry so the language fits the field.')
  }

  if (kind === 'linkedin_company') {
    needProfile('trading_name', 'Add your business name.')
    needProfile('short_description', 'Add one sentence on what the business does.')
    needProfile('value_proposition', 'Add why people choose you — the page is mostly this.')
    needProfile('target_audience', 'Add who you serve.')
  }

  if (kind === 'company_boilerplate') {
    needProfile('trading_name', 'Add your business name.')
    needProfile('short_description', 'Add one sentence on what the business does.')
  }

  if (kind === 'cover_image_brief') {
    needProfile('trading_name', 'Add your business name.')
    needProfile('colors', 'Add your brand colours — the image is built from them.')
  }

  return { ready: blockers.length === 0, blockers, percent }
}

/**
 * The prompt context. Only fields that are actually present are included —
 * sending empty keys invites the model to fill them in, which is exactly the
 * fabrication this whole design is trying to avoid.
 */
export function promptContext(profile: BusinessProfile, person?: BusinessPerson): string {
  const lines: string[] = []
  const add = (label: string, v: unknown) => {
    if (!filled(v)) return
    lines.push(`${label}: ${Array.isArray(v) ? (v as string[]).join(', ') : String(v)}`)
  }

  add('Business name', profile.trading_name || profile.legal_name)
  add('Tagline', profile.tagline)
  add('Industry', profile.industry)
  add('Founded', profile.founded_year)
  add('Company size', profile.company_size)
  add('What it does', profile.short_description)
  add('Longer description', profile.long_description)
  add('Why people choose it', profile.value_proposition)
  add('Who it serves', profile.target_audience)
  add('What makes it different', profile.differentiators)
  add('Website', profile.website)
  add('Brand voice', profile.brand_voice)
  if (profile.is_service_area_business) add('Service areas', profile.service_areas)
  else add('Location', [profile.city, profile.region, profile.country].filter(Boolean).join(', '))

  if (person) {
    lines.push('---')
    add('Person', person.full_name)
    add('Their role', person.role_title)
    add('Existing short bio', person.bio_short)
    add('Existing long bio', person.bio_long)
  }

  return lines.join('\n')
}
