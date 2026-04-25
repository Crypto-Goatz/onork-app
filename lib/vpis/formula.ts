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
  const f: string[] = []; const l = text.toLowerCase()
  if (/^you are|you're the/i.test(text)) f.push('P024-ABSOLUTE_DECLARATION')
  if (/used to.+now|but here|the problem/i.test(l)) f.push('P031-BAIT_AND_FLIP')
  if (!/https?:\/\//.test(text)) f.push('P010-NO_LINKS')
  if ((text.match(/#\w+/g) || []).length === 0) f.push('P011-ZERO_HASHTAGS')
  if (/\$[\d,]+|\d+%/.test(text.split('\n')[0] || '')) f.push('P028-SPECIFICITY_HOOK')
  if (/\?$/.test(text.split('\n').slice(-3).join(' ').trim())) f.push('P055-CLOSING_QUESTION')
  if (text.split('\n').filter(x => x.trim()).some(x => x.trim().split(' ').length <= 6)) f.push('P058-QUOTABLE_LINE')
  if (/\d\.\s/m.test(text)) f.push('P042-FRAMEWORK_STRUCTURE')
  return f
}
