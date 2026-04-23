/**
 * VPIS — Viral Post Intelligence System
 * Scores LinkedIn posts on a 0-100 scale across 6 factors.
 * Used for both pre-publish scoring and analyzing existing posts.
 */

export interface VPISScore {
  total: number
  hook: number        // 25% weight — first line stops scroll
  structure: number   // 20% weight — formatting, length, paragraphs
  keywords: number    // 15% weight — topic relevance, trend alignment
  viralCoeff: number  // 15% weight — shareability, quotability
  platformOpt: number // 15% weight — zero hashtags, no links, timing
  cta: number         // 10% weight — closing question quality
  penalties: Penalty[]
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
}

export interface Penalty {
  rule: string
  factor: string
  points: number
  description: string
}

// ─── Anti-Patterns ───
const ANTI_PATTERNS: { pattern: RegExp | ((text: string) => boolean); factor: string; points: number; rule: string; description: string }[] = [
  { pattern: /^I'm excited to share/im, factor: 'hook', points: -15, rule: 'AP001', description: '"I\'m excited to share..." opener' },
  { pattern: /^I wanted to share/im, factor: 'hook', points: -12, rule: 'AP002', description: '"I wanted to share..." opener' },
  { pattern: /^I've been thinking/im, factor: 'hook', points: -10, rule: 'AP003', description: 'Throat-clearing opener' },
  { pattern: /thoughts\?$/im, factor: 'cta', points: -20, rule: 'AP004', description: '"Thoughts?" as closing' },
  { pattern: /agree\?$/im, factor: 'cta', points: -15, rule: 'AP005', description: '"Agree?" as closing' },
  { pattern: (t: string) => (t.match(/#\w+/g) || []).length >= 5, factor: 'platformOpt', points: -40, rule: 'AP006', description: 'Hashtag soup (5+)' },
  { pattern: /https?:\/\/[^\s]+/m, factor: 'platformOpt', points: -25, rule: 'AP007', description: 'Link in post body' },
  { pattern: /\*\*[^*]+\*\*/m, factor: 'structure', points: -15, rule: 'AP008', description: 'Bold markdown (renders as asterisks)' },
  { pattern: /game.?changer/i, factor: 'keywords', points: -10, rule: 'AP009', description: '"Game-changer"' },
  { pattern: /innovative/i, factor: 'keywords', points: -10, rule: 'AP010', description: '"Innovative"' },
  { pattern: /cutting.?edge/i, factor: 'keywords', points: -10, rule: 'AP011', description: '"Cutting-edge"' },
  { pattern: /leverage/i, factor: 'keywords', points: -8, rule: 'AP012', description: '"Leverage" (corporate vocab)' },
  { pattern: /synergy/i, factor: 'keywords', points: -8, rule: 'AP013', description: '"Synergy" (corporate vocab)' },
  { pattern: /stakeholder/i, factor: 'keywords', points: -8, rule: 'AP014', description: '"Stakeholder" (corporate vocab)' },
  { pattern: /utilize/i, factor: 'keywords', points: -8, rule: 'AP015', description: '"Utilize" (use "use")' },
  { pattern: /robust/i, factor: 'keywords', points: -6, rule: 'AP016', description: '"Robust" (corporate vocab)' },
  { pattern: (t: string) => t.split(/\s+/).length > 300, factor: 'structure', points: -10, rule: 'AP017', description: 'Over 300 words' },
  { pattern: (t: string) => /^(\d+[\.\)]\s.+\n?){5,}/m.test(t), factor: 'viralCoeff', points: -8, rule: 'AP018', description: 'Numbered list as entire post' },
  { pattern: /^I /m, factor: 'hook', points: -5, rule: 'AP019', description: 'Starts with "I"' },
]

// ─── Positive Signals ───
function scoreHook(text: string): number {
  const firstLine = text.split('\n')[0].trim()
  let score = 50

  // Strong openers
  if (/^\d/.test(firstLine)) score += 15 // Starts with number (specificity)
  if (firstLine.length < 60) score += 10 // Short hook
  if (firstLine.length < 40) score += 5  // Very short hook
  if (/\.$/.test(firstLine)) score += 5  // Ends with period (declaration)
  if (/\?$/.test(firstLine)) score += 3  // Question hook
  if (firstLine.includes('—') || firstLine.includes('–')) score += 3 // Em dash

  // Check for pattern matches
  if (/^(Most|Nobody|Everyone|The truth|Here's what|Stop|Don't|Never|Always)/i.test(firstLine)) score += 12

  return Math.min(100, Math.max(0, score))
}

function scoreStructure(text: string): number {
  let score = 50
  const lines = text.split('\n')
  const words = text.split(/\s+/).length
  const paragraphs = text.split(/\n\n+/).length

  // Length sweet spot: 100-250 words
  if (words >= 100 && words <= 250) score += 15
  else if (words >= 50 && words <= 300) score += 8
  else if (words > 300) score -= 10

  // Paragraph breaks
  if (paragraphs >= 4) score += 10
  if (paragraphs >= 6) score += 5

  // Short paragraphs (breathing room)
  const avgParaLen = words / paragraphs
  if (avgParaLen < 40) score += 10
  if (avgParaLen < 25) score += 5

  // Blank lines (space)
  const blankLines = lines.filter(l => l.trim() === '').length
  if (blankLines >= 3) score += 5

  // One-word sentences / fragments
  const fragments = lines.filter(l => l.trim().split(/\s+/).length <= 2 && l.trim().length > 0).length
  if (fragments >= 1) score += 5 // Human imperfection

  return Math.min(100, Math.max(0, score))
}

function scoreKeywords(text: string): number {
  let score = 60

  // Industry-relevant terms
  const relevantTerms = ['AI', 'automation', 'CRM', 'workflow', 'leads', 'conversion', 'revenue', 'clients', 'pipeline', 'outreach', 'prospecting', 'SaaS', 'agency']
  const found = relevantTerms.filter(t => text.toLowerCase().includes(t.toLowerCase())).length
  score += Math.min(20, found * 4)

  // Specific numbers (credibility)
  const numbers = text.match(/\d+[\.,]?\d*%?/g) || []
  score += Math.min(15, numbers.length * 5)

  return Math.min(100, Math.max(0, score))
}

function scoreViralCoeff(text: string): number {
  let score = 50

  // Quotable lines (short, punchy sentences)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const quotable = sentences.filter(s => {
    const words = s.trim().split(/\s+/).length
    return words >= 3 && words <= 15
  }).length
  score += Math.min(20, quotable * 3)

  // Contrast/flip pattern
  if (/but|however|instead|actually|turns out/i.test(text)) score += 8

  // Confession pattern
  if (/I (used to|was|spent|wasted|thought)/i.test(text)) score += 5

  // Specific story elements
  if (/\$\d/.test(text)) score += 5 // Dollar amounts
  if (/\d+ (days|weeks|months|hours|years)/i.test(text)) score += 5 // Time references

  return Math.min(100, Math.max(0, score))
}

function scorePlatformOpt(text: string): number {
  let score = 80

  // Hashtags
  const hashtags = (text.match(/#\w+/g) || []).length
  if (hashtags === 0) score += 15 // Zero hashtags = best
  else if (hashtags <= 3) score += 5
  else score -= hashtags * 5

  // Links
  if (/https?:\/\//.test(text)) score -= 25

  // Length (LinkedIn algorithm favors 100-250 words)
  const words = text.split(/\s+/).length
  if (words >= 100 && words <= 250) score += 5

  return Math.min(100, Math.max(0, score))
}

function scoreCTA(text: string): number {
  let score = 50
  const lastLines = text.split('\n').filter(l => l.trim()).slice(-3).join(' ')

  // Specific question
  if (/\?$/.test(lastLines.trim())) score += 15

  // Targeted question (mentions specific role/action)
  if (/what|how|which|when|where|who/i.test(lastLines)) score += 10

  // Answerable in 30 seconds (short question)
  const questionWords = lastLines.split('?')[0]?.split(/\s+/).length || 0
  if (questionWords < 20) score += 8

  return Math.min(100, Math.max(0, score))
}

// ─── Main Scoring Function ───
export function scorePost(text: string): VPISScore {
  // Calculate base scores
  let hook = scoreHook(text)
  let structure = scoreStructure(text)
  let keywords = scoreKeywords(text)
  let viralCoeff = scoreViralCoeff(text)
  let platformOpt = scorePlatformOpt(text)
  let cta = scoreCTA(text)

  // Apply anti-pattern penalties
  const penalties: Penalty[] = []
  for (const ap of ANTI_PATTERNS) {
    const matches = typeof ap.pattern === 'function' ? ap.pattern(text) : ap.pattern.test(text)
    if (matches) {
      penalties.push({ rule: ap.rule, factor: ap.factor, points: ap.points, description: ap.description })
      switch (ap.factor) {
        case 'hook': hook = Math.max(0, hook + ap.points); break
        case 'structure': structure = Math.max(0, structure + ap.points); break
        case 'keywords': keywords = Math.max(0, keywords + ap.points); break
        case 'viralCoeff': viralCoeff = Math.max(0, viralCoeff + ap.points); break
        case 'platformOpt': platformOpt = Math.max(0, platformOpt + ap.points); break
        case 'cta': cta = Math.max(0, cta + ap.points); break
      }
    }
  }

  // Weighted total
  const total = Math.round(
    hook * 0.25 +
    structure * 0.20 +
    keywords * 0.15 +
    viralCoeff * 0.15 +
    platformOpt * 0.15 +
    cta * 0.10
  )

  // Grade
  const grade = total >= 90 ? 'S' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : total >= 50 ? 'D' : 'F'

  return { total, hook, structure, keywords, viralCoeff, platformOpt, cta, penalties, grade }
}

// ─── BE Writing Style System Prompt ───
export const BE_STYLE_PROMPT = `You are a LinkedIn ghostwriter using the BE writing style.

VOICE RULES (non-negotiable):
- Short sentences as units. Each line stands alone.
- Zero corporate vocabulary (leverage, synergy, stakeholder, utilize, robust)
- Casual certainty — confident without hedging
- One-liner punch every 3-4 sentences — must be quotable in isolation
- No throat-clearing — never open with "I've been thinking about..."
- Leave space — short paragraphs, gaps, room to breathe
- Human imperfection signal — occasional one-word sentence. Fragment. Fine.
- Never start with "I" as the first word

POST STRUCTURE:
LINE 1: Hook (Absolute Declaration OR Bait & Flip)
LINE 2: The Flip (if Bait & Flip pattern)
[blank line]
LINE 3: Context (1-2 sentences)
[blank line]
LINE 4-6: Evidence Block (3 specific facts/numbers)
[blank line]
LINE 7: The Insight (the thing nobody is saying)
[blank line]
LINE 8: The Mechanism (how it works / why it matters)
[blank line]
LINE 9: Solution Reference (product mention — 1 sentence, not a pitch)
[blank line]
LINE 10: Closing Question (specific, practitioner-targeted, answerable in 30s)

HARD RULES:
- MAX 250 words
- ZERO hashtags on thought leadership posts
- NO links in post body (link goes in first comment)
- NO bold markdown (LinkedIn renders as asterisks)
- NO "I'm excited to share", "Thoughts?", "Agree?"
- NO "game-changer", "innovative", "cutting-edge"
- Every post must score 80+ on VPIS before publishing`
