/**
 * SXO Auto-Indexer — core helpers
 *
 * Per spec: ~/Downloads/0n-sxo-indexer-addon-spec.md
 * Every customer gets a unique IndexNow key, drops it as
 * /public/{KEY}.txt on each domain, and we submit their sitemap URLs
 * to Bing/Yandex/Naver/Seznam via IndexNow daily.
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

export interface PlanLimits {
  daily_url_cap: number
  domain_cap: number
  monthly_price_cents: number
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free:   { daily_url_cap: 100,     domain_cap: 1,  monthly_price_cents: 0 },
  pro:    { daily_url_cap: 10_000,  domain_cap: 1,  monthly_price_cents: 1900 },
  agency: { daily_url_cap: 100_000, domain_cap: 10, monthly_price_cents: 4900 },
  power:  { daily_url_cap: 1_000_000, domain_cap: 50, monthly_price_cents: 19900 },
}

export function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export function generateIndexNowKey(): string {
  return crypto.randomBytes(16).toString('hex')
}

/** Fetch a sitemap.xml from any host and pull out URLs that match that host. */
export async function fetchSitemapUrls(host: string, cap: number): Promise<string[]> {
  const candidates = [`https://${host}/sitemap.xml`, `https://${host}/sitemap_index.xml`]
  let xml = ''
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        cache: 'no-store',
        headers: { 'User-Agent': '0nCore-IndexNow/1.0' },
      })
      if (res.ok) { xml = await res.text(); break }
    } catch { /* try next */ }
  }
  if (!xml) throw new Error('sitemap not reachable')

  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || []
  const hostRoot = `https://${host}`
  const hostSlash = `https://${host}/`
  const urls = matches
    .map(m => m.replace(/<\/?loc>/g, '').trim())
    .filter(u => u === hostRoot || u.startsWith(hostSlash))

  return urls.slice(0, cap)
}

/** POST a urlList to IndexNow for a single host. */
export async function submitToIndexNow(opts: {
  host: string
  key: string
  urls: string[]
}): Promise<{ status: number; body: string; ms: number }> {
  const t0 = Date.now()
  if (opts.urls.length === 0) {
    return { status: 204, body: 'no urls', ms: 0 }
  }
  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: opts.host,
      key: opts.key,
      keyLocation: `https://${opts.host}/${opts.key}.txt`,
      urlList: opts.urls.slice(0, 10_000),
    }),
  })
  const body = (await res.text()).slice(0, 500)
  return { status: res.status, body, ms: Date.now() - t0 }
}

/** Verify the customer has hosted /public/{KEY}.txt and the content matches. */
export async function verifyKeyFile(host: string, key: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${host}/${key}.txt`, {
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'User-Agent': '0nCore-IndexNow-Verify/1.0' },
    })
    if (!res.ok) return false
    const text = (await res.text()).trim()
    return text === key
  } catch {
    return false
  }
}

/**
 * Run one submission cycle for a single domain.
 * Writes a row to sxo_indexer_runs and updates the domain stats.
 */
export async function runDomainSubmission(domainId: string) {
  const admin = getAdmin()
  const { data: dom } = await admin
    .from('sxo_indexer_domains')
    .select('id, host, customer_id, status')
    .eq('id', domainId)
    .single()
  if (!dom) throw new Error('domain not found')

  const { data: cust } = await admin
    .from('sxo_indexer_customers')
    .select('indexnow_key, daily_url_cap, plan_tier, alert_email')
    .eq('id', dom.customer_id)
    .single()
  if (!cust) throw new Error('customer not found')

  const t0 = Date.now()
  let urls: string[] = []
  let runRow: Record<string, unknown> = { domain_id: dom.id }
  try {
    urls = await fetchSitemapUrls(dom.host, cust.daily_url_cap)
    const submitRes = await submitToIndexNow({
      host: dom.host,
      key: cust.indexnow_key,
      urls,
    })
    runRow = {
      domain_id: dom.id,
      urls_extracted: urls.length,
      status_code: submitRes.status,
      status_text: submitRes.status >= 200 && submitRes.status < 300 ? 'ok' : 'failed',
      response_body: submitRes.body,
      ms_elapsed: submitRes.ms,
    }
  } catch (err) {
    runRow = {
      domain_id: dom.id,
      urls_extracted: 0,
      status_code: null,
      status_text: 'error',
      error: err instanceof Error ? err.message : String(err),
      ms_elapsed: Date.now() - t0,
    }
  }

  await admin.from('sxo_indexer_runs').insert(runRow)

  const ok = (runRow.status_code as number | null | undefined) && (runRow.status_code as number) >= 200 && (runRow.status_code as number) < 300
  await admin
    .from('sxo_indexer_domains')
    .update({
      last_submission_at: new Date().toISOString(),
      total_urls_submitted: ok ? (urls.length || 0) : 0,
      next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', dom.id)

  return runRow
}
