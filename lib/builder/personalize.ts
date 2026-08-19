import type { Block, PageSpec, VisitorSignal } from './blocks'
import { sanitise } from './blocks'

/**
 * Rewrite a page's live blocks for the visitor in front of it.
 *
 * GEMINI FIRST, GROQ AS FALLBACK — matching the house decision. Server-side
 * only: the prototype read the key in the browser, which ships it to every
 * visitor.
 *
 * THE GUARDRAILS ARE THE FEATURE. Anyone can pipe a page through a model. What
 * makes this safe to point at a customer's live site:
 *
 *   frozen facts   prices, guarantees and contact details are passed as facts
 *                  the model must respect, and are never in the editable set
 *   neverSay       an explicit list the copy must not contradict
 *   length caps    enforced after generation, not requested politely
 *   whole-block    a block either personalises completely or falls back
 *                  completely — half-rewritten copy reads as broken
 *
 * FAILURE MEANS FALLBACK, ALWAYS. A slow model, a bad key or a refusal returns
 * the published words. The page a visitor sees is never worse than the page the
 * agency approved.
 */

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models'
const GROQ = 'https://api.groq.com/openai/v1/chat/completions'

export interface PersonalizeResult {
  blocks: Record<string, Record<string, string>>
  provider: 'gemini' | 'groq' | 'fallback'
  ms: number
  note?: string
}

function brief(page: PageSpec, blocks: Block[], v: VisitorSignal): string {
  const who = [
    v.name && `Name: ${v.name}`,
    v.company && `Company: ${v.company}`,
    v.industry && `Industry: ${v.industry}`,
    v.expertise && `Reads as: ${v.expertise}`,
    v.returning && 'Has visited before',
    v.exitIntent && 'Is about to leave — be direct, do not waffle',
    typeof v.scrollDepth === 'number' && v.scrollDepth > 60 && 'Has read most of the page already',
  ].filter(Boolean).join('. ')

  const depth =
    v.expertise === 'novice' ? 'Plain language. No jargon. Talk about outcomes, not mechanisms.'
    : v.expertise === 'expert' ? 'They know this field. Be specific and technical; do not over-explain.'
    : v.expertise === 'business' ? 'Lead with cost, time and risk. Skip the technical detail.'
    : 'Clear and concrete. Assume intelligence, not expertise.'

  return [
    `You are rewriting copy on ${page.brand.business}'s website${page.brand.sells ? `, which sells ${page.brand.sells}` : ''}.`,
    page.brand.tone ? `Tone: ${page.brand.tone}.` : '',
    depth,
    who ? `About this visitor — ${who}.` : 'Nothing is known about this visitor yet.',
    '',
    'HARD RULES:',
    '- Never state a price, guarantee, timeline or statistic that is not given to you as a FACT below.',
    '- If you do not know something, leave that field out entirely rather than guessing.',
    page.brand.neverSay?.length ? `- Never say or imply: ${page.brand.neverSay.join('; ')}.` : '',
    '- Respect every length limit. Longer answers are discarded.',
    '- No markdown, no quotes around values, no emoji.',
    '',
    'BLOCKS TO REWRITE:',
    ...blocks.map((b) => {
      const facts = b.frozen && Object.keys(b.frozen).length
        ? `\n    FACTS (must be respected, never rewritten): ${JSON.stringify(b.frozen)}` : ''
      return `  ${b.id} (${b.kind})${facts}\n` +
        b.editable.map((f) => `    - ${f.key}: ${f.intent} (max ${f.max} chars). Currently: "${b.fallback[f.key] ?? ''}"`).join('\n')
    }),
    '',
    'Reply as JSON only: { "<blockId>": { "<field>": "<new text>" } }',
  ].filter(Boolean).join('\n')
}

async function viaGemini(key: string, prompt: string, model: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${GEMINI}/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(9000),
  })
  if (!res.ok) throw new Error(`gemini ${res.status}`)
  const j = await res.json()
  const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') ?? '{}'
  return JSON.parse(text)
}

async function viaGroq(key: string, prompt: string, model: string): Promise<Record<string, unknown>> {
  const res = await fetch(GROQ, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, temperature: 0.6, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(9000),
  })
  if (!res.ok) throw new Error(`groq ${res.status}`)
  const j = await res.json()
  return JSON.parse(j?.choices?.[0]?.message?.content ?? '{}')
}

export async function personalize(page: PageSpec, visitor: VisitorSignal): Promise<PersonalizeResult> {
  const started = Date.now()
  const live = page.blocks.filter((b) => b.live && b.editable.length)
  if (!live.length) return { blocks: {}, provider: 'fallback', ms: 0, note: 'Nothing on this page is set to personalise.' }

  const prompt = brief(page, live, visitor)
  const gk = process.env.GEMINI_API_KEY
  const qk = process.env.GROQ_API_KEY

  const attempts: [PersonalizeResult['provider'], () => Promise<Record<string, unknown>>][] = []
  if (gk) attempts.push(['gemini', () => viaGemini(gk, prompt, process.env.GEMINI_MODEL || 'gemini-2.5-flash')])
  if (qk) attempts.push(['groq', () => viaGroq(qk, prompt, process.env.GROQ_MODEL || 'openai/gpt-oss-120b')])

  for (const [provider, run] of attempts) {
    try {
      const raw = await run()
      const out: Record<string, Record<string, string>> = {}
      for (const b of live) {
        const proposed = raw[b.id]
        if (!proposed || typeof proposed !== 'object') continue
        const clean = sanitise(b, proposed as Record<string, unknown>)
        // Whole block or nothing: a half-rewritten block reads as broken copy,
        // which is worse than the words the agency already approved.
        if (Object.keys(clean).length === b.editable.length) out[b.id] = clean
      }
      return { blocks: out, provider, ms: Date.now() - started }
    } catch (err) {
      console.warn(`[builder/personalize] ${provider} failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  return { blocks: {}, provider: 'fallback', ms: Date.now() - started, note: 'Kept the published copy.' }
}
