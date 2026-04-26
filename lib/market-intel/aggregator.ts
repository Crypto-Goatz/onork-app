/**
 * 0n Market Intel — Aggregator
 *
 * Reads raw listings from market_listings, computes per-skill stats,
 * upserts into market_skills, and writes per-period rows into market_trends.
 *
 * Outputs:
 *   - avg_budget, avg_sold (for fixed-price listings)
 *   - listings_30d, listings_7d, prev_30d (counts)
 *   - growth_pct (7d vs prior 7d, normalized)
 *   - competition (Low / Medium / High / Very High based on saturation)
 *   - saturation_score (0-100; high = oversaturated)
 *   - trend (hot / up / flat / down)
 *   - top_buyer_location, top_seller_location, platforms[]
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface RawListing {
  platform: string
  skill: string
  category: string | null
  budget_min: number | null
  budget_max: number | null
  fixed_price: number | null
  buyer_location: string | null
  seller_location: string | null
  proposals_count: number | null
  scraped_at: string
}

export interface AggregatorResult {
  skills_processed: number
  trends_inserted: number
  duration_ms: number
}

function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

function topOf(arr: (string | null)[]): string | undefined {
  const counts = new Map<string, number>()
  for (const v of arr) {
    if (!v) continue
    counts.set(v, (counts.get(v) || 0) + 1)
  }
  let bestKey: string | undefined
  let bestCount = 0
  for (const [k, c] of counts) {
    if (c > bestCount) {
      bestCount = c
      bestKey = k
    }
  }
  return bestKey
}

function listingBudget(l: RawListing): number | null {
  if (l.fixed_price) return l.fixed_price
  if (l.budget_min && l.budget_max) return (l.budget_min + l.budget_max) / 2
  if (l.budget_min) return l.budget_min
  if (l.budget_max) return l.budget_max
  return null
}

function classifyTrend(growth: number, count30: number): 'hot' | 'up' | 'flat' | 'down' {
  if (count30 < 3) return 'flat'
  if (growth >= 0.5) return 'hot'
  if (growth >= 0.1) return 'up'
  if (growth <= -0.2) return 'down'
  return 'flat'
}

function classifyCompetition(saturation: number): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (saturation < 30) return 'Low'
  if (saturation < 60) return 'Medium'
  if (saturation < 85) return 'High'
  return 'Very High'
}

export async function aggregate(): Promise<AggregatorResult> {
  const start = Date.now()
  const sb = admin()

  const since = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await sb
    .from('market_listings')
    .select('platform, skill, category, budget_min, budget_max, fixed_price, buyer_location, seller_location, proposals_count, scraped_at')
    .gte('scraped_at', since)
    .limit(20000)

  if (error) throw new Error(`market_listings query failed: ${error.message}`)
  const listings = (data || []) as RawListing[]

  const now = Date.now()
  const ms7 = 7 * 24 * 60 * 60 * 1000
  const ms30 = 30 * 24 * 60 * 60 * 1000

  const bySkill = new Map<string, RawListing[]>()
  for (const l of listings) {
    if (!l.skill) continue
    const arr = bySkill.get(l.skill) || []
    arr.push(l)
    bySkill.set(l.skill, arr)
  }

  // Saturation needs a reference: max 30d count across all skills
  const counts30 = new Map<string, number>()
  for (const [skill, arr] of bySkill) {
    const c = arr.filter((l) => now - new Date(l.scraped_at).getTime() <= ms30).length
    counts30.set(skill, c)
  }
  const maxCount30 = Math.max(1, ...counts30.values())

  const skillRows: Array<Record<string, unknown>> = []
  const trendRows: Array<Record<string, unknown>> = []
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - ms7)
  const periodStartStr = periodStart.toISOString().slice(0, 10)
  const periodEndStr = periodEnd.toISOString().slice(0, 10)

  for (const [skill, arr] of bySkill) {
    const last7 = arr.filter((l) => now - new Date(l.scraped_at).getTime() <= ms7)
    const last30 = arr.filter((l) => now - new Date(l.scraped_at).getTime() <= ms30)
    const prior7 = arr.filter((l) => {
      const age = now - new Date(l.scraped_at).getTime()
      return age > ms7 && age <= 2 * ms7
    })
    const prior30 = arr.filter((l) => {
      const age = now - new Date(l.scraped_at).getTime()
      return age > ms30 && age <= 2 * ms30
    })

    const budgets = last30.map(listingBudget).filter((v): v is number => v != null)
    const avgBudget = budgets.length
      ? budgets.reduce((a, b) => a + b, 0) / budgets.length
      : null
    const fixedSold = last30
      .filter((l) => l.fixed_price)
      .map((l) => l.fixed_price as number)
    const avgSold = fixedSold.length
      ? fixedSold.reduce((a, b) => a + b, 0) / fixedSold.length
      : null

    const proposals = last30
      .map((l) => l.proposals_count)
      .filter((v): v is number => v != null && v > 0)
    const avgProposals = proposals.length
      ? Math.round(proposals.reduce((a, b) => a + b, 0) / proposals.length)
      : null

    // Saturation: balance of supply (proposals) and listings vs the pool
    const baseSat = (last30.length / maxCount30) * 60
    const proposalSat = avgProposals ? Math.min(40, avgProposals * 1.5) : 0
    const saturation = Math.max(5, Math.min(100, Math.round(baseSat + proposalSat)))

    const growth = prior7.length === 0
      ? (last7.length > 0 ? 1 : 0)
      : (last7.length - prior7.length) / Math.max(1, prior7.length)

    const trend = classifyTrend(growth, last30.length)
    const competition = classifyCompetition(saturation)

    const platforms = Array.from(new Set(arr.map((l) => l.platform)))
    const category = arr.find((l) => l.category)?.category || null
    const topBuyer = topOf(arr.map((l) => l.buyer_location))
    const topSeller = topOf(arr.map((l) => l.seller_location))

    skillRows.push({
      skill,
      category,
      avg_budget: avgBudget,
      avg_sold: avgSold,
      listings_30d: last30.length,
      listings_7d: last7.length,
      growth_pct: Math.round(growth * 1000) / 10, // 1 decimal place
      prev_30d: prior30.length,
      competition,
      saturation_score: saturation,
      top_buyer_location: topBuyer,
      top_seller_location: topSeller,
      trend,
      platforms,
      updated_at: new Date().toISOString(),
    })

    trendRows.push({
      skill,
      period_start: periodStartStr,
      period_end: periodEndStr,
      listing_count: last7.length,
      avg_budget: avgBudget,
      avg_proposals: avgProposals,
    })
  }

  if (skillRows.length > 0) {
    const { error: upsertError } = await sb
      .from('market_skills')
      .upsert(skillRows, { onConflict: 'skill' })
    if (upsertError) throw new Error(`market_skills upsert failed: ${upsertError.message}`)
  }

  let trendsInserted = 0
  if (trendRows.length > 0) {
    const { error: trendError, count } = await sb
      .from('market_trends')
      .upsert(trendRows, { onConflict: 'skill,period_start', count: 'exact' })
    if (trendError) throw new Error(`market_trends upsert failed: ${trendError.message}`)
    trendsInserted = count || trendRows.length
  }

  return {
    skills_processed: skillRows.length,
    trends_inserted: trendsInserted,
    duration_ms: Date.now() - start,
  }
}
