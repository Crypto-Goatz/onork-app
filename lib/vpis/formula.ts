/**
 * VPIS — Viral Post Intelligence Score
 * Scores LinkedIn content across 8 weighted factors.
 * Weights self-tune via gradient descent from engagement data.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface VPISScores {
  composite: number; hook: number; emotion: number; platform: number
  viral: number; specificity: number; structure: number; keywords: number
  cta: number; patterns_fired: string[]; adjusted_score: number
}

interface Weights {
  hook: number; emotion: number; platform: number; viral: number
  specificity: number; structure: number; keywords: number; cta: number
}

let cachedWeights: Weights | null = null
let weightsCacheTime = 0

async function getActiveWeights(): Promise<Weights> {
  if (cachedWeights && Date.now() - weightsCacheTime < 300000) return cachedWeights
  const { data } = await supabase.from('vpis_formula_weights').select('*').eq('is_active', true).order('version', { ascending: false }).limit(1).single()
  cachedWeights = {
    hook: Number(data?.hook_weight) || 0.200, emotion: Number(data?.emotion_weight) || 0.180,
    platform: Number(data?.platform_weight) || 0.150, viral: Number(data?.viral_weight) || 0.120,
    specificity: Number(data?.specificity_weight) || 0.100, structure: Number(data?.structure_weight) || 0.100,
    keywords: Number(data?.keyword_weight) || 0.080, cta: Number(data?.cta_weight) || 0.070,
  }
  weightsCacheTime = Date.now()
  return cachedWeights
}

export async function scoreContent(text: string, contentType: 'post' | 'comment', context?: { targetKeywords?: string[] }): Promise<VPISScores> {
  const w = await getActiveWeights()
  const hook = scoreHook(text), emotion = scoreEmotion(text), platform = scorePlatform(text, contentType)
  const viral = scoreViral(text), specificity = scoreSpecificity(text), structure = scoreStructure(text, contentType)
  const keywords = scoreKeywords(text, context?.targetKeywords), cta = scoreCTA(text, contentType)
  const patterns_fired = detectPatterns(text)
  const composite = Math.round(hook*w.hook + emotion*w.emotion + platform*w.platform + viral*w.viral + specificity*w.specificity + structure*w.structure + keywords*w.keywords + cta*w.cta)
  const adjusted_score = Math.min(100, Math.max(0, composite + Math.min(8, patterns_fired.length * 1.5)))
  return { composite, hook, emotion, platform, viral, specificity, structure, keywords, cta, patterns_fired, adjusted_score }
}

function scoreHook(text: string): number {
  let s = 50; const f = text.split('\n')[0] || ''
  if (/\?$/.test(f.trim())) s += 15
  if (/used to|until|except|but here|the problem/i.test(f)) s += 15
  if (/\$[\d,]+|\d+%|\d+\s*(companies|people|tools|services|hours)/i.test(f)) s += 12
  const wc = f.split(' ').length; if (wc >= 5 && wc <= 12) s += 8
  if (/^i'm (excited|thrilled|happy|pleased)/i.test(f)) s -= 25
  if (/^(today i|i've been|i wanted to share|excited to)/i.test(f)) s -= 20
  return Math.min(100, Math.max(0, s))
}

function scoreEmotion(text: string): number {
  let s = 50; const l = text.toLowerCase()
  s += ['behind','missing out','losing','at risk','exposed','vulnerable','penalty','fine','violation'].filter(t => l.includes(t)).length * 4
  s += ['control','own','build','create','launch','ship','deploy','execute'].filter(t => l.includes(t)).length * 3
  s += ['nobody talks about','hidden','what if','turns out','here\'s why','the real'].filter(t => l.includes(t)).length * 5
  return Math.min(100, Math.max(0, s))
}

function scorePlatform(text: string, ct: string): number {
  let s = 70; const hc = (text.match(/#\w+/g) || []).length
  if (hc === 0) s += 15; if (hc > 3) s -= 15
  if (ct === 'post' && /https?:\/\//.test(text)) s -= 25
  const wc = text.split(' ').length; if (wc >= 80 && wc <= 200) s += 10; if (wc > 300) s -= 10
  return Math.min(100, Math.max(0, s))
}

function scoreViral(text: string): number {
  let s = 60; const lines = text.split('\n').filter(l => l.trim())
  s += Math.min(25, lines.filter(l => { const w = l.trim().split(' ').length; return w >= 4 && w <= 12 }).length * 5)
  if (/\d\./m.test(text) || /step \d/i.test(text)) s += 10
  s += Math.min(15, (text.match(/\d+/g) || []).length * 3)
  return Math.min(100, Math.max(0, s))
}

function scoreSpecificity(text: string): number {
  let s = 50
  if (/\b(stripe|supabase|vercel|slack|github|linear|notion|airtable|zapier|claude|groq)\b/i.test(text)) s += 12
  if (/\$[\d,]+/.test(text)) s += 10
  if (/\d+\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?)/i.test(text)) s += 10
  if (/hipaa|gdpr|ccpa|sox|pci/i.test(text)) s += 12
  return Math.min(100, Math.max(0, s))
}

function scoreStructure(text: string, _ct: string): number {
  let s = 60; const paras = text.split('\n\n')
  if (paras.filter(p => p.split('\n').length <= 3).length / paras.length > 0.7) s += 15
  const bl = text.split('\n').filter(l => l.trim() === '').length
  if (bl >= 3 && bl <= 8) s += 10
  const sents = text.split(/[.!?]+/).filter(x => x.trim())
  if (sents.filter(x => x.trim().split(' ').length <= 15).length / sents.length > 0.7) s += 12
  if (paras.length === 1 && text.length > 500) s -= 20
  return Math.min(100, Math.max(0, s))
}

function scoreKeywords(text: string, kws?: string[]): number {
  if (!kws || kws.length === 0) return 60; let s = 40; const l = text.toLowerCase()
  s += Math.min(40, kws.filter(k => l.includes(k.toLowerCase())).length * 15)
  if (kws.some(k => (text.split('\n')[0] || '').toLowerCase().includes(k.toLowerCase()))) s += 10
  return Math.min(100, Math.max(0, s))
}

function scoreCTA(text: string, _ct: string): number {
  let s = 40; const last = text.split('\n').slice(-3).join(' ')
  if (/\?/.test(last)) s += 30
  if (/what.+(your|you|specific|one|single)/i.test(last)) s += 15
  if (/thoughts\?|what do you think\?|agree\?/i.test(last)) s -= 20
  if (/stack|workflow|process|tool|manually|currently/i.test(last)) s += 10
  return Math.min(100, Math.max(0, s))
}

function detectPatterns(text: string): string[] {
  const f: string[] = []
  const l = text.toLowerCase()
  const firstLine = (text.split('\n')[0] || '').trim()
  const lastLines = text.split('\n').filter(x => x.trim()).slice(-3).join(' ')
  const wordCount = text.split(/\s+/).length
  const hashtagCount = (text.match(/#\w+/g) || []).length
  const hasLink = /https?:\/\//.test(text)
  const lines = text.split('\n').filter(x => x.trim())

  // ─── Hook Patterns ───
  // P024: Absolute Declaration — "You are the API between your AI tools."
  if (/^(you are|the (biggest|best|worst|only|real)|every |most |nobody|everyone|stop |don't |never |always )/i.test(firstLine)) f.push('P024-ABSOLUTE_DECLARATION')
  // P031: Bait & Flip — setup belief → immediately flip
  if (/used to.+(now|until|but)|but here'?s|the problem|\.{3}\s*(but|except|until|wrong)/i.test(l)) f.push('P031-BAIT_AND_FLIP')
  // P022: Confession + Contrast — admit something real, contrast with change
  if (/i (spent|wasted|lost|almost|used to|was wrong|failed|quit|stopped|gave up)/i.test(l) && /(now|then|today|changed|learned|realized)/i.test(l)) f.push('P022-CONFESSION_CONTRAST')
  // P028: Specificity Hook — opens with exact numbers
  if (/^\$?[\d,]+\.?\d*[%kKmM]?\s|^\d+[\.,]\d/.test(firstLine)) f.push('P028-SPECIFICITY_HOOK')
  // P041: Authority Contrast — reference authority + add what they missed
  if (/(won't tell you|doesn't show|left out|missed|forgot|what .+ actually|here'?s what .+ really)/i.test(l)) f.push('P041-AUTHORITY_CONTRAST')
  // P033: Contrarian with Backup — opposite position + data justification
  if (/(wrong about|most .+ advice|unpopular opinion|hot take|controversial|here'?s why .+ wrong)/i.test(l)) f.push('P033-CONTRARIAN_BACKUP')

  // ─── Structure Patterns ───
  // P011: Zero Hashtags (Thought Leadership)
  if (hashtagCount === 0) f.push('P011-ZERO_HASHTAGS')
  // P015: Link in First Comment Only
  if (!hasLink) f.push('P015-NO_LINKS_IN_BODY')
  // P037: Vibe Style — short sentences, no corporate, casual certainty
  const avgSentLen = text.split(/[.!?]+/).filter(x => x.trim()).reduce((a, s) => a + s.trim().split(/\s+/).length, 0) / Math.max(1, text.split(/[.!?]+/).filter(x => x.trim()).length)
  if (avgSentLen <= 15 && !/leverage|synergy|stakeholder|utilize|robust|innovative|cutting.?edge/i.test(l)) f.push('P037-VIBE_STYLE')
  // P042: Framework/Numbered Structure
  if (/\d[\.\)]\s/m.test(text) || /step \d/i.test(l)) f.push('P042-FRAMEWORK_STRUCTURE')

  // ─── Engagement Patterns ───
  // P055: Closing Question Formula
  if (/\?/.test(lastLines) && /what|how|which|when|where|who/i.test(lastLines)) f.push('P055-CLOSING_QUESTION')
  // P025: Comment Length Signal (for comments: 100-180 words)
  if (wordCount >= 100 && wordCount <= 180) f.push('P025-OPTIMAL_COMMENT_LENGTH')
  // P026: Author Reply Trigger — extends thesis + asks process question
  if (/your (process|approach|framework|system|method|stack)/i.test(l)) f.push('P026-AUTHOR_REPLY_TRIGGER')

  // ─── Viral Mechanics ───
  // P046: Playbook as Pitch — giving away the mechanism
  if (/(here'?s (exactly )?how|step.by.step|the (exact |full )?playbook|here'?s the (system|framework|process))/i.test(l)) f.push('P046-PLAYBOOK_AS_PITCH')
  // P047: Implied Math — state price + volume, never multiply
  if (/\$\d/.test(l) && /\d+ (spots?|seats?|clients?|slots?|per (week|month|day))/i.test(l)) f.push('P047-IMPLIED_MATH')
  // P048: Price Controversy — specific price (not round) triggers debate
  if (/\$\d{2,}[79]\b|\$\d+\.\d{2}/.test(text)) f.push('P048-PRICE_CONTROVERSY')
  // P051: Motion Content — references to video/GIF/demo
  if (/(screen.?record|gif|video|demo|loom|walkthrough)/i.test(l)) f.push('P051-MOTION_CONTENT')

  // ─── Quotable & Save-worthy ───
  // P058: Quotable Standalone Line — 4-12 word punchy line
  if (lines.some(x => { const w = x.trim().split(/\s+/).length; return w >= 4 && w <= 12 && /[.!]$/.test(x.trim()) })) f.push('P058-QUOTABLE_LINE')
  // Save intent signals — frameworks, checklists, systems
  if (/(framework|checklist|system|formula|rule|template|playbook|step|cheat.?sheet)/i.test(l)) f.push('P_SAVE_INTENT')

  // ─── Timing & Distribution ───
  // P001: First Hour Velocity signal (detection: mentions rally/share/comment early)
  if (/(comment below|share this|tag someone|send this to)/i.test(l)) f.push('P001-VELOCITY_SIGNAL')
  // P008: Dwell Time Signal — long-form with questions holds attention
  if (wordCount >= 150 && /\?/.test(text) && text.split('\n\n').length >= 3) f.push('P008-DWELL_TIME')
  // P017: Consistency Signal — topic cluster reference
  if (/(part \d|series|yesterday|last (week|post)|continuing|follow.?up)/i.test(l)) f.push('P017-CONSISTENCY_SIGNAL')
  // P053: LinkedIn Aftershock — references news/events from past week
  if (/(just (announced|released|launched|dropped)|breaking|this week|yesterday .+ announced)/i.test(l)) f.push('P053-AFTERSHOCK_WINDOW')

  // ─── Comment-Specific Patterns ───
  // P029: ICP Comment Extraction — enrichment reference
  if (/(your comment|saw your (post|comment|take)|you mentioned)/i.test(l)) f.push('P029-ICP_EXTRACTION')
  // P056: Comment-Bait Visibility Gap — substantive comment surfaces
  if (wordCount >= 80 && /\?/.test(lastLines) && !/(comment|dm|follow|subscribe|link)/i.test(l.slice(-100))) f.push('P056-SUBSTANTIVE_COMMENT')
  // P057: Specificity Mirroring — applying their specificity principle to your value
  if (/\d+.+(services?|tools?|integrations?|apps?|connections?).+(one|single|through)/i.test(l)) f.push('P057-SPECIFICITY_MIRROR')

  // ─── Emotional Triggers ───
  if (/behind|missing out|exposed|at risk|losing|vulnerable/i.test(l)) f.push('P_FOMO_TRIGGER')
  if (/\$\d|million|billion|revenue|save|earn/i.test(l)) f.push('P_FINANCIAL_TRIGGER')
  if (/your (team|company|website|stack|pipeline|business)/i.test(l)) f.push('P_IDENTITY_TRIGGER')

  // ─── Before/After Pattern ───
  if (/(\d+ (months?|weeks?|years?) ago|before|used to).+(now|today|after|current)/i.test(l)) f.push('P_BEFORE_AFTER')

  return f
}
