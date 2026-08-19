/**
 * AI Matching Engine — takes a user's linked freelance profile(s) and matches
 * against the aggregated market_skills data to surface:
 *
 *   1. Direct opportunities — skills they have with high demand & low competition
 *   2. Trending matches      — skills they have that are growing fast
 *   3. Build suggestions     — productized services / apps they could ship
 *   4. Skill gap analysis    — adjacent skills that would unlock more gigs
 *
 * Scoring (each 0-100):
 *   overall = relevance * 0.30 + demand * 0.25 + (100 - competition) * 0.25 + profit * 0.20
 *
 * Final ranking + descriptions come from Groq openai/gpt-oss-120b.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { MarketProfile } from './profile-scraper'

const GROQ_KEY = process.env.GROQ_API_KEY!
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

interface SkillRow {
  skill: string
  category: string | null
  avg_budget: number | null
  median_budget: number | null
  listing_count_7d: number
  listing_count_30d: number
  growth_pct: number | null
  competition_level: string | null
  saturation_score: number | null
  trend: string | null
  related_skills: Array<{ name: string; count: number }>
}

export interface MarketMatch {
  user_id: string
  match_type: 'opportunity' | 'trending' | 'build_suggestion' | 'skill_gap'
  title: string
  description: string
  relevance_score: number
  demand_score: number
  competition_score: number
  profit_potential: number
  overall_score: number
  related_skills: string[]
  related_listings?: unknown
  suggested_price_range?: { min: number; max: number; currency: string } | null
  suggested_action?: string | null
  app_idea?: string | null
  tech_stack?: string[]
  estimated_build_time?: string | null
  potential_revenue?: string | null
  workflow_steps?: unknown
}

function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#.]/g, '')
}

function skillsOverlap(userSkills: string[], skill: string, related: Array<{ name: string }>): number {
  const userSet = new Set(userSkills.map(normalize))
  if (userSet.has(normalize(skill))) return 100
  const relatedHits = related.filter(r => userSet.has(normalize(r.name))).length
  if (relatedHits >= 2) return 70
  if (relatedHits === 1) return 45
  // Partial token overlap
  const skillTokens = normalize(skill).split(/[+#.]/).filter(Boolean)
  for (const t of skillTokens) {
    if (t.length >= 4 && userSet.has(t)) return 35
  }
  return 0
}

function demandScore(count7d: number): number {
  // Log-ish scaling: 5 listings = 25, 50 = 70, 200+ = 100
  if (count7d <= 0) return 0
  return Math.min(100, Math.round(20 + Math.log10(count7d + 1) * 35))
}

function competitionScore(level: string | null, saturation: number | null): number {
  // Higher = more competition (worse). We invert later for overall score.
  const sat = saturation ?? 50
  const levelBonus = level === 'high' ? 20 : level === 'medium' ? 10 : 0
  return Math.min(100, sat + levelBonus)
}

function profitScore(avgBudget: number | null): number {
  if (!avgBudget || avgBudget <= 0) return 30
  if (avgBudget >= 5000) return 100
  if (avgBudget >= 2500) return 80
  if (avgBudget >= 1000) return 60
  if (avgBudget >= 500) return 45
  return 30
}

function computeOverall(relevance: number, demand: number, competition: number, profit: number): number {
  return Math.round(relevance * 0.30 + demand * 0.25 + (100 - competition) * 0.25 + profit * 0.20)
}

interface RankedSkill {
  skill: SkillRow
  relevance: number
  demand: number
  competition: number
  profit: number
  overall: number
}

function rankSkills(profiles: MarketProfile[], skills: SkillRow[]): RankedSkill[] {
  const allUserSkills = Array.from(new Set(profiles.flatMap(p => p.skills || [])))
  if (allUserSkills.length === 0) return []

  const ranked: RankedSkill[] = []
  for (const s of skills) {
    const related = Array.isArray(s.related_skills) ? s.related_skills : []
    const relevance = skillsOverlap(allUserSkills, s.skill, related)
    if (relevance === 0) continue
    const demand = demandScore(s.listing_count_7d)
    const competition = competitionScore(s.competition_level, s.saturation_score)
    const profit = profitScore(s.avg_budget)
    const overall = computeOverall(relevance, demand, competition, profit)
    ranked.push({ skill: s, relevance, demand, competition, profit, overall })
  }
  return ranked.sort((a, b) => b.overall - a.overall)
}

interface GroqMatchEnvelope {
  matches: Array<{
    title: string
    description: string
    suggested_action?: string
    suggested_price_range?: { min: number; max: number; currency: string }
  }>
}

interface GroqBuildEnvelope {
  builds: Array<{
    title: string
    description: string
    app_idea: string
    tech_stack: string[]
    estimated_build_time: string
    potential_revenue: string
    suggested_action: string
    workflow_steps: Array<{ step: number; title: string; detail: string }>
    relevance: number
    demand: number
    competition: number
    profit: number
  }>
}

interface GroqGapEnvelope {
  gaps: Array<{
    title: string
    description: string
    missing_skill: string
    suggested_action: string
    relevance: number
    demand: number
    competition: number
    profit: number
  }>
}

async function callGroqJson<T>(prompt: string, system: string, maxTokens = 2000): Promise<T> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(75000),
  })
  if (!res.ok) throw new Error(`groq ${res.status}: ${await res.text()}`)
  const json = await res.json() as { choices: Array<{ message: { content: string } }> }
  const content = json.choices?.[0]?.message?.content?.trim() || '{}'
  return JSON.parse(content) as T
}

async function describeOpportunities(
  profiles: MarketProfile[],
  ranked: RankedSkill[]
): Promise<MarketMatch[]> {
  if (ranked.length === 0) return []
  const top = ranked.slice(0, 8)
  const userSkills = Array.from(new Set(profiles.flatMap(p => p.skills || []))).slice(0, 25)
  const headline = profiles[0]?.headline || profiles[0]?.bio || ''

  const prompt = `User profile:
Headline: ${headline}
Skills: ${userSkills.join(', ')}

The following skills match the user's profile and have measured market demand. Write a concrete, actionable opportunity card for each.

Skill data:
\`\`\`json
${JSON.stringify(top.map(r => ({
  skill: r.skill.skill,
  category: r.skill.category,
  listings_7d: r.skill.listing_count_7d,
  listings_30d: r.skill.listing_count_30d,
  growth_pct: r.skill.growth_pct,
  avg_budget: r.skill.avg_budget,
  competition: r.skill.competition_level,
  saturation: r.skill.saturation_score,
})), null, 2)}
\`\`\`

For each skill, return one match. Output JSON:
{
  "matches": [
    {
      "title": "Short specific title — e.g. 'Next.js + Supabase apps in high demand'",
      "description": "2-3 sentences with the actual numbers (listings, growth, avg budget). Concrete, no fluff.",
      "suggested_action": "One specific next step the user should take this week.",
      "suggested_price_range": { "min": 1500, "max": 5000, "currency": "USD" }
    }
  ]
}

Return matches in the same order as the input. No emoji. No marketing speak.`

  const { matches } = await callGroqJson<GroqMatchEnvelope>(
    prompt,
    'You write concrete, data-driven freelance opportunity cards. Output JSON only.',
    2500
  )

  return matches.slice(0, top.length).map((m, i) => {
    const r = top[i]
    return {
      user_id: profiles[0].user_id,
      match_type: 'opportunity' as const,
      title: m.title,
      description: m.description,
      relevance_score: r.relevance,
      demand_score: r.demand,
      competition_score: r.competition,
      profit_potential: r.profit,
      overall_score: r.overall,
      related_skills: [r.skill.skill, ...(r.skill.related_skills || []).slice(0, 4).map(rs => rs.name)],
      suggested_price_range: m.suggested_price_range || null,
      suggested_action: m.suggested_action || null,
    }
  })
}

function describeTrending(profiles: MarketProfile[], ranked: RankedSkill[]): MarketMatch[] {
  const trending = ranked
    .filter(r => r.skill.trend === 'hot' || r.skill.trend === 'up' || (r.skill.growth_pct ?? 0) >= 25)
    .slice(0, 5)

  return trending.map(r => {
    const growth = Math.round(r.skill.growth_pct ?? 0)
    const budget = r.skill.avg_budget ? `$${Math.round(r.skill.avg_budget).toLocaleString()}` : 'unspecified'
    return {
      user_id: profiles[0].user_id,
      match_type: 'trending' as const,
      title: `${r.skill.skill} growing ${growth}% — position now`,
      description: `Your ${r.skill.skill} skill is ${r.skill.trend === 'hot' ? 'on fire' : 'rising'} with ${r.skill.listing_count_7d} listings/week and avg budget ${budget}. Move before saturation catches up.`,
      relevance_score: r.relevance,
      demand_score: r.demand,
      competition_score: r.competition,
      profit_potential: r.profit,
      overall_score: r.overall,
      related_skills: [r.skill.skill, ...(r.skill.related_skills || []).slice(0, 4).map(rs => rs.name)],
      suggested_action: 'Update profile to lead with this skill, raise rate by 15-25%, list 1-2 case studies.',
      suggested_price_range: r.skill.avg_budget
        ? { min: Math.round(r.skill.avg_budget * 0.7), max: Math.round(r.skill.avg_budget * 1.4), currency: 'USD' }
        : null,
    }
  })
}

async function generateBuildSuggestions(
  profiles: MarketProfile[],
  ranked: RankedSkill[],
  allSkills: SkillRow[]
): Promise<MarketMatch[]> {
  const userSkills = Array.from(new Set(profiles.flatMap(p => p.skills || [])))
  if (userSkills.length === 0 || ranked.length === 0) return []

  const headline = profiles[0]?.headline || profiles[0]?.bio || ''
  const topMatches = ranked.slice(0, 6)
  const hot = allSkills
    .filter(s => s.trend === 'hot' || (s.growth_pct ?? 0) >= 40)
    .slice(0, 8)

  const prompt = `User skills: ${userSkills.join(', ')}
Headline: ${headline}

Top opportunity skills (matched to user):
${JSON.stringify(topMatches.map(r => ({ skill: r.skill.skill, listings_7d: r.skill.listing_count_7d, avg_budget: r.skill.avg_budget, growth_pct: r.skill.growth_pct })), null, 2)}

Hot market skills (anyone — useful for combining with user skills):
${JSON.stringify(hot.map(s => ({ skill: s.skill, growth_pct: s.growth_pct, listings_7d: s.listing_count_7d, avg_budget: s.avg_budget })), null, 2)}

Generate 3 PRODUCTIZED SERVICE or APP IDEAS this user could build and sell. These should be specific, ship-able products — not vague suggestions. Combine the user's actual skills with current market demand.

Examples of the right level of specificity:
- "WordPress to Supabase Migration Tool — $2,500/migration, 2 weeks build, 10 clients/mo = $25K MRR"
- "AI CRM Automation Setup gig — $1,500 package, deliver in 2 hours using 0nCore"
- "Voice AI receptionist for med spas — $500/mo recurring, 90 min setup"

Output JSON:
{
  "builds": [
    {
      "title": "Short product name + one-line value prop",
      "description": "2-3 sentences explaining the market gap and why this user can capture it. Cite the numbers.",
      "app_idea": "What the product actually is — one paragraph.",
      "tech_stack": ["Next.js", "Supabase", "Stripe"],
      "estimated_build_time": "2 weeks",
      "potential_revenue": "$25K MRR @ 10 clients/mo",
      "suggested_action": "First concrete step this week.",
      "workflow_steps": [
        { "step": 1, "title": "Step name", "detail": "What happens" }
      ],
      "relevance": 85,
      "demand": 80,
      "competition": 40,
      "profit": 90
    }
  ]
}

3 builds. No fluff. Use real numbers from the data.`

  const { builds } = await callGroqJson<GroqBuildEnvelope>(
    prompt,
    'You design productized freelance services backed by market data. Output JSON only. Be specific.',
    3500
  )

  return builds.slice(0, 3).map(b => ({
    user_id: profiles[0].user_id,
    match_type: 'build_suggestion' as const,
    title: b.title,
    description: b.description,
    relevance_score: clamp(b.relevance),
    demand_score: clamp(b.demand),
    competition_score: clamp(b.competition),
    profit_potential: clamp(b.profit),
    overall_score: computeOverall(clamp(b.relevance), clamp(b.demand), clamp(b.competition), clamp(b.profit)),
    related_skills: b.tech_stack || [],
    app_idea: b.app_idea,
    tech_stack: b.tech_stack || [],
    estimated_build_time: b.estimated_build_time,
    potential_revenue: b.potential_revenue,
    workflow_steps: b.workflow_steps,
    suggested_action: b.suggested_action,
  }))
}

function clamp(n: number | undefined): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 50
  return Math.max(0, Math.min(100, Math.round(n)))
}

async function generateSkillGaps(
  profiles: MarketProfile[],
  ranked: RankedSkill[],
  allSkills: SkillRow[]
): Promise<MarketMatch[]> {
  const userSkills = new Set(profiles.flatMap(p => p.skills || []).map(normalize))
  if (userSkills.size === 0) return []

  // Adjacent skills: high-demand skills that share related-skill overlap with the user's
  // existing kit but the user does NOT currently list.
  const candidates: Array<{ skill: SkillRow; adjacencyScore: number }> = []
  for (const s of allSkills) {
    if (userSkills.has(normalize(s.skill))) continue
    if (s.listing_count_7d < 5) continue
    const related = Array.isArray(s.related_skills) ? s.related_skills : []
    const overlap = related.filter(r => userSkills.has(normalize(r.name))).length
    if (overlap < 2) continue
    candidates.push({ skill: s, adjacencyScore: overlap })
  }

  candidates.sort((a, b) => {
    const aScore = a.adjacencyScore * 10 + (a.skill.avg_budget || 0) / 100 + (a.skill.growth_pct || 0)
    const bScore = b.adjacencyScore * 10 + (b.skill.avg_budget || 0) / 100 + (b.skill.growth_pct || 0)
    return bScore - aScore
  })
  const top = candidates.slice(0, 4)
  if (top.length === 0) return []

  const userSkillsList = Array.from(new Set(profiles.flatMap(p => p.skills || []))).slice(0, 25)
  const prompt = `User skills: ${userSkillsList.join(', ')}

Adjacent skills the user does NOT currently list, but is close to:
${JSON.stringify(top.map(c => ({
  missing_skill: c.skill.skill,
  listings_7d: c.skill.listing_count_7d,
  avg_budget: c.skill.avg_budget,
  competition: c.skill.competition_level,
  saturation: c.skill.saturation_score,
  related: (c.skill.related_skills || []).slice(0, 5).map(r => r.name),
})), null, 2)}

For each missing skill, write a "skill gap" card explaining: why this user is close to having it, what they could earn by adding it, and the fastest way to legitimately add it (course, project, side build).

Output JSON:
{
  "gaps": [
    {
      "title": "Short title — 'Add Voice AI to unlock $5K avg gigs'",
      "description": "2-3 sentences with numbers and how their existing skills transfer.",
      "missing_skill": "Voice AI",
      "suggested_action": "Specific concrete step (build a demo, take X course, etc).",
      "relevance": 70,
      "demand": 80,
      "competition": 30,
      "profit": 90
    }
  ]
}`

  const { gaps } = await callGroqJson<GroqGapEnvelope>(
    prompt,
    'You spot adjacent skill opportunities for freelancers. Output JSON only.',
    2000
  )

  return gaps.slice(0, top.length).map((g, i) => {
    const c = top[i]
    return {
      user_id: profiles[0].user_id,
      match_type: 'skill_gap' as const,
      title: g.title,
      description: g.description,
      relevance_score: clamp(g.relevance),
      demand_score: clamp(g.demand),
      competition_score: clamp(g.competition),
      profit_potential: clamp(g.profit),
      overall_score: computeOverall(clamp(g.relevance), clamp(g.demand), clamp(g.competition), clamp(g.profit)),
      related_skills: [c.skill.skill, ...(c.skill.related_skills || []).slice(0, 4).map(rs => rs.name)],
      suggested_action: g.suggested_action || null,
      suggested_price_range: c.skill.avg_budget
        ? { min: Math.round(c.skill.avg_budget * 0.6), max: Math.round(c.skill.avg_budget * 1.5), currency: 'USD' }
        : null,
    }
  })
}

export interface MatchResult {
  user_id: string
  generated: number
  by_type: Record<string, number>
  errors: string[]
}

/**
 * Generate matches for a single user. Replaces any existing matches that are
 * still in `new` status — keeps `saved` and `acted_on` ones around.
 */
export async function generateMatches(userId: string): Promise<MatchResult> {
  const sb = admin()
  const errors: string[] = []

  const { data: profiles, error: profErr } = await sb
    .from('market_profiles')
    .select('*')
    .eq('user_id', userId)

  if (profErr) return { user_id: userId, generated: 0, by_type: {}, errors: [profErr.message] }
  const userProfiles = (profiles || []) as MarketProfile[]
  if (userProfiles.length === 0) {
    return { user_id: userId, generated: 0, by_type: {}, errors: ['no profiles linked'] }
  }

  const { data: skillsData, error: skillsErr } = await sb
    .from('market_skills')
    .select('skill, category, avg_budget, median_budget, listing_count_7d, listing_count_30d, growth_pct, competition_level, saturation_score, trend, related_skills')
    .gt('listing_count_30d', 0)
    .order('listing_count_7d', { ascending: false })
    .limit(500)

  if (skillsErr) return { user_id: userId, generated: 0, by_type: {}, errors: [skillsErr.message] }
  const skills = (skillsData || []) as SkillRow[]
  if (skills.length === 0) {
    return { user_id: userId, generated: 0, by_type: {}, errors: ['no aggregated market data'] }
  }

  const ranked = rankSkills(userProfiles, skills)

  const allMatches: MarketMatch[] = []

  try {
    const opps = await describeOpportunities(userProfiles, ranked)
    allMatches.push(...opps)
  } catch (e) {
    errors.push(`opportunities: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    allMatches.push(...describeTrending(userProfiles, ranked))
  } catch (e) {
    errors.push(`trending: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    const builds = await generateBuildSuggestions(userProfiles, ranked, skills)
    allMatches.push(...builds)
  } catch (e) {
    errors.push(`builds: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    const gaps = await generateSkillGaps(userProfiles, ranked, skills)
    allMatches.push(...gaps)
  } catch (e) {
    errors.push(`gaps: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Clear out previous `new` matches (preserve saved / acted_on / dismissed)
  await sb.from('market_matches').delete().eq('user_id', userId).eq('status', 'new')

  if (allMatches.length > 0) {
    const { error: insertErr } = await sb.from('market_matches').insert(
      allMatches.map(m => ({
        ...m,
        related_listings: m.related_listings ?? [],
      }))
    )
    if (insertErr) errors.push(`insert: ${insertErr.message}`)
  }

  const byType: Record<string, number> = {}
  for (const m of allMatches) byType[m.match_type] = (byType[m.match_type] || 0) + 1

  return { user_id: userId, generated: allMatches.length, by_type: byType, errors }
}
