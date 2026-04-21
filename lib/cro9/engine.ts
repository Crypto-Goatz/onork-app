/**
 * CRO9 Engine orchestrator.
 *
 *   runAnalysis(site)   — daily: GSC → crawl → SERP → score → brief → persist
 *   runMeasurement(site) — daily: pick applied tasks past their measure window
 *                          and diff their metrics against baseline → update
 *                          adaptive weights
 *
 * Both return a SummaryReport that ends up in cro9_action_history + the
 * site's last_run_summary.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { crawl, type CrawlReport } from './crawl'
import { fetchByPage, fetchByPageQuery, primaryKeywordPerPage } from './gsc'
import { searchGoogle } from './serp'
import { generateBrief } from './brief'
import { scoreTask, DEFAULT_WEIGHTS, expectedCtrFor } from './score'
import { applyStep, computeAdjustment, toMap, toRows } from './weights'
import { decryptSecret } from './crypto'
import type { Bucket, ContentBrief, Factor, GscPageRow, PriorityAction, TaskOutput } from './types'

export interface Site {
  id: string
  user_id: string
  site_url: string
  domain: string
  gsc_property: string | null
  ga4_property_id: string | null
  apply_mode: string
  status: string
  serpapi_key_encrypted: string | null
  baseline_snapshot: unknown
}

export interface RunSummary {
  siteId: string
  pagesAnalyzed: number
  tasksGenerated: number
  tasksBriefed: number
  weightsAdjusted: number
  tasksMeasured: number
  durationMs: number
  errors: string[]
}

function getAdmin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function logAction(supabase: SupabaseClient, siteId: string, taskId: string | null, actionType: string, payload: unknown, outcome: unknown): Promise<void> {
  try {
    await supabase.from('cro9_action_history').insert({ site_id: siteId, task_id: taskId, action_type: actionType, payload, outcome })
  } catch { /* non-blocking */ }
}

// ---------------------------------------------------------------------------
// ANALYSIS — pulls fresh data, scores, generates briefs, persists tasks
// ---------------------------------------------------------------------------
export async function runAnalysis(site: Site, opts: { maxPages?: number; generateBriefs?: boolean } = {}): Promise<RunSummary> {
  const started = Date.now()
  const supabase = getAdmin()
  const summary: RunSummary = {
    siteId: site.id,
    pagesAnalyzed: 0, tasksGenerated: 0, tasksBriefed: 0, weightsAdjusted: 0, tasksMeasured: 0,
    durationMs: 0, errors: [],
  }

  if (!site.gsc_property) {
    summary.errors.push('gsc_property missing — connect Google Search Console first')
    await supabase.from('cro9_sites').update({
      last_run_at: new Date().toISOString(), last_run_status: 'error', last_run_summary: summary,
    }).eq('id', site.id)
    await logAction(supabase, site.id, null, 'error', { step: 'runAnalysis:precheck' }, summary)
    return { ...summary, durationMs: Date.now() - started }
  }

  // 1. Pull GSC data (by page and by page+query)
  let pageRows: GscPageRow[] = []
  let pageQueryRows: GscPageRow[] = []
  try {
    [pageRows, pageQueryRows] = await Promise.all([
      fetchByPage({ siteUrl: site.gsc_property, rowLimit: opts.maxPages || 50 }),
      fetchByPageQuery({ siteUrl: site.gsc_property, rowLimit: 1000 }),
    ])
  } catch (e) {
    summary.errors.push(`gsc_pull: ${errMsg(e)}`)
  }

  const kwMap = primaryKeywordPerPage(pageQueryRows)
  summary.pagesAnalyzed = pageRows.length

  // 2. Load current adaptive weights
  const { data: weightRows } = await supabase.from('cro9_adaptive_weights').select('*').eq('site_id', site.id)
  const weights = toMap((weightRows as { factor: string; value: number; update_count: number; last_updated: string }[] | null || []).map((r) => ({
    factor: r.factor as Factor, value: r.value, update_count: r.update_count, last_updated: r.last_updated,
  })))

  // 3. BYO SerpAPI key
  const serpKey = decryptSecret(site.serpapi_key_encrypted) || process.env.SERPAPI_KEY || ''

  // 4. Score every page → pick top N opportunities
  const scored: Array<{ task: TaskOutput; crawl: CrawlReport }> = []
  const maxPages = Math.min(pageRows.length, opts.maxPages || 15)
  const topPages = [...pageRows].sort((a, b) => b.impressions - a.impressions).slice(0, maxPages)

  for (const row of topPages) {
    try {
      const report = await crawl(row.url)
      const kw = kwMap.get(row.url)
      const primary = kw?.primary || extractGuessKeyword(report)
      const expected = expectedCtrFor(row.position)
      const ctrGap = Math.max(0, expected - row.ctr)

      const out = scoreTask({
        input: {
          url: row.url,
          primaryKeyword: primary,
          clicks: row.clicks,
          impressions: row.impressions,
          position: row.position,
          ctr: row.ctr,
          expectedCtr: expected,
          ctrGap,
        },
        hasSchema: report.schemaTypes.length > 0,
        wordCount: report.wordCount,
        lastUpdatedDaysAgo: report.lastModifiedDaysAgo,
        internalLinks: report.internalLinkCount,
      }, weights)

      scored.push({ task: out, crawl: report })
    } catch (e) {
      summary.errors.push(`crawl ${row.url}: ${errMsg(e)}`)
    }
  }

  // 5. Sort by opportunity score and take the top 10
  scored.sort((a, b) => b.task.score - a.task.score)
  const topOpportunities = scored.slice(0, 10)
  summary.tasksGenerated = topOpportunities.length

  // 6. Persist tasks + optionally briefs
  const generateBriefs = opts.generateBriefs !== false
  for (const { task, crawl: report } of topOpportunities) {
    // Skip if we already have a live task for this URL
    const { data: existing } = await supabase
      .from('cro9_tasks')
      .select('id')
      .eq('site_id', site.id)
      .eq('url', task.url)
      .in('status', ['pending', 'briefed', 'applied', 'measuring'])
      .maybeSingle()
    if (existing) continue

    let brief: ContentBrief | null = null
    let serp: Awaited<ReturnType<typeof searchGoogle>> | null = null

    if (generateBriefs) {
      if (serpKey && task.primaryKeyword) {
        try {
          serp = await searchGoogle({ key: serpKey, query: task.primaryKeyword })
          await supabase.from('cro9_serp_snapshots').insert({
            site_id: site.id, keyword: task.primaryKeyword,
            top_results: serp.topResults, features: serp.features,
          })
        } catch (e) {
          summary.errors.push(`serp ${task.primaryKeyword}: ${errMsg(e)}`)
        }
      }
      try {
        brief = await generateBrief(task, report, serp)
        summary.tasksBriefed++
      } catch (e) {
        summary.errors.push(`brief ${task.url}: ${errMsg(e)}`)
      }
    }

    const { data: inserted } = await supabase.from('cro9_tasks').insert({
      site_id: site.id,
      url: task.url,
      primary_keyword: task.primaryKeyword,
      secondary_keywords: (kwMap.get(task.url)?.secondary) || [],
      bucket: task.bucket,
      priority_action: task.priorityAction,
      score: task.score,
      score_components: task.scoreComponents,
      status: brief ? 'briefed' : 'pending',
      clicks: task.clicks, impressions: task.impressions, position: task.position,
      ctr: task.ctr, expected_ctr: task.expectedCtr, ctr_gap: task.ctrGap,
      brief: brief,
      baseline_metrics: { clicks: task.clicks, impressions: task.impressions, position: task.position, ctr: task.ctr },
      briefed_at: brief ? new Date().toISOString() : null,
    }).select('id').single()

    if (inserted) {
      await logAction(supabase, site.id, inserted.id, brief ? 'brief_generated' : 'task_created',
        { bucket: task.bucket, action: task.priorityAction, score: task.score },
        { url: task.url, primary_keyword: task.primaryKeyword })
    }
  }

  // 7. Persist any weight rows that haven't been written yet (first run)
  if (!weightRows || weightRows.length === 0) {
    const rows = toRows(site.id, weights)
    await supabase.from('cro9_adaptive_weights').upsert(rows)
  }

  // 8. Update site
  summary.durationMs = Date.now() - started
  await supabase.from('cro9_sites').update({
    last_run_at: new Date().toISOString(),
    last_run_status: summary.errors.length > 0 ? 'ok_with_errors' : 'ok',
    last_run_summary: summary,
  }).eq('id', site.id)

  await logAction(supabase, site.id, null, 'analyze_run', {
    pagesAnalyzed: summary.pagesAnalyzed,
    tasksGenerated: summary.tasksGenerated,
    tasksBriefed: summary.tasksBriefed,
  }, summary)

  return summary
}

// ---------------------------------------------------------------------------
// MEASUREMENT — closes the learning loop for applied tasks
// ---------------------------------------------------------------------------
export async function runMeasurement(site: Site): Promise<RunSummary> {
  const started = Date.now()
  const supabase = getAdmin()
  const summary: RunSummary = {
    siteId: site.id,
    pagesAnalyzed: 0, tasksGenerated: 0, tasksBriefed: 0, weightsAdjusted: 0, tasksMeasured: 0,
    durationMs: 0, errors: [],
  }

  const { data: dueTasks } = await supabase
    .from('cro9_tasks')
    .select('*')
    .eq('site_id', site.id)
    .in('status', ['applied', 'measuring'])
    .not('applied_at', 'is', null)

  if (!dueTasks || dueTasks.length === 0) {
    summary.durationMs = Date.now() - started
    return summary
  }

  // Pull the latest 28d by page from GSC
  if (!site.gsc_property) {
    summary.errors.push('gsc_property missing during measurement')
    return { ...summary, durationMs: Date.now() - started }
  }
  let pageRows: GscPageRow[] = []
  try {
    pageRows = await fetchByPage({ siteUrl: site.gsc_property, rowLimit: 250 })
  } catch (e) {
    summary.errors.push(`gsc_pull: ${errMsg(e)}`)
    return { ...summary, durationMs: Date.now() - started }
  }
  const byUrl = new Map(pageRows.map((r) => [r.url, r]))

  // Load current weights
  const { data: weightRows } = await supabase.from('cro9_adaptive_weights').select('*').eq('site_id', site.id)
  let weights = toMap((weightRows as { factor: string; value: number; update_count: number; last_updated: string }[] | null || []).map((r) => ({
    factor: r.factor as Factor, value: r.value, update_count: r.update_count, last_updated: r.last_updated,
  })))

  for (const row of dueTasks as Record<string, unknown>[]) {
    const appliedAt = new Date(row.applied_at as string).getTime()
    const windowDays = (row.measure_window_days as number) || 14
    const waitMs = windowDays * 86400000
    if (Date.now() - appliedAt < waitMs) continue   // not due yet

    const current = byUrl.get(row.url as string)
    if (!current) continue
    const baseline = (row.baseline_metrics as { clicks: number; impressions: number; position: number; ctr: number }) || { clicks: 0, impressions: 0, position: 100, ctr: 0 }

    const delta = {
      clicks: current.clicks - baseline.clicks,
      impressions: current.impressions - baseline.impressions,
      position: baseline.position - current.position,
      ctr: current.ctr - baseline.ctr,
    }

    const adj = computeAdjustment({
      bucket: String(row.bucket),
      deltaPosition: delta.position,
      deltaClicks: delta.clicks,
      deltaCtr: delta.ctr,
      deltaImpressions: delta.impressions,
    })

    if (adj.step !== 0) {
      weights = applyStep(weights, adj.factor, adj.step)
      summary.weightsAdjusted++
    }

    await supabase.from('cro9_tasks').update({
      status: adj.outcome,
      current_metrics: current,
      delta,
      measured_at: new Date().toISOString(),
    }).eq('id', row.id as string)

    await logAction(supabase, site.id, row.id as string, 'measure', {
      bucket: row.bucket, baseline, current, delta,
    }, { outcome: adj.outcome, factor: adj.factor, step: adj.step })
    summary.tasksMeasured++
  }

  if (summary.weightsAdjusted > 0) {
    await supabase.from('cro9_adaptive_weights').upsert(toRows(site.id, weights))
    await logAction(supabase, site.id, null, 'weight_adjust', { newWeights: weights }, { adjustments: summary.weightsAdjusted })
  }

  summary.durationMs = Date.now() - started
  return summary
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractGuessKeyword(report: CrawlReport): string {
  if (report.h1[0]) return report.h1[0].toLowerCase().split(/[\s\-–—,.]+/).slice(0, 3).join(' ')
  if (report.title) return report.title.toLowerCase().split(/[\s\-–—,.]+/).slice(0, 3).join(' ')
  return ''
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

// Export convenience re-exports for callers
export { DEFAULT_WEIGHTS } from './score'
export type { ContentBrief, TaskOutput, Bucket, PriorityAction } from './types'
