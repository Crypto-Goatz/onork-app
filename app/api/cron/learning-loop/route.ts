/**
 * VPIS Learning Loop — Weekly Cron
 * GET /api/cron/learning-loop — gradient descent on formula weights using engagement deltas
 * Schedule: "0 10 * * 1" (10am EST every Monday)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Gradient step (configurable per weight row, default 0.01)
const MIN_WEIGHT = 0.02
const MAX_WEIGHT = 0.45

interface EngagementRow {
  queue_item_id: string
  likes: number
  comments: number
  shares: number
  clicks: number
  vpis_score_at_post: number
  vpis_breakdown: {
    hook: number; emotion: number; platform: number; viral: number
    specificity: number; structure: number; keywords: number; cta: number
  }
}

// Map VPIS breakdown factor to weight column name
const FACTOR_TO_WEIGHT: Record<string, string> = {
  hook: 'hook_weight',
  emotion: 'emotion_weight',
  platform: 'platform_weight',
  viral: 'viral_weight',
  specificity: 'specificity_weight',
  structure: 'structure_weight',
  keywords: 'keywords_weight',
  cta: 'cta_weight',
}

function computeEngagementScore(row: EngagementRow): number {
  // Weighted engagement: comments > shares > likes > clicks
  return row.likes * 1 + row.comments * 3 + row.shares * 2 + row.clicks * 0.5
}

function normalize(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  const out: Record<string, number> = {}
  for (const k in weights) out[k] = parseFloat((weights[k] / total).toFixed(4))
  // Fix rounding: add remainder to largest weight
  const roundingError = 1 - Object.values(out).reduce((a, b) => a + b, 0)
  const largest = Object.keys(out).reduce((a, b) => out[a] > out[b] ? a : b)
  out[largest] = parseFloat((out[largest] + roundingError).toFixed(4))
  return out
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch engagement data from the past week that has VPIS breakdown
  const { data: engagementRows } = await admin
    .from('bot_engagement')
    .select('queue_item_id, likes, comments, shares, clicks, vpis_score_at_post')
    .gte('recorded_at', weekAgo)
    .not('queue_item_id', 'is', null)

  if (!engagementRows?.length) {
    return NextResponse.json({ message: 'No engagement data this week — skipping learning loop' })
  }

  // Fetch VPIS breakdowns for those queue items
  const queueIds = engagementRows.map(r => r.queue_item_id)
  const { data: queueItems } = await admin
    .from('bot_queue')
    .select('id, vpis_breakdown, bot_config_id')
    .in('id', queueIds)

  if (!queueItems?.length) {
    return NextResponse.json({ message: 'No queue items found — skipping' })
  }

  const breakdownMap: Record<string, { breakdown: EngagementRow['vpis_breakdown']; botConfigId: string }> = {}
  for (const qi of queueItems) {
    if (qi.vpis_breakdown?.breakdown) {
      breakdownMap[qi.id] = { breakdown: qi.vpis_breakdown.breakdown, botConfigId: qi.bot_config_id }
    }
  }

  // Group by bot_config_id for per-bot learning
  const byConfig: Record<string, Array<{ eng: number; breakdown: EngagementRow['vpis_breakdown'] }>> = {}
  for (const row of engagementRows) {
    const entry = breakdownMap[row.queue_item_id]
    if (!entry) continue
    const engScore = computeEngagementScore(row as EngagementRow)
    if (!byConfig[entry.botConfigId]) byConfig[entry.botConfigId] = []
    byConfig[entry.botConfigId].push({ eng: engScore, breakdown: entry.breakdown })
  }

  // Also update global (NULL bot_config_id) using all data
  const allData = Object.values(byConfig).flat()

  const updates: Array<{ botConfigId: string | null; newWeights: Record<string, number> }> = []

  for (const [botConfigId, data] of [...Object.entries(byConfig), ['__global__', allData] as [string, typeof allData]]) {
    const realConfigId = botConfigId === '__global__' ? null : botConfigId

    // Load current active weights
    const weightQuery = admin
      .from('vpis_formula_weights')
      .select('*')
      .eq('active', true)
      .order('version', { ascending: false })
      .limit(1)

    if (realConfigId) weightQuery.eq('bot_config_id', realConfigId)
    else weightQuery.is('bot_config_id', null)

    const { data: currentWeightRow } = await weightQuery.single()
    if (!currentWeightRow) continue

    const avgEng = data.reduce((sum, d) => sum + d.eng, 0) / data.length

    // Gradient: for each factor, correlate factor score × engagement vs avg
    const gradients: Record<string, number> = {}
    for (const factor of Object.keys(FACTOR_TO_WEIGHT)) {
      const factorScores = data.map(d => d.breakdown?.[factor as keyof typeof d.breakdown] ?? 0)
      const avgFactor = factorScores.reduce((a, b) => a + b, 0) / factorScores.length
      // Covariance proxy: if high factor score → high engagement, increase weight
      const cov = data.reduce((sum, d, i) => {
        return sum + (factorScores[i] - avgFactor) * (d.eng - avgEng)
      }, 0) / data.length
      gradients[factor] = cov
    }

    const step = currentWeightRow.gradient_step ?? 0.01
    const newWeights: Record<string, number> = {}

    for (const [factor, weightCol] of Object.entries(FACTOR_TO_WEIGHT)) {
      const current = currentWeightRow[weightCol] as number
      const grad = gradients[factor] ?? 0
      // Ascent: increase weight if positive covariance
      const updated = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, current + step * Math.sign(grad)))
      newWeights[weightCol] = updated
    }

    const normalized = normalize(newWeights)

    // Insert new version (keep old as inactive)
    await admin.from('vpis_formula_weights').update({ active: false }).eq('id', currentWeightRow.id)
    await admin.from('vpis_formula_weights').insert({
      bot_config_id: realConfigId,
      version: (currentWeightRow.version ?? 1) + 1,
      active: true,
      ...normalized,
      gradient_step: step,
    })

    updates.push({ botConfigId: realConfigId, newWeights: normalized })
  }

  return NextResponse.json({
    message: 'Learning loop complete',
    configs_updated: updates.length,
    data_points: allData.length,
    updates,
  })
}
