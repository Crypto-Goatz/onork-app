/**
 * Analyzer — uses Groq (llama-3.3-70b-versatile) to generate a weekly market
 * summary from the aggregated skill data, then writes a row into
 * market_snapshots keyed by week_start (Monday).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const GROQ_KEY = process.env.GROQ_API_KEY!
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

interface SkillRow {
  skill: string
  category: string | null
  avg_budget: number | null
  listing_count_7d: number
  listing_count_30d: number
  growth_pct: number | null
  saturation_score: number | null
  trend: string | null
  competition_level: string | null
}

function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function mondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDay() || 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1))
  return d.toISOString().slice(0, 10)
}

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a freelance market analyst. Output crisp, factual markdown — no fluff, no hedging, no emoji.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) throw new Error(`groq ${res.status}: ${await res.text()}`)
  const json = await res.json() as { choices: Array<{ message: { content: string } }> }
  return json.choices?.[0]?.message?.content?.trim() || ''
}

export interface AnalyzeResult {
  weekStart: string
  totalListings: number
  uniqueSkills: number
  hot: SkillRow[]
  declining: SkillRow[]
  emerging: SkillRow[]
  summary: string
}

export async function runAnalyzer(): Promise<AnalyzeResult> {
  const sb = admin()
  const weekStart = mondayOf(new Date())

  const { data: skillRows } = await sb
    .from('market_skills')
    .select('skill, category, avg_budget, listing_count_7d, listing_count_30d, growth_pct, saturation_score, trend, competition_level')
    .gt('listing_count_30d', 0)
    .order('listing_count_7d', { ascending: false })
    .limit(200)

  const skills = (skillRows || []) as SkillRow[]

  const hot = skills
    .filter(s => s.trend === 'hot' || (s.growth_pct ?? 0) >= 30)
    .sort((a, b) => (b.growth_pct ?? 0) - (a.growth_pct ?? 0))
    .slice(0, 10)

  const declining = skills
    .filter(s => (s.growth_pct ?? 0) <= -20)
    .sort((a, b) => (a.growth_pct ?? 0) - (b.growth_pct ?? 0))
    .slice(0, 10)

  const emerging = skills
    .filter(s => s.listing_count_7d >= 3 && s.listing_count_7d <= 12 && (s.growth_pct ?? 0) >= 50)
    .slice(0, 10)

  const categoryTotals = new Map<string, number>()
  for (const s of skills) {
    if (!s.category) continue
    categoryTotals.set(s.category, (categoryTotals.get(s.category) || 0) + s.listing_count_7d)
  }
  const topCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }))

  const totalListings = skills.reduce((s, x) => s + x.listing_count_7d, 0)

  // Build a compact data block for the LLM
  const dataBlock = JSON.stringify({
    week_start: weekStart,
    total_listings_last_7d: totalListings,
    unique_skills: skills.length,
    top_categories: topCategories,
    hot_skills: hot.map(s => ({ skill: s.skill, category: s.category, count_7d: s.listing_count_7d, growth_pct: s.growth_pct, avg_budget: s.avg_budget })),
    declining_skills: declining.map(s => ({ skill: s.skill, category: s.category, count_7d: s.listing_count_7d, growth_pct: s.growth_pct })),
    emerging_skills: emerging.map(s => ({ skill: s.skill, category: s.category, count_7d: s.listing_count_7d, growth_pct: s.growth_pct })),
  }, null, 2)

  const prompt = `Below is the latest freelance market data, aggregated from public sources (Upwork, Reddit r/forhire, HackerNews Who is Hiring).

Write a weekly market intelligence brief in markdown. Include these sections:
1. **Headline** — one sentence on the dominant story this week.
2. **What's hot** — 3-5 bullets on rising skills with concrete numbers.
3. **What's cooling** — 2-3 bullets on declining skills.
4. **Emerging opportunities** — 2-3 bullets on early-stage skills with high growth.
5. **Pricing snapshot** — average budgets where notable.
6. **Recommendation for freelancers** — one paragraph, concrete action.

Be specific. Use the numbers. No filler. No emoji. Under 500 words.

DATA:
\`\`\`json
${dataBlock}
\`\`\``

  let summary = ''
  try {
    summary = await callGroq(prompt)
  } catch (e) {
    summary = `Generation failed: ${e instanceof Error ? e.message : String(e)}`
  }

  await sb.from('market_snapshots').upsert({
    week_start: weekStart,
    summary,
    hot_skills: hot,
    declining_skills: declining,
    emerging_skills: emerging,
    top_categories: topCategories,
    total_listings: totalListings,
    unique_skills: skills.length,
    insights: { generated_at: new Date().toISOString() },
    generated_by: `groq:${MODEL}`,
  }, { onConflict: 'week_start' })

  return {
    weekStart,
    totalListings,
    uniqueSkills: skills.length,
    hot,
    declining,
    emerging,
    summary,
  }
}
