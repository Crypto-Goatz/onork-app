import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface VPISBreakdown {
  hook: number
  emotion: number
  platform: number
  viral: number
  specificity: number
  structure: number
  keywords: number
  cta: number
}

export interface PatternFired {
  name: string
  category: string
  delta: number
  description: string
}

export interface VPISResult {
  composite: number
  breakdown: VPISBreakdown
  patterns_fired: PatternFired[]
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  timing_modifier: number
}

export interface ScoringWeights {
  hook_weight: number
  emotion_weight: number
  platform_weight: number
  viral_weight: number
  specificity_weight: number
  structure_weight: number
  keywords_weight: number
  cta_weight: number
}

// ── Weight loader ─────────────────────────────────────────────────────────────

let cachedWeights: ScoringWeights | null = null
let cacheExpiry = 0

async function getActiveWeights(botConfigId?: string): Promise<ScoringWeights> {
  const now = Date.now()
  if (cachedWeights && now < cacheExpiry && !botConfigId) return cachedWeights

  const query = admin
    .from('vpis_formula_weights')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (botConfigId) {
    const { data } = await query.eq('bot_config_id', botConfigId).single()
    if (data) return data as ScoringWeights
  }

  const { data } = await query.is('bot_config_id', null).single()
  const weights = (data as ScoringWeights) ?? {
    hook_weight: 0.25, emotion_weight: 0.10, platform_weight: 0.12,
    viral_weight: 0.13, specificity_weight: 0.10, structure_weight: 0.15,
    keywords_weight: 0.10, cta_weight: 0.05,
  }

  if (!botConfigId) {
    cachedWeights = weights
    cacheExpiry = now + 5 * 60 * 1000 // 5min cache
  }
  return weights
}

// ── Pattern loader ────────────────────────────────────────────────────────────

let cachedPatterns: Array<{ name: string; category: string; regex_pattern: string; score_delta: number; description: string }> = []
let patternExpiry = 0

async function getActivePatterns() {
  const now = Date.now()
  if (cachedPatterns.length && now < patternExpiry) return cachedPatterns

  const { data } = await admin
    .from('vpis_patterns')
    .select('name, category, regex_pattern, score_delta, description')
    .eq('active', true)

  cachedPatterns = data ?? []
  patternExpiry = now + 10 * 60 * 1000
  return cachedPatterns
}

// ── Raw factor scorers (0–100 each) ──────────────────────────────────────────

function scoreHook(content: string): number {
  const firstLine = content.split('\n')[0].trim()
  let score = 40
  if (firstLine.length <= 80) score += 15
  if (/^\d/.test(firstLine)) score += 10           // starts with number
  if (/\?$/.test(firstLine)) score += 8             // question
  if (/[A-Z]{2,}/.test(firstLine)) score += 5       // CAPS word
  if (/^(I |We |My |How )/.test(firstLine)) score -= 10 // weak opener
  if (firstLine.length < 20) score -= 5
  return Math.min(100, Math.max(0, score))
}

function scoreEmotion(content: string): number {
  const emotionWords = /\b(transform|crush|destroy|love|hate|breakthrough|secret|mistake|fail|win|lost|struggle|finally|never|always|every|incredible|shocking)\b/gi
  const matches = content.match(emotionWords) ?? []
  const ratio = matches.length / (content.split(/\s+/).length || 1)
  return Math.min(100, Math.round(ratio * 400 + 30))
}

function scorePlatform(content: string): number {
  let score = 50
  const paragraphs = content.split('\n\n').filter(p => p.trim())
  if (paragraphs.length >= 3 && paragraphs.length <= 10) score += 20
  const avgParaLen = paragraphs.reduce((a, p) => a + p.length, 0) / (paragraphs.length || 1)
  if (avgParaLen < 200) score += 15
  if (content.length >= 300 && content.length <= 1500) score += 15
  const hashtagCount = (content.match(/#\w+/g) ?? []).length
  if (hashtagCount >= 2 && hashtagCount <= 5) score += 10
  if (hashtagCount > 8) score -= 15
  return Math.min(100, Math.max(0, score))
}

function scoreViral(content: string): number {
  let score = 30
  if (/\b\d[\d,]*(%|x|k|ARR|MRR)\b/i.test(content)) score += 20
  if (/in \d+ (day|week|month|hour)/i.test(content)) score += 15
  if (/(client|customer|company|brand)/i.test(content)) score += 10
  if (/\b(free|template|checklist|guide|framework)\b/i.test(content)) score += 8
  if (/\b(drop a comment|comment below|save this|share this)\b/i.test(content)) score += 10
  return Math.min(100, Math.max(0, score))
}

function scoreSpecificity(content: string): number {
  const specificNumbers = (content.match(/\b\d[\d,.]+\b/g) ?? []).length
  const namedEntities = (content.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) ?? []).length
  const specificDates = (content.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|\d{4})\b/g) ?? []).length
  return Math.min(100, 30 + specificNumbers * 8 + namedEntities * 5 + specificDates * 5)
}

function scoreStructure(content: string): number {
  let score = 40
  const lines = content.split('\n')
  const hasShortLines = lines.some(l => l.trim().length > 0 && l.trim().length < 80)
  if (hasShortLines) score += 15
  if (/\n\n/.test(content)) score += 15
  if (/^[•▪▸\-\*]/m.test(content)) score += 10
  const lastLine = lines[lines.length - 1].trim()
  if (lastLine.endsWith('?') || /(comment|thoughts|agree|disagree)/i.test(lastLine)) score += 10
  return Math.min(100, Math.max(0, score))
}

function scoreKeywords(content: string, icpKeywords: string[] = []): number {
  const defaultKeywords = ['AI', 'automation', 'scale', 'revenue', 'growth', 'system', 'workflow', 'ROI', 'client', 'agency']
  const allKeywords = [...defaultKeywords, ...icpKeywords]
  const matches = allKeywords.filter(kw => new RegExp(`\\b${kw}\\b`, 'i').test(content))
  return Math.min(100, 30 + matches.length * 7)
}

function scoreCTA(content: string): number {
  let score = 20
  if (/\?[\s]*$/.test(content.trim())) score += 30
  if (/(drop|leave|add)\s+a\s+comment/i.test(content)) score += 20
  if (/\b(agree|disagree|thoughts|let me know)\b/i.test(content)) score += 15
  if (/(DM me|follow|connect)/i.test(content)) score += 10
  return Math.min(100, score)
}

// ── Timing modifier (post hour EST) ──────────────────────────────────────────

export function timingModifier(hourEST: number): number {
  // Peak: 8-10am, 12pm, 5-6pm
  if (hourEST >= 8 && hourEST <= 10) return 1.08
  if (hourEST === 12) return 1.05
  if (hourEST >= 17 && hourEST <= 18) return 1.06
  if (hourEST >= 7 && hourEST < 8) return 0.97
  if (hourEST < 7 || hourEST > 20) return 0.85
  return 1.0
}

// ── ICP match check ───────────────────────────────────────────────────────────

export function icpMatch(
  content: string,
  icpKeywords: string[],
  icpTitles: string[],
  icpIndustries: string[]
): number {
  const all = [...icpKeywords, ...icpTitles, ...icpIndustries]
  if (!all.length) return 1.0
  const hits = all.filter(kw => new RegExp(`\\b${kw}\\b`, 'i').test(content)).length
  return 1.0 + Math.min(0.15, hits * 0.03)
}

// ── Main scoring function ─────────────────────────────────────────────────────

export async function scoreContent(
  content: string,
  opts: {
    botConfigId?: string
    icpKeywords?: string[]
    icpTitles?: string[]
    icpIndustries?: string[]
    postHourEST?: number
  } = {}
): Promise<VPISResult> {
  const [weights, patterns] = await Promise.all([
    getActiveWeights(opts.botConfigId),
    getActivePatterns(),
  ])

  const rawScores: VPISBreakdown = {
    hook:        scoreHook(content),
    emotion:     scoreEmotion(content),
    platform:    scorePlatform(content),
    viral:       scoreViral(content),
    specificity: scoreSpecificity(content),
    structure:   scoreStructure(content),
    keywords:    scoreKeywords(content, opts.icpKeywords),
    cta:         scoreCTA(content),
  }

  // Weighted composite before patterns
  let composite =
    rawScores.hook        * weights.hook_weight +
    rawScores.emotion     * weights.emotion_weight +
    rawScores.platform    * weights.platform_weight +
    rawScores.viral       * weights.viral_weight +
    rawScores.specificity * weights.specificity_weight +
    rawScores.structure   * weights.structure_weight +
    rawScores.keywords    * weights.keywords_weight +
    rawScores.cta         * weights.cta_weight

  // Pattern bonuses/penalties
  const patternsFired: PatternFired[] = []
  for (const p of patterns) {
    try {
      const re = new RegExp(p.regex_pattern, 'mu')
      if (re.test(content)) {
        patternsFired.push({ name: p.name, category: p.category, delta: p.score_delta, description: p.description })
        composite += p.score_delta
      }
    } catch { /* invalid regex — skip */ }
  }

  // ICP + timing modifiers
  const icp = icpMatch(content, opts.icpKeywords ?? [], opts.icpTitles ?? [], opts.icpIndustries ?? [])
  const timing = timingModifier(opts.postHourEST ?? 9)
  composite = composite * icp * timing

  const final = Math.round(Math.min(100, Math.max(0, composite)))
  const grade = final >= 90 ? 'S' : final >= 80 ? 'A' : final >= 70 ? 'B' : final >= 55 ? 'C' : 'D'

  return { composite: final, breakdown: rawScores, patterns_fired: patternsFired, grade, timing_modifier: timing }
}
