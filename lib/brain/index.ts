/**
 * Brain — the AI-first / self-learning foundation.
 *
 * Every add-on uses this. It enforces:
 *   1. Load the brief + brain on every action
 *   2. Call Groq to DECIDE what to do (not hardcode)
 *   3. Record the outcome
 *   4. Periodically update the brain content from outcomes
 *
 * If an add-on doesn't go through `think()` and `record()`, it's
 * automation, not AI. That's a hard rule.
 */

import { createClient } from '@supabase/supabase-js'
import { groqJSON } from '@/lib/service-packager/groq'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Types ───────────────────────────────────────────────────────────

export interface AppBrief {
  app_slug: string
  display_name: string
  agent_brief: string
  tools: Array<{ name: string; description: string }>
  default_brain: BrainContent
  version: number
}

export interface BrainContent {
  context?: string
  learned_patterns?: Array<{ pattern: string; confidence: number; sample_size: number }>
  preferences?: Record<string, unknown>
  confidence_scores?: Record<string, number>
  recent_titles?: string[]
  [key: string]: unknown
}

export interface BrainFile {
  user_id: string
  app_slug: string
  content: BrainContent
  outcomes_count: number
  successes_count: number
  last_updated_at: string
}

export interface RecentOutcome {
  action: string
  input: unknown
  decision: unknown
  output: unknown
  success: boolean
  user_feedback: string | null
  created_at: string
}

export interface Decision {
  tool: string
  params: Record<string, unknown>
  reasoning: string
  confidence: number
}

// ── Loaders ─────────────────────────────────────────────────────────

export async function loadBrief(appSlug: string): Promise<AppBrief | null> {
  const { data } = await admin().from('app_briefs').select('*').eq('app_slug', appSlug).maybeSingle()
  return (data as AppBrief | null) ?? null
}

/**
 * Load (or create) a user's brain for a specific add-on. Always returns —
 * if the row doesn't exist, it's created from default_brain.
 */
export async function loadBrain(userId: string, appSlug: string): Promise<BrainFile> {
  const sb = admin()
  const { data } = await sb
    .from('brain_files')
    .select('*')
    .eq('user_id', userId)
    .eq('app_slug', appSlug)
    .maybeSingle()

  if (data) return data as BrainFile

  // First-time use — seed from default_brain
  const brief = await loadBrief(appSlug)
  const seed = brief?.default_brain ?? {}
  const { data: created, error } = await sb
    .from('brain_files')
    .insert({ user_id: userId, app_slug: appSlug, content: seed })
    .select('*')
    .single()

  if (error || !created) {
    throw new Error(`failed to seed brain for ${appSlug}: ${error?.message}`)
  }
  return created as BrainFile
}

export async function loadRecentOutcomes(
  userId: string,
  appSlug: string,
  limit = 20
): Promise<RecentOutcome[]> {
  const { data } = await admin()
    .from('brain_outcomes')
    .select('action, input, decision, output, success, user_feedback, created_at')
    .eq('user_id', userId)
    .eq('app_slug', appSlug)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as RecentOutcome[]) ?? []
}

// ── The core loop ───────────────────────────────────────────────────

/**
 * Decide what to do. Loads brief + brain + recent outcomes, builds a Groq
 * prompt, returns a structured Decision the caller can execute.
 *
 * The caller is responsible for actually invoking the chosen tool —
 * `think()` only decides. After execution, call `record()` to close the loop.
 */
export async function think(
  userId: string,
  appSlug: string,
  userInput: string,
  extras?: Record<string, unknown>
): Promise<{ decision: Decision; brief: AppBrief; brain: BrainFile }> {
  const [brief, brain, recent] = await Promise.all([
    loadBrief(appSlug),
    loadBrain(userId, appSlug),
    loadRecentOutcomes(userId, appSlug, 10),
  ])

  if (!brief) throw new Error(`no app_brief for ${appSlug} — register it first`)

  const tools = brief.tools.map((t) => `- ${t.name}: ${t.description}`).join('\n')

  const recentSummary = recent.length
    ? recent
        .map((r) => {
          const dec = r.decision as Decision | null
          return `[${r.success ? '✓' : '✗'}] ${r.action} → ${dec?.tool ?? '?'}${r.user_feedback ? ` (user ${r.user_feedback})` : ''}`
        })
        .join('\n')
    : '(no past outcomes — first run)'

  const systemPrompt = `${brief.agent_brief}

AVAILABLE TOOLS:
${tools}

USER'S BRAIN (${brain.outcomes_count} past outcomes, ${brain.successes_count} successes):
${JSON.stringify(brain.content, null, 2)}

RECENT OUTCOMES:
${recentSummary}

ALWAYS return ONLY valid JSON:
{ "tool": "<tool name from the list>", "params": { ... }, "reasoning": "<one sentence>", "confidence": 0-100 }`

  const userPrompt = `USER INPUT: ${userInput}${extras ? `\n\nEXTRA CONTEXT:\n${JSON.stringify(extras, null, 2)}` : ''}`

  const decision = await groqJSON<Decision>(systemPrompt, userPrompt, { temperature: 0.3 })

  return { decision, brief, brain }
}

// ── Outcome recording + brain update ────────────────────────────────

export interface RecordInput {
  userId: string
  appSlug: string
  action: string
  input: unknown
  decision: Decision
  output: unknown
  success: boolean
  userFeedback?: string | null
  durationMs?: number
}

/**
 * Record an outcome AND incrementally update the brain. Updates:
 *   - outcomes_count / successes_count
 *   - recent_titles (rolling window of 20)
 *   - confidence_scores per tool (running success rate)
 *   - last_updated_at
 *
 * Heavier brain refactoring (pattern extraction) happens in a periodic job.
 */
export async function record(input: RecordInput): Promise<void> {
  const sb = admin()
  const dur = input.durationMs ?? null

  // 1. Append to brain_outcomes
  await sb.from('brain_outcomes').insert({
    user_id: input.userId,
    app_slug: input.appSlug,
    action: input.action,
    input: input.input,
    decision: input.decision,
    output: input.output,
    success: input.success,
    user_feedback: input.userFeedback ?? null,
    duration_ms: dur,
  })

  // 2. Bump counters + update rolling fields
  const { data: brain } = await sb
    .from('brain_files')
    .select('content, outcomes_count, successes_count')
    .eq('user_id', input.userId)
    .eq('app_slug', input.appSlug)
    .maybeSingle()

  if (!brain) return

  const content: BrainContent = (brain.content as BrainContent) ?? {}
  const outcomes_count = (brain.outcomes_count ?? 0) + 1
  const successes_count = (brain.successes_count ?? 0) + (input.success ? 1 : 0)

  // Tool confidence (running mean)
  const tool = input.decision.tool
  const scores = { ...(content.confidence_scores ?? {}) }
  const prevCount = scores[`${tool}_count`] ?? 0
  const prevRate = scores[tool] ?? 0
  const newCount = prevCount + 1
  const newRate = (prevRate * prevCount + (input.success ? 100 : 0)) / newCount
  scores[tool] = Math.round(newRate)
  scores[`${tool}_count`] = newCount

  // Recent titles (used for dedup + suggestions)
  const t = (input.input as { title?: string } | null)?.title
  const titles = Array.from(
    new Set(
      [t, ...(content.recent_titles ?? [])]
        .filter((x): x is string => Boolean(x))
        .slice(0, 20)
    )
  )

  await sb
    .from('brain_files')
    .update({
      content: { ...content, confidence_scores: scores, recent_titles: titles },
      outcomes_count,
      successes_count,
      last_updated_at: new Date().toISOString(),
    })
    .eq('user_id', input.userId)
    .eq('app_slug', input.appSlug)
}

/**
 * Manually patch a user's brain content. Use sparingly — most updates
 * should flow through record(). Useful for explicit user preferences.
 */
export async function updateBrainContent(
  userId: string,
  appSlug: string,
  patch: Partial<BrainContent>
): Promise<void> {
  const sb = admin()
  const { data } = await sb
    .from('brain_files')
    .select('content')
    .eq('user_id', userId)
    .eq('app_slug', appSlug)
    .maybeSingle()
  const merged = { ...((data?.content as BrainContent) ?? {}), ...patch }
  await sb
    .from('brain_files')
    .update({ content: merged, last_updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('app_slug', appSlug)
}
