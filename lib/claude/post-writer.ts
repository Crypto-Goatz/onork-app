import { scoreContent, type VPISScores } from '@/lib/vpis/formula'

const GROQ_KEY = process.env.GROQ_API_KEY!
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

export type HookArchetype = 'absolute_declaration' | 'bait_flip' | 'contrarian' | 'specificity' | 'confession'

const HOOK_TEMPLATES: Record<HookArchetype, string> = {
  absolute_declaration: 'Open with a single, bold declarative sentence. No hedging. State it like a fact the reader needs to hear.',
  bait_flip:           'Start with a statement that seems like one thing, then immediately subvert it in line 2. The bait sets up the flip.',
  contrarian:          'Take the popular opinion in your niche and argue the exact opposite. Back it with a data point or observation.',
  specificity:         'Lead with a specific number, metric, or result that stops the scroll. Make it real and precise (e.g., "46.7% CTR drop").',
  confession:          'Admit a past mistake, wasted time, or wrong belief. Contrast it with what you know now.',
}

const VIBE_RULES = `
WRITING RULES — NON-NEGOTIABLE:
- First line is the hook. Max 12 words. No filler.
- Paragraphs: 1–3 lines max. White space is intentional.
- No corporate speak: no "synergy", "leverage", "paradigm", "utilize".
- Write like a peer, not a brand. First person. Direct.
- Specificity > vagueness. Numbers beat adjectives.
- End with a question or soft CTA — never a hard sell.
- No hashtag walls. Max 5 relevant hashtags at the bottom.
- No emojis unless they punctuate a point (max 2 total).
- LinkedIn format: short punchy lines, intentional line breaks.
- Sound human. Sound smart. Sound like someone worth following.
`.trim()

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: 'low',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens: 600,
    }),
  })
  if (!res.ok) throw new Error(`Groq error: ${res.status}`)
  const json = await res.json()
  return json.choices[0].message.content.trim()
}

function buildPrompt(opts: GeneratePostOptions, hookArchetype: HookArchetype, previousPost?: string, previousScore?: number): string {
  const hookInstruction = HOOK_TEMPLATES[hookArchetype]
  const rewriteContext = previousPost && previousScore !== undefined
    ? `\nPREVIOUS ATTEMPT (VPIS: ${previousScore}/100 — needs improvement):\n---\n${previousPost}\n---\nRewrite it. Keep the core insight, dramatically improve the hook and structure.\n`
    : ''

  return `${VIBE_RULES}

HOOK ARCHETYPE: ${hookArchetype.toUpperCase()}
${hookInstruction}

NICHE/CONTEXT: ${opts.niche ?? 'B2B SaaS, AI automation, agency growth'}
TONE: ${opts.tone ?? 'thought_leader'}
ICP KEYWORDS TO NATURALLY USE (1-3): ${(opts.icpKeywords ?? []).slice(0, 5).join(', ') || 'AI, automation, clients'}
${rewriteContext}
Write a LinkedIn post. 250–450 words. No title or subject line. Just the post.`
}

export interface GeneratePostOptions {
  niche?: string
  tone?: 'thought_leader' | 'builder' | 'storyteller'
  icpKeywords?: string[]
  icpTitles?: string[]
  icpIndustries?: string[]
  hookArchetype?: HookArchetype
  botConfigId?: string
  vpisTarget?: number
  postHourEST?: number
}

export interface GeneratedPost {
  content: string
  vpis: VPISScores
  hook_archetype: HookArchetype
  rewrite_count: number
}

export async function generatePost(opts: GeneratePostOptions = {}): Promise<GeneratedPost> {
  const target = opts.vpisTarget ?? 85
  const maxRewrites = 3
  const archetypes: HookArchetype[] = ['absolute_declaration', 'bait_flip', 'contrarian', 'specificity', 'confession']
  const hookArchetype = opts.hookArchetype ?? archetypes[Math.floor(Math.random() * archetypes.length)]

  let content = ''
  let vpis: VPISScores | null = null
  let rewriteCount = 0
  let lastScore = 0

  for (let attempt = 0; attempt <= maxRewrites; attempt++) {
    const prompt = buildPrompt(opts, hookArchetype, attempt > 0 ? content : undefined, attempt > 0 ? lastScore : undefined)
    content = await callGroq(prompt)
    vpis = await scoreContent(content, 'post', {
      targetKeywords: opts.icpKeywords,
    })
    lastScore = vpis.composite
    if (vpis.composite >= target) break
    if (attempt < maxRewrites) rewriteCount++
  }

  return { content, vpis: vpis!, hook_archetype: hookArchetype, rewrite_count: rewriteCount }
}
