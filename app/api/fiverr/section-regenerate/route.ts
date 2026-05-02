/**
 * POST /api/fiverr/section-regenerate
 *
 * Per docs/fiverr-generator-and-stack-scanner-spec.md §2.3 (per-card
 * Regenerate button) + §4 (`fiverr_section_regenerate` brain surface).
 *
 * Body:
 *   {
 *     section: 'title' | 'description' | 'tags' | 'requirements' |
 *              'faq' | 'image_prompt' | 'basic' | 'standard' | 'premium',
 *     input_state: { description, category, subcategory, tier_intent, tone },
 *     existing_sections: FiverrSections   // full prior gen, used as context
 *   }
 *
 * Returns: { ok, section, value, warnings }
 *
 * Behavior:
 *   - Calls Groq llama-3.3-70b-versatile, response_format json_object.
 *   - Re-validates the single field against FIVERR_LIMITS; one cold attempt
 *     plus one tightened retry. If still over, returns the value with a
 *     warning rather than blocking — caller decides whether to surface.
 *   - No DB write. Caller composes the new section into local state and
 *     hits POST /api/fiverr/templates if they want to save the whole gig.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  FIVERR_LIMITS,
  TIERS,
  TONES,
  validateSections,
  type FiverrSections,
  type Tier,
  type Tone,
  type PackageSection,
} from '@/lib/fiverr/limits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

const SECTIONS = [
  'title',
  'description',
  'tags',
  'requirements',
  'faq',
  'image_prompt',
  'basic',
  'standard',
  'premium',
] as const
type SectionKey = (typeof SECTIONS)[number]

interface Body {
  section?: SectionKey
  input_state?: {
    description?: string
    category?: string
    subcategory?: string
    tier_intent?: Tier
    tone?: Tone
  }
  existing_sections?: FiverrSections
}

function sectionContract(section: SectionKey): string {
  switch (section) {
    case 'title':
      return `Output JSON: { "title": "I will ... (max ${FIVERR_LIMITS.title} chars; MUST start with 'I will')" }`
    case 'description':
      return `Output JSON: { "description": "long description, ≤${FIVERR_LIMITS.description} chars, line breaks OK, hooks → benefits → process → social proof" }`
    case 'tags':
      return `Output JSON: { "tags": ["tag1","tag2","tag3","tag4","tag5"] } — exactly 5 tags, each ≤${FIVERR_LIMITS.tags.chars_per_tag} chars, lowercase, no punctuation.`
    case 'requirements':
      return `Output JSON: { "requirements": ["q1","q2","q3"] } — 3 to 5 buyer-onboarding questions, each ≤${FIVERR_LIMITS.buyer_requirement} chars.`
    case 'faq':
      return `Output JSON: { "faq": [{"q":"...","a":"..."}] } — 3 to 5 entries; q ≤${FIVERR_LIMITS.faq_question} chars, a ≤${FIVERR_LIMITS.faq_answer} chars.`
    case 'image_prompt':
      return `Output JSON: { "image_prompt": "Detailed prompt for a hero image suitable for Sora / Midjourney / DALL-E 3" }`
    case 'basic':
    case 'standard':
    case 'premium':
      return `Output JSON: { "${section}": { "name": "(≤${FIVERR_LIMITS.package_name} ch)", "description": "(≤${FIVERR_LIMITS.package_description} ch)", "delivery_days": 5, "revisions": 2, "price_usd": 150 } }`
  }
}

async function callGroq(messages: Array<{ role: string; content: string }>): Promise<Record<string, unknown>> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY not configured')
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      response_format: { type: 'json_object' },
      messages,
      temperature: 0.6,
      max_tokens: 800,
    }),
  })
  if (!r.ok) throw new Error(`Groq ${r.status}`)
  const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return JSON.parse(data.choices?.[0]?.message?.content || '{}')
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }

  const section = body.section
  if (!section || !SECTIONS.includes(section)) {
    return NextResponse.json(
      { ok: false, error: `section must be one of ${SECTIONS.join(',')}` },
      { status: 400 },
    )
  }
  const input = body.input_state || {}
  const tone = input.tone && TONES.includes(input.tone) ? input.tone : 'authoritative'
  const tier = input.tier_intent && TIERS.includes(input.tier_intent) ? input.tier_intent : 'standard'

  const system = `You are a senior Fiverr Pro seller rewriting one specific gig section. The buyer wants the SAME content quality but a FRESH take — different angle, different opener, different verbs. Stay in the user's tone (${tone}). Honor the tier anchor (${tier}) for any pricing/scope decisions.\n\n${sectionContract(section)}\n\nOutput JSON ONLY. No commentary, no markdown.`

  const userPayload = JSON.stringify({
    section,
    input_state: { ...input, tier_intent: tier, tone },
    existing_sections: body.existing_sections ?? null,
  })

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: `Regenerate the "${section}" section from this context:\n${userPayload}` },
  ]

  let value: unknown = null
  let warnings: string[] = []
  let lastErr: string | null = null

  for (let attempt = 1; attempt <= 2; attempt++) {
    let parsed: Record<string, unknown>
    try {
      parsed = await callGroq(messages)
    } catch (e) {
      lastErr = (e as Error).message
      continue
    }
    value = parsed[section] ?? null
    if (value == null) {
      lastErr = `model returned no "${section}" key`
      continue
    }
    // Soft-validate just this section by composing a partial sections object
    const partial: FiverrSections = {}
    if (section === 'basic' || section === 'standard' || section === 'premium') {
      partial[section] = value as PackageSection
    } else if (section === 'tags') {
      partial.tags = value as string[]
    } else if (section === 'requirements') {
      partial.requirements = value as string[]
    } else if (section === 'faq') {
      partial.faq = value as Array<{ q: string; a: string }>
    } else if (section === 'image_prompt') {
      partial.image_prompt = value as string
    } else if (section === 'title') {
      partial.title = value as string
    } else if (section === 'description') {
      partial.description = value as string
    }
    warnings = validateSections(partial)
    if (warnings.length === 0) break
    messages.push({
      role: 'user',
      content: `That field overshot its character cap (${warnings.join(', ')}). Regenerate the same JSON shape but stay strictly under every limit. Keep the meaning, shorter copy.`,
    })
  }

  if (value == null) {
    return NextResponse.json(
      { ok: false, error: lastErr || 'Groq unreachable' },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, section, value, warnings })
}
