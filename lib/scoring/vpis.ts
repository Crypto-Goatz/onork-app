/**
 * VPIS scorer — Groq-backed, JSON-strict output.
 *
 * Single source of truth for VPIS (Value · Passion · Insight · Story) so
 * Slack modal, /dashboard/vpis, the Chrome extension, and the canvas all
 * score identically.
 *
 * Hard rule (Groq-only): never call Anthropic / OpenAI in prod paths.
 */
import { groqJson } from '@/lib/groq'
import { resolveGroqKey, recordGroqUsage } from '@/lib/groq/router'

const USER_PROMPT = (text: string, tone: string) =>
  `Tone target: ${tone}\n\nText:\n"""\n${text}\n"""\n\nReturn JSON:\n{ "factors": [{ "key": "Value"|"Passion"|"Insight"|"Story", "value": number 0-25, "reason": string }], "patterns": string[], "total": number }`

export interface VpisFactor {
  key: 'Value' | 'Passion' | 'Insight' | 'Story'
  /** 0-25 numeric score per factor. Sum ≤ 100. */
  value: number
  /** One-line reason in plain language. */
  reason: string
}

export interface VpisResult {
  score: number // 0-100
  factors: VpisFactor[]
  patterns: string[] // patterns detected (e.g. "high-energy", "long-form", "story-arc")
  tone: string
  source: 'groq' | 'fallback'
  warning?: string
}

const SYSTEM_PROMPT = `You are the VPIS scorer. Score the user's text on four
factors, each 0-25, summing to a 0-100 total.

Factors:
- Value     (0-25): tangible benefit/insight delivered to the reader.
- Passion   (0-25): genuine energy and conviction; not hype.
- Insight   (0-25): novel angle or lived experience, not platitudes.
- Story     (0-25): narrative arc, named characters, scene, stakes.

Also identify up to 5 stylistic patterns (e.g. "high-energy", "long-form",
"story-arc", "list-form", "engaging-question", "data-citation",
"first-person", "case-study", "AI-generated-tone", "salesy").

Return STRICT JSON only, no prose.`

interface RawScore {
  factors?: Array<{ key?: string; value?: number; reason?: string }>
  patterns?: string[]
  total?: number
}

function fallback(text: string, tone: string, warning: string): VpisResult {
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const exclam = (text.match(/!/g) || []).length
  const value = Math.min(25, Math.max(5, Math.floor(wordCount / 4)))
  const passion = Math.min(25, exclam * 4 + (wordCount > 80 ? 6 : 2))
  const insight = Math.min(25, Math.floor(text.length / 100))
  const story = Math.min(25, /\b(we|i|our|my|then|after|when)\b/i.test(text) ? 18 : 6)
  const total = value + passion + insight + story
  return {
    score: Math.min(100, total),
    factors: [
      { key: 'Value', value, reason: 'fallback heuristic' },
      { key: 'Passion', value: passion, reason: 'fallback heuristic' },
      { key: 'Insight', value: insight, reason: 'fallback heuristic' },
      { key: 'Story', value: story, reason: 'fallback heuristic' },
    ],
    patterns: [
      ...(exclam > 2 ? ['high-energy'] : []),
      ...(wordCount > 80 ? ['long-form'] : []),
    ],
    tone,
    source: 'fallback',
    warning,
  }
}

export async function scoreVpis(
  text: string,
  tone = 'professional',
  userId?: string | null,
): Promise<VpisResult> {
  const trimmed = text.trim()
  if (!trimmed) {
    return fallback('', tone, 'empty input')
  }

  const key = await resolveGroqKey(userId ?? null)
  if (!key.apiKey) {
    return fallback(trimmed, tone, 'no Groq key — connect one at /dashboard/settings/groq')
  }
  if (key.exhausted) {
    return fallback(
      trimmed,
      tone,
      `monthly Groq quota reached (${key.quota?.used ?? 0}/${key.quota?.limit ?? 0}). Bring your own key at /dashboard/settings/groq for unlimited.`,
    )
  }

  try {
    const raw = await groqJson<RawScore>({
      system: SYSTEM_PROMPT,
      user: USER_PROMPT(trimmed, tone),
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 600,
      apiKey: key.apiKey,
    })
    if (!raw || !Array.isArray(raw.factors)) {
      return fallback(trimmed, tone, 'groq returned invalid shape')
    }
    const factorsOut: VpisFactor[] = []
    let computed = 0
    for (const k of ['Value', 'Passion', 'Insight', 'Story'] as const) {
      const f = raw.factors.find((x) => x?.key === k)
      const v = clamp(Number(f?.value ?? 0), 0, 25)
      computed += v
      factorsOut.push({
        key: k,
        value: v,
        reason: typeof f?.reason === 'string' ? f.reason : '',
      })
    }
    const score =
      typeof raw.total === 'number' ? clamp(Math.round(raw.total), 0, 100) : computed
    const patterns = Array.isArray(raw.patterns)
      ? raw.patterns.filter((p) => typeof p === 'string').slice(0, 5)
      : []
    if (key.shouldRecord && userId) {
      // Best-effort — never fail the call on usage write
      void recordGroqUsage(userId, 1)
    }
    return {
      score,
      factors: factorsOut,
      patterns,
      tone,
      source: 'groq',
    }
  } catch (err) {
    return fallback(
      trimmed,
      tone,
      `groq error: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}
