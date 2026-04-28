/**
 * Fiverr gig generator + validator. Generates a complete Fiverr-shaped gig
 * from an IngestResult, then runs hard validation against Fiverr's rules.
 * Targeted rewrites kick in for any field that fails.
 */

import { groqJSON } from '../groq'
import type { FiverrGig, IngestResult } from '../types'

const SYSTEM = `You are a Fiverr conversion specialist. Generate gigs that pass Fiverr's content rules and convert. Follow EVERY constraint exactly.`

function userPrompt(input: IngestResult): string {
  return `Generate a complete Fiverr gig as JSON. Constraints:

HARD RULES:
- title: ≤80 chars, MUST start with "I will "
- exactly 5 tags, each ≤20 chars, lowercase, no special chars
- 3 packages: basic, standard, premium
  - each package description ≤100 chars
  - prices in whole USD (no cents)
  - premium ≥ 3× basic price
  - delivery_days: 1-30
  - revisions: 0-99 (use 99 for "unlimited" packages)
- description: 1200-5000 chars, must include sections: Hook, Who This Is For, What You Get, How It Works, Why Me, FAQ Tease, Order Now CTA
- 3-5 requirements (questions for the buyer)
- 4-6 FAQ items
- 2-4 extras (add-ons with title/description/price/delivery_days)
- portfolio_images: empty array (filled later from input.images)

INPUT:
service_name: ${input.service_name}
service_description: ${input.service_description}
target_audience: ${input.target_audience}
primary_deliverable: ${input.primary_deliverable}
delivery_time: ${input.delivery_time}
price_anchor_cents: ${input.price_anchor_cents} (this is your basic-tier anchor; standard ~2x, premium ~3-5x)
keywords: ${input.keywords.join(', ')}
category: ${input.category}

RAW CONTENT:
${input.raw_content.slice(0, 1500)}

Return ONLY valid JSON matching this exact shape (no markdown fences):
{
  "title": "I will ...",
  "category": "${input.category}",
  "subcategory": "...",
  "service_type": "...",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "packages": {
    "basic":    { "name":"Basic","title":"...","description":"...","price_usd":0,"delivery_days":0,"revisions":0,"features":["..."] },
    "standard": { "name":"Standard","title":"...","description":"...","price_usd":0,"delivery_days":0,"revisions":0,"features":["..."] },
    "premium":  { "name":"Premium","title":"...","description":"...","price_usd":0,"delivery_days":0,"revisions":0,"features":["..."] }
  },
  "description": "...",
  "requirements": ["...","...","..."],
  "faq": [{"question":"...","answer":"..."}],
  "extras": [{"title":"...","description":"...","price_usd":0,"delivery_days":0}],
  "portfolio_images": []
}`
}

export async function generateFiverrGig(input: IngestResult): Promise<FiverrGig> {
  const gig = await groqJSON<FiverrGig>(SYSTEM, userPrompt(input), { maxTokens: 4096 })

  // Attach images from ingest if any
  if (input.images.length > 0) {
    gig.portfolio_images = input.images.slice(0, 4).map((url) => ({ url, width: 1280, height: 720 }))
  }

  // Run targeted fixups for any constraint violations
  return await fixupGig(gig, input)
}

async function fixupGig(gig: FiverrGig, input: IngestResult): Promise<FiverrGig> {
  const errors = validateFiverrGig(gig).errors
  if (errors.length === 0) return gig

  // Title fix
  if (errors.some((e) => e.includes('title'))) {
    gig.title = await rewriteField(
      'Fiverr gig title',
      `Rewrite this Fiverr title to be ≤80 chars and START WITH "I will ". Service: ${input.service_name}. Current: "${gig.title}". Return only the new title, nothing else.`
    )
  }

  // Tags fix
  if (errors.some((e) => e.includes('tags'))) {
    const fixed = await rewriteField(
      'Fiverr tags',
      `Generate exactly 5 Fiverr tags for "${input.service_name}". Each ≤20 chars, lowercase, no special chars. Return as JSON array of 5 strings, nothing else.`
    )
    try {
      const parsed = JSON.parse(fixed.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()) as string[]
      if (Array.isArray(parsed) && parsed.length === 5) gig.tags = parsed
    } catch {
      // leave as-is; validator will surface
    }
  }

  // Package descriptions over 100
  for (const key of ['basic', 'standard', 'premium'] as const) {
    if (gig.packages[key].description.length > 100) {
      gig.packages[key].description = (await rewriteField(
        `${key} package description`,
        `Rewrite this Fiverr package description to ≤100 chars: "${gig.packages[key].description}". Return only the new text.`
      )).trim().slice(0, 100)
    }
  }

  return gig
}

async function rewriteField(label: string, prompt: string): Promise<string> {
  const { groqText } = await import('../groq')
  return (await groqText(`You are rewriting a single ${label}. Be terse and constraint-faithful.`, prompt)).trim()
}

// ──────────────────────────────────────────────────────────────────────
// Validator
// ──────────────────────────────────────────────────────────────────────

export interface FiverrValidation {
  valid: boolean
  errors: string[]
}

const REQUIRED_SECTIONS = ['who this is for', 'what you get', 'how it works']

export function validateFiverrGig(gig: FiverrGig): FiverrValidation {
  const errors: string[] = []

  if (!gig.title) errors.push('title missing')
  if (gig.title && gig.title.length > 80) errors.push(`title too long (${gig.title.length} > 80)`)
  if (gig.title && !gig.title.toLowerCase().startsWith('i will ')) errors.push('title must start with "I will "')

  if (!Array.isArray(gig.tags) || gig.tags.length !== 5) errors.push('tags must be exactly 5')
  for (const t of gig.tags ?? []) {
    if (t.length > 20) errors.push(`tag too long: "${t}"`)
  }

  for (const k of ['basic', 'standard', 'premium'] as const) {
    const p = gig.packages?.[k]
    if (!p) {
      errors.push(`packages.${k} missing`)
      continue
    }
    if (p.description && p.description.length > 100) errors.push(`packages.${k}.description >100 (${p.description.length})`)
    if (!Number.isInteger(p.price_usd)) errors.push(`packages.${k}.price_usd must be integer`)
    if (!Number.isInteger(p.delivery_days)) errors.push(`packages.${k}.delivery_days must be integer`)
  }

  if (gig.packages?.basic?.price_usd && gig.packages?.premium?.price_usd) {
    if (gig.packages.premium.price_usd < gig.packages.basic.price_usd * 3) {
      errors.push('premium price must be ≥ 3× basic price')
    }
  }

  const desc = gig.description ?? ''
  if (desc.length < 1200) errors.push(`description too short (${desc.length} < 1200)`)
  if (desc.length > 5000) errors.push(`description too long (${desc.length} > 5000)`)
  const lowerDesc = desc.toLowerCase()
  for (const section of REQUIRED_SECTIONS) {
    if (!lowerDesc.includes(section)) errors.push(`description missing section: ${section}`)
  }

  if (!Array.isArray(gig.requirements) || gig.requirements.length < 3 || gig.requirements.length > 5) {
    errors.push('requirements must have 3-5 items')
  }
  if (!Array.isArray(gig.faq) || gig.faq.length < 4 || gig.faq.length > 6) {
    errors.push('faq must have 4-6 items')
  }

  if (/\[NEEDS_REVIEW\]/.test(JSON.stringify(gig))) errors.push('contains [NEEDS_REVIEW] flag')

  return { valid: errors.length === 0, errors }
}
