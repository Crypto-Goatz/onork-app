/**
 * 0n Market Intel — AI Analyzer
 *
 * Reads aggregated market_skills, asks Groq (llama-3.3-70b-versatile)
 * to summarize the week's freelance market state, surfaces emerging
 * skills + blue ocean opportunities, and writes a market_snapshots row.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

interface SkillRow {
  skill: string
  category: string | null
  avg_budget: number | null
  listings_30d: number
  listings_7d: number
  growth_pct: number
  competition: string
  saturation_score: number
  trend: string
  top_buyer_location: string | null
  platforms: string[] | null
}

export interface AnalyzerResult {
  snapshot_date: string
  total_listings: number
  total_skills: number
  hot_skills: string[]
  rising_skills: string[]
  declining_skills: string[]
  ai_summary: string
}

function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

async function groqChat(prompt: string): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY missing')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a freelance market analyst for 0n Market Intel. ' +
            'Write tight, data-driven summaries grounded in the numbers provided. ' +
            'Never invent figures. Output plain prose unless JSON is explicitly requested.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 900,
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Groq error ${res.status}: ${txt.slice(0, 200)}`)
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return json.choices?.[0]?.message?.content?.trim() || ''
}

export async function analyze(): Promise<AnalyzerResult> {
  const sb = admin()

  const { data: skillsData, error: skillsErr } = await sb
    .from('market_skills')
    .select('skill, category, avg_budget, listings_30d, listings_7d, growth_pct, competition, saturation_score, trend, top_buyer_location, platforms')
    .order('listings_30d', { ascending: false })
    .limit(120)

  if (skillsErr) throw new Error(`market_skills query failed: ${skillsErr.message}`)
  const skills = (skillsData || []) as SkillRow[]

  const { count: listingsCount } = await sb
    .from('market_listings')
    .select('*', { count: 'exact', head: true })
    .gte('scraped_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const sortedByGrowth = [...skills].sort((a, b) => b.growth_pct - a.growth_pct)
  const hotSkills = skills
    .filter((s) => s.trend === 'hot')
    .slice(0, 10)
    .map((s) => s.skill)
  const risingSkills = sortedByGrowth.slice(0, 10).map((s) => s.skill)
  const decliningSkills = [...skills]
    .filter((s) => s.trend === 'down')
    .sort((a, b) => a.growth_pct - b.growth_pct)
    .slice(0, 10)
    .map((s) => s.skill)

  const blueOcean = skills
    .filter((s) => s.saturation_score < 40 && (s.avg_budget || 0) > 0)
    .sort((a, b) => (b.avg_budget || 0) - (a.avg_budget || 0))
    .slice(0, 10)

  const topOpportunities = blueOcean.map((s) => ({
    skill: s.skill,
    category: s.category,
    avg_budget: s.avg_budget,
    saturation: s.saturation_score,
    growth_pct: s.growth_pct,
    listings_30d: s.listings_30d,
  }))

  // Compact prompt — only data-bearing fields
  const skillSummary = skills
    .slice(0, 60)
    .map(
      (s) =>
        `- ${s.skill} (${s.category || 'Other'}): 30d=${s.listings_30d}, 7d=${s.listings_7d}, growth=${s.growth_pct}%, sat=${s.saturation_score}, comp=${s.competition}, trend=${s.trend}, avg=$${s.avg_budget?.toFixed(0) || 'n/a'}`
    )
    .join('\n')

  const prompt = `Below is this week's aggregated freelance market data across Upwork, Reddit r/forhire, Hacker News, and GitHub trending.

Total listings (30d): ${listingsCount || 0}
Total skills tracked: ${skills.length}

Per-skill stats:
${skillSummary}

Write a 200-280 word weekly market intelligence brief for freelancers and agencies. Cover:

1. **Top hot skills** — what's surging and why (use the growth + listings data).
2. **Blue ocean opportunities** — high pay, low saturation. Cite specific skills + numbers.
3. **Saturated / declining markets** — where competition is brutal or demand is falling.
4. **Geographic / platform notes** — anything notable about buyer locations or platform mix.
5. **Strategic recommendation** — one concrete move a freelancer should make this week.

Be specific. Use numbers from the data. No filler. Markdown formatting allowed (bold, bullets).`

  const aiSummary = await groqChat(prompt)

  const snapshotDate = new Date().toISOString().slice(0, 10)
  const row = {
    snapshot_date: snapshotDate,
    total_listings: listingsCount || 0,
    total_skills: skills.length,
    hot_skills: hotSkills,
    rising_skills: risingSkills,
    declining_skills: decliningSkills,
    top_opportunities: topOpportunities,
    ai_summary: aiSummary,
  }

  const { error: snapErr } = await sb
    .from('market_snapshots')
    .upsert(row, { onConflict: 'snapshot_date' })
  if (snapErr) throw new Error(`market_snapshots upsert failed: ${snapErr.message}`)

  return {
    snapshot_date: snapshotDate,
    total_listings: listingsCount || 0,
    total_skills: skills.length,
    hot_skills: hotSkills,
    rising_skills: risingSkills,
    declining_skills: decliningSkills,
    ai_summary: aiSummary,
  }
}
