/**
 * Aggregator — reads market_listings, computes per-skill stats, upserts into
 * market_skills, and writes daily time-series rows into market_trends.
 *
 * Run daily via /api/cron/market-aggregate.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

interface Listing {
  skill: string | null
  category: string | null
  budget_min: number | null
  budget_max: number | null
  budget_type: string | null
  platform: string
  client_country: string | null
  posted_at: string | null
  collected_at: string
  skills_tags: string[]
}

interface SkillBucket {
  skill: string
  category: string | null
  listings: Listing[]
  countriesByCount: Map<string, number>
  platformsByCount: Map<string, number>
  relatedByCount: Map<string, number>
}

function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function midpoint(l: Listing): number | null {
  if (l.budget_min != null && l.budget_max != null) return (l.budget_min + l.budget_max) / 2
  return l.budget_max ?? l.budget_min
}

function topN(map: Map<string, number>, n: number): Array<{ name: string; count: number }> {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }))
}

function competitionLevel(count7d: number): 'low' | 'medium' | 'high' {
  if (count7d >= 30) return 'high'
  if (count7d >= 8) return 'medium'
  return 'low'
}

function saturationScore(count7d: number, count30d: number, growth: number): number {
  // 0-100, weights heavy recent volume + steady 30d but penalizes negative growth
  const volume = Math.min(count7d / 50, 1) * 60
  const steady = Math.min(count30d / 200, 1) * 30
  const growthPenalty = growth < 0 ? Math.min(Math.abs(growth) / 2, 10) : 0
  return Math.round(Math.min(100, volume + steady - growthPenalty))
}

function trend(growth: number, count7d: number): 'hot' | 'up' | 'flat' | 'down' {
  if (growth >= 50 && count7d >= 10) return 'hot'
  if (growth >= 15) return 'up'
  if (growth <= -15) return 'down'
  return 'flat'
}

export interface AggregateResult {
  skillsProcessed: number
  trendsWritten: number
  errors: string[]
}

export async function runAggregator(): Promise<AggregateResult> {
  const sb = admin()
  const errors: string[] = []

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Pull recent listings
  const { data: rows, error } = await sb
    .from('market_listings')
    .select('skill, category, budget_min, budget_max, budget_type, platform, client_country, posted_at, collected_at, skills_tags')
    .gte('collected_at', ninetyDaysAgo)
    .not('skill', 'is', null)
    .limit(50000)

  if (error) {
    return { skillsProcessed: 0, trendsWritten: 0, errors: [error.message] }
  }

  const listings = (rows || []) as Listing[]
  const buckets = new Map<string, SkillBucket>()

  for (const l of listings) {
    if (!l.skill) continue
    let bucket = buckets.get(l.skill)
    if (!bucket) {
      bucket = {
        skill: l.skill,
        category: l.category,
        listings: [],
        countriesByCount: new Map(),
        platformsByCount: new Map(),
        relatedByCount: new Map(),
      }
      buckets.set(l.skill, bucket)
    }
    bucket.listings.push(l)
    bucket.platformsByCount.set(l.platform, (bucket.platformsByCount.get(l.platform) || 0) + 1)
    if (l.client_country) {
      bucket.countriesByCount.set(l.client_country, (bucket.countriesByCount.get(l.client_country) || 0) + 1)
    }
    for (const tag of l.skills_tags || []) {
      if (tag !== l.skill) {
        bucket.relatedByCount.set(tag, (bucket.relatedByCount.get(tag) || 0) + 1)
      }
    }
  }

  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  const skillRows: Record<string, unknown>[] = []
  const trendRows: Record<string, unknown>[] = []

  for (const bucket of buckets.values()) {
    const within = (cutoff: number) => bucket.listings.filter(l => {
      const t = l.posted_at ? new Date(l.posted_at).getTime() : new Date(l.collected_at).getTime()
      return t >= cutoff
    })

    const last7 = within(sevenDaysAgo)
    const prior7 = bucket.listings.filter(l => {
      const t = l.posted_at ? new Date(l.posted_at).getTime() : new Date(l.collected_at).getTime()
      return t >= fourteenDaysAgo && t < sevenDaysAgo
    })
    const last30 = within(thirtyDaysAgo)

    const budgets = bucket.listings.map(midpoint).filter((v): v is number => v != null && v > 0)
    const budgetsRecent = last30.map(midpoint).filter((v): v is number => v != null && v > 0)

    const count7 = last7.length
    const countPrior7 = prior7.length
    const growthPct = countPrior7 > 0
      ? ((count7 - countPrior7) / countPrior7) * 100
      : count7 > 0 ? 100 : 0

    const sat = saturationScore(count7, last30.length, growthPct)
    const trendValue = trend(growthPct, count7)

    const lastListingAt = bucket.listings
      .map(l => l.posted_at || l.collected_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null

    skillRows.push({
      skill: bucket.skill,
      category: bucket.category,
      avg_budget: avg(budgetsRecent),
      median_budget: median(budgetsRecent),
      budget_min: budgetsRecent.length ? Math.min(...budgetsRecent) : null,
      budget_max: budgetsRecent.length ? Math.max(...budgetsRecent) : null,
      listing_count_7d: count7,
      listing_count_30d: last30.length,
      listing_count_90d: bucket.listings.length,
      growth_pct: Math.round(growthPct * 100) / 100,
      competition_level: competitionLevel(count7),
      saturation_score: sat,
      trend: trendValue,
      top_locations: topN(bucket.countriesByCount, 5),
      top_platforms: topN(bucket.platformsByCount, 5),
      related_skills: topN(bucket.relatedByCount, 8),
      last_listing_at: lastListingAt,
      updated_at: new Date().toISOString(),
    })

    // Build daily time-series rows for the last 30 days
    const byDate = new Map<string, { count: number; budgets: number[]; platforms: Map<string, number> }>()
    for (const l of last30) {
      const ts = l.posted_at || l.collected_at
      const date = ts.slice(0, 10)
      let day = byDate.get(date)
      if (!day) {
        day = { count: 0, budgets: [], platforms: new Map() }
        byDate.set(date, day)
      }
      day.count += 1
      const m = midpoint(l)
      if (m != null && m > 0) day.budgets.push(m)
      day.platforms.set(l.platform, (day.platforms.get(l.platform) || 0) + 1)
    }
    for (const [date, day] of byDate.entries()) {
      trendRows.push({
        skill: bucket.skill,
        date,
        listing_count: day.count,
        avg_budget: avg(day.budgets),
        median_budget: median(day.budgets),
        platforms: Object.fromEntries(day.platforms.entries()),
      })
    }
  }

  // Upsert in batches
  for (let i = 0; i < skillRows.length; i += 500) {
    const chunk = skillRows.slice(i, i + 500)
    const { error: e } = await sb.from('market_skills').upsert(chunk, { onConflict: 'skill' })
    if (e) errors.push(`skills upsert: ${e.message}`)
  }

  for (let i = 0; i < trendRows.length; i += 1000) {
    const chunk = trendRows.slice(i, i + 1000)
    const { error: e } = await sb.from('market_trends').upsert(chunk, { onConflict: 'skill,date' })
    if (e) errors.push(`trends upsert: ${e.message}`)
  }

  return {
    skillsProcessed: skillRows.length,
    trendsWritten: trendRows.length,
    errors,
  }
}
