/**
 * POST /api/fiverr/generate
 *
 * Per docs/fiverr-generator-and-stack-scanner-spec.md §6.1.
 *
 * Body:
 *   {
 *     description, category, subcategory,
 *     tier_intent: 'basic'|'standard'|'premium',
 *     tone: 'authoritative'|'friendly'|'technical'|'bold',
 *     source_scan_id?
 *   }
 *
 * Returns: { sections, vpis, warnings }
 *
 * Behavior:
 *   - Calls Groq llama-3.3-70b-versatile with a JSON-mode contract
 *     describing all 10 sections + the Fiverr char limits per field.
 *   - Validates char limits server-side; retries up to 2x with a
 *     tightened "respect limits" reminder if any section overshoots.
 *   - Returns warnings[] for any field still over after the retry budget.
 *
 * No Anthropic, no OpenAI. Groq only (Hard Rule #1).
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
} from '@/lib/fiverr/limits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

interface GenerateBody {
  description: string
  category: string
  subcategory: string
  tier_intent: Tier
  tone: Tone
  source_scan_id?: string
}

const SYSTEM_PROMPT = `You are a senior Fiverr Pro seller writing a complete gig that converts cold buyers into clients in under 90 seconds of reading.

Output STRICT JSON matching this exact shape (no markdown, no commentary):

{
  "title": "I will <action>... (max ${FIVERR_LIMITS.title} chars; MUST start with 'I will')",
  "category": { "category": "...", "subcategory": "..." },
  "tags": ["tag1","tag2","tag3","tag4","tag5"]   // exactly 5 tags, each ≤${FIVERR_LIMITS.tags.chars_per_tag} chars, lowercase, no punctuation,
  "description": "long description, ≤${FIVERR_LIMITS.description} chars, line breaks OK, hooks → benefits → process → social proof",
  "basic":    { "name": "(≤${FIVERR_LIMITS.package_name} ch)", "description": "(≤${FIVERR_LIMITS.package_description} ch)", "delivery_days": 3, "revisions": 1, "price_usd": 50 },
  "standard": { "name": "(≤${FIVERR_LIMITS.package_name} ch)", "description": "(≤${FIVERR_LIMITS.package_description} ch)", "delivery_days": 5, "revisions": 2, "price_usd": 150 },
  "premium":  { "name": "(≤${FIVERR_LIMITS.package_name} ch)", "description": "(≤${FIVERR_LIMITS.package_description} ch)", "delivery_days": 7, "revisions": 3, "price_usd": 350 },
  "requirements": ["3-5 buyer-onboarding questions, each ≤${FIVERR_LIMITS.buyer_requirement} chars"],
  "faq": [
    { "q": "(≤${FIVERR_LIMITS.faq_question} ch)", "a": "(≤${FIVERR_LIMITS.faq_answer} ch)" }
  ],
  "image_prompt": "Detailed prompt for a hero image suitable for Sora / Midjourney / DALL-E 3"
}

Hard rules:
- Title MUST start with "I will".
- Tags: exactly 5, lowercase, no punctuation, ≤${FIVERR_LIMITS.tags.chars_per_tag} chars each.
- All char limits are HARD CEILINGS — count carefully, do not exceed.
- Pricing tiers should reflect the user's tier_intent (basic/standard/premium = anchor).
- The tone parameter is your voice. Stay in it across all sections.
- "requirements" is 3 to 5 entries.
- "faq" is 3 to 5 Q/A pairs.

Output JSON ONLY. No prose.`

interface VpisScore {
  v: number
  p: number
  i: number
  s: number
  composite: number
}

function quickVpis(sections: FiverrSections): VpisScore {
  // Lightweight rubric — measures the 4 axes from text density alone.
  // The full rubric lives in the brain's vpis_score surface; this is a
  // conservative estimator so the UI always shows something.
  const desc = sections.description || ''
  const value = Math.min(100, Math.round((desc.match(/result|outcome|deliver|guaranteed/gi)?.length ?? 0) * 12 + 40))
  const pain = Math.min(100, Math.round((desc.match(/struggle|stuck|tired|frustrat/gi)?.length ?? 0) * 14 + 35))
  const identity = Math.min(100, Math.round((desc.match(/founder|operator|coach|consultant|seo|engineer/gi)?.length ?? 0) * 10 + 40))
  const specificity = Math.min(100, Math.round((desc.match(/\d+/g)?.length ?? 0) * 6 + 30))
  const composite = Math.round((value + pain + identity + specificity) / 4)
  return { v: value, p: pain, i: identity, s: specificity, composite }
}

async function callGroq(messages: Array<{ role: string; content: string }>): Promise<FiverrSections> {
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
      max_tokens: 2400,
    }),
  })
  if (!r.ok) throw new Error(`Groq ${r.status}`)
  const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const text = data.choices?.[0]?.message?.content || '{}'
  return JSON.parse(text) as FiverrSections
}

export async function POST(req: NextRequest) {
  let body: GenerateBody
  try {
    body = (await req.json()) as GenerateBody
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }
  const description = (body.description || '').trim()
  if (description.length < 30) {
    return NextResponse.json(
      { ok: false, error: 'description too short — at least 30 chars' },
      { status: 400 },
    )
  }
  if (!TIERS.includes(body.tier_intent)) {
    return NextResponse.json({ ok: false, error: `tier_intent must be one of ${TIERS.join(',')}` }, { status: 400 })
  }
  if (!TONES.includes(body.tone)) {
    return NextResponse.json({ ok: false, error: `tone must be one of ${TONES.join(',')}` }, { status: 400 })
  }

  const userPayload = JSON.stringify({
    description,
    category: body.category,
    subcategory: body.subcategory,
    tier_intent: body.tier_intent,
    tone: body.tone,
  })

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Build the gig from this brief:\n${userPayload}`,
    },
  ]

  let sections: FiverrSections | null = null
  let warnings: string[] = []
  let lastErr: string | null = null

  // up to 3 attempts: 1 cold + 2 retries with tightened ceiling reminders
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      sections = await callGroq(messages)
    } catch (e) {
      lastErr = (e as Error).message
      continue
    }
    warnings = validateSections(sections)
    if (warnings.length === 0) break
    // Tighten the prompt for retry
    messages.push({
      role: 'user',
      content: `Some fields exceeded their character limits: ${warnings.join(', ')}. Regenerate the FULL JSON object, staying strictly under every cap. Same content quality, shorter copy.`,
    })
  }

  if (!sections) {
    return NextResponse.json(
      { ok: false, error: lastErr || 'Groq unreachable' },
      { status: 502 },
    )
  }

  const vpis = quickVpis(sections)

  return NextResponse.json({
    ok: true,
    sections,
    vpis,
    warnings,
  })
}
