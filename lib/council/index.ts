/**
 * 0nCouncil — adversarial review for answers that have to be defensible.
 *
 * THE TOOL EXISTED AS A PROMISE. `ai_council_debate` has been registered on the
 * bridge for a long time and returns "requires the 0nAI server. Use
 * command.0nmcp.com/api/ai/council" — an endpoint that returns 404. This is the
 * implementation behind the name.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY IT REDUCES HALLUCINATION, AND WHY THAT CLAIM HAS LIMITS.
 *
 * A single model asked a question produces one fluent answer and no signal about
 * whether it is true. Fluency is not confidence, and a model's own stated
 * certainty is close to worthless — it is the most confident precisely when it
 * is inventing.
 *
 * What actually carries signal is DISAGREEMENT. Ask independently and models
 * converge on things that are in the world and diverge on things that were
 * generated. So:
 *
 *   1. ANSWER   — N models answer independently, never seeing each other.
 *                 Showing them one another's answers first destroys the whole
 *                 measurement: they anchor, converge, and agreement stops
 *                 meaning anything.
 *   2. REFUTE   — each model is then shown a rival answer and asked to find what
 *                 is WRONG with it. Refutation is a different task from
 *                 generation and catches different errors.
 *   3. ADJUDICATE — the verdict is a function of survival, not of eloquence.
 *
 * THE HONEST LIMIT: models from one provider share training data and failure
 * modes, so agreement between them is weaker evidence than agreement across
 * providers. A shared misconception survives a unanimous council. This is
 * recorded on every result as `independence`, because a verification tool that
 * overstates its own reliability is worse than no verification tool.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { groqChat } from '@/lib/groq'
import { createServiceClient } from '@/lib/connect/service-client'

/**
 * DIFFERENT MODEL FAMILIES, not one model asked three times.
 *
 * Three samples from one model measures sampling noise and calls it consensus.
 * What is wanted is models that were trained differently and therefore fail
 * differently — so Llama and the GPT-OSS family sit on the panel together.
 * Verified available on the provider before being listed here.
 *
 * This does not make the panel fully independent (see `independence` on the
 * result), but cross-family disagreement is far better evidence than
 * cross-temperature disagreement within one family.
 */
const PANEL = [
  // Was Llama-3.3-70B until Groq retired it. Qwen replaces it rather than a
  // third GPT-OSS size, because the point of the seat is a second *family* —
  // two sizes of one model agree for reasons that are not evidence.
  { id: 'qwen/qwen3.6-27b', label: 'Qwen3.6-27B' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS-120B' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS-20B' },
] as const

export type Verdict = 'supported' | 'disputed' | 'unsupported' | 'unanswerable'

export interface CouncilOpinion {
  model: string
  answer: string
  refutedOthers: boolean
  objection: string | null
}

export interface CouncilResult {
  question: string
  verdict: Verdict
  confidence: number
  synthesis: string
  agreement: number
  opinions: CouncilOpinion[]
  dissent: string[]
  wouldChangeTheAnswer: string | null
  independence: 'single-provider' | 'multi-provider'
  caveat: string
}

const ANSWER_SYSTEM = [
  'Answer the question directly and briefly — 3 sentences maximum.',
  'State ONLY what you are confident is factual.',
  'If you do not know, or the question cannot be answered from general knowledge,',
  'reply with exactly: UNKNOWN',
  'Never speculate. Never pad. No preamble.',
].join('\n')

const REFUTE_SYSTEM = [
  'You are reviewing another model\'s answer for factual errors.',
  'Your job is to REFUTE it, not to agree with it.',
  'Reply with JSON only:',
  '{"refuted": true|false, "objection": "<one sentence, or null>"}',
  'refuted=true only if something is factually wrong, unsupported, or invented.',
  'Stylistic disagreement is NOT refutation.',
  'If the answer says UNKNOWN, that is honest — refuted=false.',
].join('\n')

/** Normalised overlap of content words — cheap, explainable, no extra model call. */
function agreementScore(answers: string[]): number {
  const sets = answers.map(
    (a) =>
      new Set(
        a.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
          .filter((w) => w.length > 3),
      ),
  )
  if (sets.length < 2) return 1
  let total = 0
  let pairs = 0
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const inter = [...sets[i]].filter((w) => sets[j].has(w)).length
      const union = new Set([...sets[i], ...sets[j]]).size
      total += union ? inter / union : 0
      pairs++
    }
  }
  return pairs ? total / pairs : 0
}

export async function runCouncil(
  question: string,
  opts: { context?: string; domain?: string } = {},
): Promise<CouncilResult> {
  const q = question.trim().slice(0, 4000)
  const ctx = (opts.context ?? '').slice(0, 6000)
  const user = ctx ? `Context:\n${ctx}\n\nQuestion: ${q}` : q

  // ── 1. Independent answers. Parallel so none can see another. ──────────────
  const answers = await Promise.all(
    PANEL.map(async (m) => {
      try {
        const r = await groqChat({
          model: m.id,
          system: ANSWER_SYSTEM,
          user,
          temperature: 'temperature' in m ? (m as { temperature: number }).temperature : 0.2,
          max_tokens: 320,
        })
        return { label: m.label, model: m.id, text: (r.text || '').trim() }
      } catch {
        return { label: m.label, model: m.id, text: '' }
      }
    }),
  )

  const live = answers.filter((a) => a.text)
  if (live.length < 2) {
    return {
      question: q, verdict: 'unanswerable', confidence: 0,
      synthesis: 'The council could not be convened — too few models answered.',
      agreement: 0, opinions: [], dissent: [], wouldChangeTheAnswer: null,
      independence: 'single-provider',
      caveat: 'Fewer than two models responded, so no comparison was possible.',
    }
  }

  // Every member saying UNKNOWN is a RESULT, and a good one — it is the outcome
  // a single model almost never produces on its own.
  const unknowns = live.filter((a) => /^unknown\b/i.test(a.text)).length
  if (unknowns === live.length) {
    return {
      question: q, verdict: 'unanswerable', confidence: 0.9,
      synthesis: 'Every member declined to answer. This is not answerable from general knowledge — treat any confident answer to it as suspect.',
      agreement: 1, opinions: live.map((a) => ({ model: a.label, answer: 'UNKNOWN', refutedOthers: false, objection: null })),
      dissent: [], wouldChangeTheAnswer: 'A source document or a system of record containing this fact.',
      independence: 'single-provider',
      caveat: 'Unanimous abstention is strong evidence the question needs a source, not a model.',
    }
  }

  // ── 2. Cross-refutation. Each reviews a PEER's answer, never its own. ──────
  const reviews = await Promise.all(
    live.map(async (a, i) => {
      const target = live[(i + 1) % live.length]
      try {
        const r = await groqChat({
          model: a.model,
          system: REFUTE_SYSTEM,
          user: `Question: ${q}\n\nAnswer under review:\n${target.text}`,
          temperature: 0,
          max_tokens: 200,
          json: true,
        })
        const parsed = JSON.parse(r.text || '{}') as { refuted?: boolean; objection?: string | null }
        return { by: a.label, refuted: Boolean(parsed.refuted), objection: parsed.objection ?? null }
      } catch {
        // A failed review is NOT a refutation. Treating an error as a vote would
        // let an outage silently mark true things false.
        return { by: a.label, refuted: false, objection: null }
      }
    }),
  )

  const refutations = reviews.filter((r) => r.refuted)
  const agreement = agreementScore(live.map((a) => a.text))

  let verdict: Verdict
  if (refutations.length === 0 && agreement >= 0.35) verdict = 'supported'
  else if (refutations.length >= Math.ceil(live.length / 2)) verdict = 'unsupported'
  else verdict = 'disputed'

  // Confidence is built from survival and convergence — never from how sure a
  // model said it was.
  const survival = 1 - refutations.length / live.length
  const confidence = Math.round(Math.min(0.95, survival * 0.6 + agreement * 0.4) * 100) / 100

  const longest = [...live].sort((a, b) => b.text.length - a.text.length)[0]

  return {
    question: q,
    verdict,
    confidence,
    synthesis:
      verdict === 'supported'
        ? longest.text
        : verdict === 'disputed'
          ? `The council did not agree. Most representative answer: ${longest.text}`
          : 'The council rejected this. Do not rely on it without a source.',
    agreement: Math.round(agreement * 100) / 100,
    opinions: live.map((a, i) => ({
      model: a.label,
      answer: a.text,
      refutedOthers: reviews[i]?.refuted ?? false,
      objection: reviews[i]?.objection ?? null,
    })),
    dissent: refutations.map((r) => `${r.by}: ${r.objection ?? 'objected without stating why'}`),
    wouldChangeTheAnswer:
      verdict === 'supported'
        ? null
        : 'A citation, a source document, or a record from a system that holds this fact.',
    independence: 'single-provider',
    caveat:
      'Two model families (Llama and GPT-OSS) on one provider. Cross-family disagreement is ' +
      'real signal; a misconception common to both still survives a unanimous verdict.',
  }
}

/** Keep adjudicated answers so the same question is not re-litigated. */
export async function recordCouncil(result: CouncilResult, domain = 'general'): Promise<void> {
  const db = createServiceClient()
  if (!db) return
  try {
    await db.from('council_knowledge').insert({
      domain,
      question: result.question,
      synthesis: result.synthesis,
      composite_score: result.confidence,
      persona_votes: result.opinions,
      source: '0ncouncil',
      // Adjudications go stale like any other fact.
      expires_at: new Date(Date.now() + 180 * 86_400_000).toISOString(),
    })
  } catch (err) {
    console.error('[council] could not record:', err)
  }
}
