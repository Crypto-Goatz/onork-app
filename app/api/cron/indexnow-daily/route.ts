/**
 * Daily IndexNow re-submission across the Rocket / 0n / SXO domain family.
 *
 * Schedule: 0 9 * * *  (09:00 UTC daily) — wired via vercel.json.
 *
 * For each live domain, fetches its sitemap.xml, extracts URLs, and POSTs
 * the batch to api.indexnow.org/indexnow. New blog posts + marketplace
 * products + programmatic SEO pages on 0nmcp.com (658 pages, auto-growing)
 * land in Bing/Yandex/Naver/Seznam indexes within 24h instead of waiting
 * for organic crawl.
 *
 * Auth: Bearer ${CRON_SECRET} OR Vercel-native x-vercel-cron: 1 header.
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60  // IndexNow can take 5–10s per domain

const INDEXNOW_KEY = '9d9930798d75952dec01943d70efdffb'
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

// 10 live domains. rocketeq.com excluded until origin 502 is fixed.
const DOMAINS: Array<{ host: string; sitemapUrl?: string }> = [
  { host: 'rocketadd.com' },
  { host: 'mcpfed.com' },
  { host: 'rocketopp.com' },
  { host: 'command.rocketclients.com' },
  { host: 'rocketpost.co' },
  { host: 'www.cro9.com' },
  { host: 'wpsxo.com' },
  { host: 'www.0nmcp.com' },
  { host: '0ncore.com' },
  { host: 'sxowebsite.com' },
]

interface DomainResult {
  host: string
  urls_extracted: number
  status: number | string
  ms: number
  error?: string
}

function isAuthorized(req: NextRequest): boolean {
  // Vercel cron triggers add this header
  if (req.headers.get('x-vercel-cron') === '1') return true
  // Manual / scheduled-agent calls use bearer
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (secret && auth === `Bearer ${secret}`) return true
  return false
}

async function fetchSitemapUrls(host: string): Promise<string[]> {
  const sitemapUrl = `https://${host}/sitemap.xml`
  const res = await fetch(sitemapUrl, {
    redirect: 'follow',
    headers: { 'User-Agent': 'IndexNow-Daily-Submitter/1.0' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`)
  const xml = await res.text()
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || []
  // Strict per-host filter — IndexNow returns 422 if urlList contains
  // hosts other than the declared host (rocketadd's sitemap is a
  // supersite covering 5 Rocket domains).
  const hostHttps = `https://${host}/`
  const hostHttpsRoot = `https://${host}`
  return matches
    .map((m) => m.replace(/<\/?loc>/g, '').trim())
    .filter((u) => u.length > 0 && (u.startsWith(hostHttps) || u === hostHttpsRoot))
}

async function submitToIndexNow(host: string, urls: string[]): Promise<{ status: number; body: string }> {
  if (urls.length === 0) return { status: 204, body: 'no urls' }

  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
    urlList: urls.slice(0, 10000),  // IndexNow caps at 10k per request
  }

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })
  const body = await res.text().catch(() => '')
  return { status: res.status, body: body.slice(0, 500) }
}

async function processDomain(host: string): Promise<DomainResult> {
  const start = Date.now()
  try {
    const urls = await fetchSitemapUrls(host)
    const result = await submitToIndexNow(host, urls)
    return {
      host,
      urls_extracted: urls.length,
      status: result.status,
      ms: Date.now() - start,
      ...(result.status >= 400 ? { error: result.body } : {}),
    }
  } catch (err: unknown) {
    return {
      host,
      urls_extracted: 0,
      status: 'error',
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const results = await Promise.all(DOMAINS.map((d) => processDomain(d.host)))

  const total_urls = results.reduce((sum, r) => sum + r.urls_extracted, 0)
  const accepted = results.filter((r) => r.status === 200 || r.status === 202).length
  const failed = results.filter((r) => r.status === 'error' || (typeof r.status === 'number' && r.status >= 400)).length

  const summary = {
    ok: failed === 0,
    timestamp: new Date().toISOString(),
    total_domains: DOMAINS.length,
    accepted,
    failed,
    total_urls_submitted: total_urls,
    elapsed_ms: Date.now() - start,
    indexnow_key: INDEXNOW_KEY,
    targets: ['Bing', 'Yandex', 'Naver', 'Seznam'],
    results,
  }

  // Surface in Vercel logs for daily review
  console.log('[indexnow-daily]', JSON.stringify(summary))

  return NextResponse.json(summary, { status: failed > 0 ? 207 : 200 })
}
