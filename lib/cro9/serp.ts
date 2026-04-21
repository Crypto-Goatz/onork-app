/**
 * SerpAPI adapter — top-10 organic results + SERP features per keyword.
 *
 * Each CRO9 site provides its own SerpAPI key (BYO model), stored encrypted.
 * Falls back to process.env.SERPAPI_KEY if the site-level key is empty
 * (useful for admin/QA runs).
 */

import type { SerpResult, SerpSnapshot } from './types'

const SERPAPI_BASE = 'https://serpapi.com/search.json'

export interface SerpFetchOpts {
  key: string
  query: string
  location?: string        // "United States" default
  gl?: string              // country code; "us" default
  hl?: string              // ui language; "en" default
  num?: number             // results to return; 10 default
}

export async function searchGoogle(opts: SerpFetchOpts): Promise<SerpSnapshot> {
  if (!opts.key) throw new Error('SerpAPI key required')
  const params = new URLSearchParams({
    engine: 'google',
    q: opts.query,
    location: opts.location || 'United States',
    gl: opts.gl || 'us',
    hl: opts.hl || 'en',
    num: String(opts.num || 10),
    api_key: opts.key,
    output: 'json',
  })
  const r = await fetch(`${SERPAPI_BASE}?${params.toString()}`, {
    signal: AbortSignal.timeout(15000),
  })
  if (!r.ok) throw new Error(`SerpAPI ${r.status}: ${await r.text().catch(() => '')}`)
  const json = await r.json()

  const organic = (json.organic_results || []) as Array<Record<string, unknown>>
  const topResults: SerpResult[] = organic.map((row, i) => ({
    position: (row.position as number) ?? i + 1,
    url: (row.link as string) || '',
    title: (row.title as string) || '',
    snippet: (row.snippet as string) || '',
    domain: hostOf(row.link as string),
    featured: Boolean(row.snippet_highlighted_words),
  })).filter((r) => r.url)

  const features = {
    paa: extractPaa(json),
    answerBox: extractAnswerBox(json),
    knowledgeGraph: Boolean(json.knowledge_graph),
  }

  return { keyword: opts.query, topResults, features }
}

function hostOf(url?: string): string | undefined {
  if (!url) return undefined
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return undefined }
}

function extractPaa(json: Record<string, unknown>): string[] | undefined {
  const paa = json.related_questions as Array<{ question?: string }> | undefined
  if (!paa) return undefined
  return paa.map((p) => p.question || '').filter(Boolean).slice(0, 8)
}

function extractAnswerBox(json: Record<string, unknown>): string | undefined {
  const ab = json.answer_box as Record<string, unknown> | undefined
  if (!ab) return undefined
  return (ab.answer as string) || (ab.snippet as string) || (ab.title as string) || undefined
}

/**
 * Summarise top-10 so the brief generator has a quick competitive map.
 */
export function summariseTop10(snapshot: SerpSnapshot): {
  ourDomainPresent: boolean
  ourPosition?: number
  medianDomain: string
  uniqueDomains: number
  featuredSnippet?: string
} {
  const results = snapshot.topResults.slice(0, 10)
  const domains = results.map((r) => r.domain || '').filter(Boolean)
  const unique = new Set(domains).size
  return {
    ourDomainPresent: false,  // caller sets this against the site domain
    medianDomain: domains[Math.floor(domains.length / 2)] || '',
    uniqueDomains: unique,
    featuredSnippet: snapshot.features?.answerBox,
  }
}
