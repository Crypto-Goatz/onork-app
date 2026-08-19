/**
 * Content-brief generator. Uses Groq (llama-3.3-70b) for fast JSON output.
 *
 * Inputs: scored task, crawl report, SERP snapshot.
 * Output: ContentBrief — everything the writer or auto-apply layer needs
 * to rewrite the page.
 */

import type { ContentBrief, SerpSnapshot, TaskOutput } from './types'
import type { CrawlReport } from './crawl'

const GROQ_KEY = process.env.GROQ_API_KEY || ''

export async function generateBrief(task: TaskOutput, crawl: CrawlReport, serp: SerpSnapshot | null): Promise<ContentBrief> {
  if (!GROQ_KEY) return fallbackBrief(task, crawl)
  try {
    return await generateViaGroq(task, crawl, serp)
  } catch {
    return fallbackBrief(task, crawl)
  }
}

async function generateViaGroq(task: TaskOutput, crawl: CrawlReport, serp: SerpSnapshot | null): Promise<ContentBrief> {
  const serpBlock = serp
    ? serp.topResults.slice(0, 10).map((r, i) =>
        `[${i + 1}] ${r.title}\n    ${r.url}\n    ${r.snippet || ''}`
      ).join('\n\n')
    : '(no SERP data)'

  const prompt = `You are a senior SEO strategist generating a content brief. Output STRICT JSON only.

PAGE URL: ${task.url}
PRIMARY KEYWORD: ${task.primaryKeyword}
CURRENT METRICS: position ${task.position.toFixed(1)}, ${task.clicks} clicks / ${task.impressions} impressions, CTR ${(task.ctr * 100).toFixed(2)}%
BUCKET: ${task.bucket}    PRIORITY: ${task.priorityAction}

CURRENT PAGE:
- Title: ${crawl.title || '(missing)'}
- Meta: ${crawl.metaDescription || '(missing)'}
- H1s: ${crawl.h1.join(' | ') || '(missing)'}
- H2 count: ${crawl.h2.length}
- Word count: ${crawl.wordCount}
- Schema types: ${crawl.schemaTypes.join(', ') || 'none'}

TOP 10 COMPETITORS FOR "${task.primaryKeyword}":
${serpBlock}

Output JSON with this exact shape:
{
  "target_words": <int, median of SERP top 10 word count estimates>,
  "word_range": [<min>, <max>],
  "h2_count": [<min>, <max>],
  "primary_keyword": "${task.primaryKeyword}",
  "secondary_keywords": [<strings>],
  "keyword_density_target": [<pct_min>, <pct_max>],
  "keyword_usage_count": [<min>, <max>],
  "required_placements": ["Title (front-loaded)", "H1 (exact)", "First 100 words", "At least one H2", "Last 120 words", "URL slug"],
  "schema_stack": [<schema.org types>],
  "entities_to_cover": [<topic entities missing from current page>],
  "serp_gap_notes": [<bullets on what top 10 does that this page misses>],
  "intent": "informational|commercial|navigational|transactional"
}

Rules:
- Use the competitors as truth for length + structure.
- If SERP is missing, default to 1200-1600 words, density 0.6-1.2%.
- Always include Organization, WebSite, BreadcrumbList in schema_stack.`

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'authorization': `Bearer ${GROQ_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(25000),
  })
  if (!r.ok) throw new Error(`Groq ${r.status}`)
  const j = await r.json()
  const text = j?.choices?.[0]?.message?.content || ''
  const parsed = JSON.parse(text)
  return normaliseBrief(parsed, task, crawl)
}

function fallbackBrief(task: TaskOutput, crawl: CrawlReport): ContentBrief {
  const target = crawl.wordCount < 500 ? 1400 : Math.max(1300, Math.round(crawl.wordCount * 1.2))
  return {
    target_words: target,
    word_range: [Math.round(target * 0.85), Math.round(target * 1.2)],
    h2_count: [5, 8],
    primary_keyword: task.primaryKeyword,
    secondary_keywords: [],
    keyword_density_target: [0.6, 1.2],
    keyword_usage_count: [7, 15],
    required_placements: [
      'Title tag (front-loaded)',
      'H1 (exact match)',
      'First 100 words',
      'At least one H2',
      'Last 120 words',
      'URL slug',
    ],
    schema_stack: ['Organization', 'WebSite', 'BreadcrumbList', 'WebPage', 'Article'],
    entities_to_cover: [],
    serp_gap_notes: ['No SERP data available — brief generated from on-page signals only.'],
    intent: 'informational',
  }
}

function normaliseBrief(raw: Record<string, unknown>, task: TaskOutput, crawl: CrawlReport): ContentBrief {
  const fb = fallbackBrief(task, crawl)
  return {
    target_words: typeof raw.target_words === 'number' ? raw.target_words : fb.target_words,
    word_range: Array.isArray(raw.word_range) && raw.word_range.length === 2 ? raw.word_range as [number, number] : fb.word_range,
    h2_count: Array.isArray(raw.h2_count) && raw.h2_count.length === 2 ? raw.h2_count as [number, number] : fb.h2_count,
    primary_keyword: typeof raw.primary_keyword === 'string' ? raw.primary_keyword : task.primaryKeyword,
    secondary_keywords: Array.isArray(raw.secondary_keywords) ? (raw.secondary_keywords as string[]).map(String).slice(0, 8) : fb.secondary_keywords,
    keyword_density_target: Array.isArray(raw.keyword_density_target) && raw.keyword_density_target.length === 2 ? raw.keyword_density_target as [number, number] : fb.keyword_density_target,
    keyword_usage_count: Array.isArray(raw.keyword_usage_count) && raw.keyword_usage_count.length === 2 ? raw.keyword_usage_count as [number, number] : fb.keyword_usage_count,
    required_placements: Array.isArray(raw.required_placements) ? (raw.required_placements as string[]).map(String) : fb.required_placements,
    schema_stack: Array.isArray(raw.schema_stack) ? (raw.schema_stack as string[]).map(String) : fb.schema_stack,
    entities_to_cover: Array.isArray(raw.entities_to_cover) ? (raw.entities_to_cover as string[]).map(String).slice(0, 12) : fb.entities_to_cover,
    serp_gap_notes: Array.isArray(raw.serp_gap_notes) ? (raw.serp_gap_notes as string[]).map(String).slice(0, 8) : fb.serp_gap_notes,
    intent: (['informational', 'commercial', 'navigational', 'transactional'].includes(raw.intent as string) ? raw.intent : fb.intent) as ContentBrief['intent'],
  }
}
