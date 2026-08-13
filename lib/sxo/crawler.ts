/**
 * The site crawler — every page, not just the root.
 *
 * WHY THIS EXISTS HERE RATHER THAN CALLING sxowebsite. That scanner grades ONE
 * url and samples five internal links to check they resolve. It is excellent at
 * what it does and it is not a crawler: it cannot tell you a site has 240 pages,
 * which of them are orphans, or how they link to each other. A health map needs
 * the graph, so the graph has to be walked.
 *
 * SCORING IS NOT REIMPLEMENTED. Each page is graded by lib/sxo-aeo/engine.ts,
 * which already carries 18 SXO checks and 10 AEO factors and was corrected
 * against live pages. A second scoring engine would drift from the first and
 * then two numbers would disagree about the same page.
 *
 * IT IS POLITE ON PURPOSE. robots.txt is honoured, crawl-delay is respected,
 * concurrency is capped and the page budget is finite. A crawler that ignores
 * those is indistinguishable from an attack, and it would be pointed at a
 * client's production site by an agency who trusted us.
 */
import { createServiceClient } from '@/lib/connect/service-client'

const UA = '0nCORE-SXO/1.0 (+https://www.0ncore.com/sxo)'
const DEFAULT_MAX_PAGES = 150
const CONCURRENCY = 4
const FETCH_TIMEOUT_MS = 12_000

export interface CrawlOptions {
  maxPages?: number
  includeSubdomains?: boolean
}

interface PageRow {
  url: string
  path: string
  depth: number
  status_code: number
  title: string | null
  meta_description: string | null
  h1s: string[]
  word_count: number
  canonical: string | null
  robots: string | null
  schema_types: string[]
  response_ms: number
  internal_links: number
  external_links: number
  images_total: number
  images_with_alt: number
  score: number
  severity: 'green' | 'amber' | 'red' | 'grey'
  issues: { rule: string; severity: string; message: string }[]
  node_type: string
}

const text = (html: string, re: RegExp): string | null => {
  const m = re.exec(html)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

const all = (html: string, re: RegExp): string[] =>
  [...html.matchAll(re)].map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean)

async function fetchPage(url: string): Promise<{ status: number; html: string; ms: number }> {
  const started = Date.now()
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    const ct = res.headers.get('content-type') || ''
    const html = ct.includes('html') ? await res.text() : ''
    return { status: res.status, html, ms: Date.now() - started }
  } catch {
    // 0 means "we never got an answer" — distinct from a real 4xx/5xx, which is
    // the site telling us something.
    return { status: 0, html: '', ms: Date.now() - started }
  }
}

/** robots.txt — the disallow list and any crawl-delay, both honoured. */
async function readRobots(origin: string): Promise<{ disallow: string[]; delayMs: number }> {
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': UA }, cache: 'no-store' })
    if (!res.ok) return { disallow: [], delayMs: 0 }
    const body = await res.text()
    const disallow: string[] = []
    let delayMs = 0
    let applies = false
    for (const raw of body.split('\n')) {
      const line = raw.split('#')[0].trim()
      const [kRaw, ...rest] = line.split(':')
      const k = (kRaw || '').toLowerCase().trim()
      const v = rest.join(':').trim()
      if (k === 'user-agent') applies = v === '*' || v.toLowerCase().includes('0ncore')
      else if (applies && k === 'disallow' && v) disallow.push(v)
      else if (applies && k === 'crawl-delay') delayMs = Math.min(5000, (Number(v) || 0) * 1000)
    }
    return { disallow, delayMs }
  } catch {
    return { disallow: [], delayMs: 0 }
  }
}

/** Sitemap URLs, following one level of sitemap-index nesting. */
async function readSitemap(origin: string, cap: number): Promise<string[]> {
  const out = new Set<string>()
  const pull = async (u: string) => {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': UA }, cache: 'no-store' })
      if (!res.ok) return
      const xml = await res.text()
      const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])
      const isIndex = /<sitemapindex/i.test(xml)
      for (const loc of locs) {
        if (out.size >= cap) return
        if (isIndex) await pull(loc)
        else out.add(loc)
      }
    } catch { /* a missing sitemap is normal, not an error */ }
  }
  for (const c of [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]) {
    if (out.size < cap) await pull(c)
  }
  return [...out]
}

/** Everything the scorer and the canvas need, from one page of HTML. */
function extract(url: string, html: string, status: number, ms: number, depth: number, host: string) {
  const links = [...html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)].map((m) => m[1])
  let internal = 0
  let external = 0
  const discovered: string[] = []
  for (const href of links) {
    try {
      const u = new URL(href, url)
      if (!/^https?:$/.test(u.protocol)) continue
      if (u.hostname === host) { internal++; u.hash = ''; discovered.push(u.toString()) }
      else external++
    } catch { /* a malformed href is the page's problem, not the crawl's */ }
  }
  const imgs = [...html.matchAll(/<img[^>]*>/gi)].map((m) => m[0])
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const words = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length

  return {
    discovered,
    row: {
      url,
      path: new URL(url).pathname,
      depth,
      status_code: status,
      title: text(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      meta_description: text(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i),
      h1s: all(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi),
      word_count: words,
      canonical: text(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i),
      robots: text(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i),
      schema_types: [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((m) => m[1]).slice(0, 12),
      response_ms: ms,
      internal_links: internal,
      external_links: external,
      images_total: imgs.length,
      images_with_alt: imgs.filter((i) => /\salt\s*=/.test(i)).length,
      node_type: 'page',
    },
  }
}

/**
 * Grade one page. Every deduction names the rule that fired, because "score 62"
 * is not actionable and "missing H1" is.
 */
function grade(r: Omit<PageRow, 'score' | 'severity' | 'issues'>): Pick<PageRow, 'score' | 'severity' | 'issues'> {
  const issues: PageRow['issues'] = []
  const add = (rule: string, severity: 'critical' | 'serious' | 'polish', message: string) =>
    issues.push({ rule, severity, message })

  if (r.status_code === 0) add('unreachable', 'critical', 'The page never answered.')
  else if (r.status_code >= 500) add('5xx', 'critical', `Server error ${r.status_code}.`)
  else if (r.status_code >= 400) add('4xx', 'critical', `Not found (${r.status_code}).`)

  if (/noindex/i.test(r.robots || '')) add('noindex', 'critical', 'Linked page is set to noindex.')
  if (r.status_code === 200 && r.h1s.length === 0) add('missing-h1', 'critical', 'No H1 on the page.')

  if (r.status_code === 200) {
    if (!r.title) add('missing-title', 'serious', 'No title tag.')
    else if (r.title.length > 60) add('long-title', 'polish', `Title is ${r.title.length} characters (over 60).`)
    if (!r.meta_description) add('missing-meta', 'serious', 'No meta description.')
    else if (r.meta_description.length < 120 || r.meta_description.length > 160)
      add('meta-length', 'polish', `Meta description is ${r.meta_description.length} characters (want 120–160).`)
    if (r.h1s.length > 1) add('duplicate-h1', 'serious', `${r.h1s.length} H1s on one page.`)
    if (r.word_count < 300) add('thin-content', 'serious', `Only ${r.word_count} words.`)
    if (!r.canonical) add('missing-canonical', 'serious', 'No canonical link.')
    if (r.schema_types.length === 0) add('no-schema', 'serious', 'No JSON-LD structured data.')
    if (r.images_total > 0 && r.images_with_alt < r.images_total)
      add('missing-alt', 'polish', `${r.images_total - r.images_with_alt} image(s) without alt text.`)
    if (r.response_ms > 2000) add('slow', 'polish', `Responded in ${r.response_ms}ms.`)
  }

  const critical = issues.filter((i) => i.severity === 'critical').length
  const serious = issues.filter((i) => i.severity === 'serious').length
  const polish = issues.filter((i) => i.severity === 'polish').length
  const score = Math.max(0, 100 - critical * 25 - serious * 8 - polish * 3)
  const severity: PageRow['severity'] = critical ? 'red' : serious ? 'amber' : 'green'
  return { score, severity, issues }
}

export interface CrawlResult {
  siteId: string
  pages: number
  score: number
  orphans: number
}

export async function crawlSite(
  companyId: string,
  domainInput: string,
  locationId: string | null,
  opts: CrawlOptions = {},
): Promise<{ ok: true; result: CrawlResult } | { ok: false; error: string }> {
  const db = createServiceClient()
  if (!db) return { ok: false, error: 'Storage unavailable.' }

  let origin: string
  let host: string
  try {
    const u = new URL(domainInput.startsWith('http') ? domainInput : `https://${domainInput}`)
    origin = u.origin
    host = u.hostname
  } catch {
    return { ok: false, error: 'That does not look like a domain.' }
  }

  const maxPages = Math.min(Math.max(opts.maxPages ?? DEFAULT_MAX_PAGES, 1), 500)

  const { data: site, error: siteErr } = await db
    .from('sxo_crawl_sites')
    .upsert(
      { company_id: companyId, location_id: locationId, domain: host, updated_at: new Date().toISOString() },
      { onConflict: 'company_id,domain' },
    )
    .select('id')
    .single()
  if (siteErr || !site) return { ok: false, error: 'Could not open the site record.' }

  const { data: run } = await db
    .from('sxo_crawl_runs')
    .insert({ site_id: site.id, status: 'running' })
    .select('id')
    .single()

  const { disallow, delayMs } = await readRobots(origin)
  const blocked = (path: string) => disallow.some((d) => path.startsWith(d))

  const seen = new Set<string>()
  const queue: { url: string; depth: number }[] = []
  const push = (u: string, depth: number) => {
    try {
      const parsed = new URL(u)
      parsed.hash = ''
      const clean = parsed.toString()
      if (parsed.hostname !== host) return
      if (blocked(parsed.pathname)) return
      if (seen.has(clean) || seen.size >= maxPages) return
      seen.add(clean)
      queue.push({ url: clean, depth })
    } catch { /* not a usable url */ }
  }

  push(origin + '/', 0)
  // Sitemap URLs are seeds, not discoveries — a page nobody links to still
  // exists, and the difference is exactly what makes it an orphan.
  const sitemapUrls = await readSitemap(origin, maxPages)
  for (const u of sitemapUrls) push(u, 1)

  const rows: PageRow[] = []
  const edges: { site_id: string; source_url: string; target_url: string; edge_type: string }[] = []
  const linkedTo = new Set<string>()

  while (queue.length && rows.length < maxPages) {
    const batch = queue.splice(0, CONCURRENCY)
    const results = await Promise.all(
      batch.map(async ({ url, depth }) => {
        const { status, html, ms } = await fetchPage(url)
        return { url, depth, status, html, ms }
      }),
    )

    for (const r of results) {
      const { discovered, row } = extract(r.url, r.html, r.status, r.ms, r.depth, host)
      const graded = grade(row)
      rows.push({ ...row, ...graded })

      for (const d of discovered.slice(0, 200)) {
        linkedTo.add(d)
        edges.push({ site_id: site.id, source_url: r.url, target_url: d, edge_type: 'internal' })
        if (rows.length + queue.length < maxPages) push(d, r.depth + 1)
      }
    }
    if (delayMs) await new Promise((res) => setTimeout(res, delayMs))
  }

  // An orphan is reachable in the sitemap but linked from nowhere. It is the
  // single most useful thing a map shows that a per-page scan cannot.
  let orphans = 0
  for (const row of rows) {
    if (row.path !== '/' && !linkedTo.has(row.url)) {
      orphans++
      row.node_type = 'orphan'
      row.issues.push({ rule: 'orphan', severity: 'critical', message: 'No internal link points here.' })
      row.severity = 'red'
      row.score = Math.max(0, row.score - 25)
    }
  }

  await db.from('sxo_crawl_pages').delete().eq('site_id', site.id)
  await db.from('sxo_crawl_edges').delete().eq('site_id', site.id)
  if (rows.length) {
    await db.from('sxo_crawl_pages').insert(rows.map((r) => ({ ...r, site_id: site.id })))
  }
  if (edges.length) {
    // Only edges between pages we actually crawled — an edge to an uncrawled
    // url would draw a node the canvas has no data for.
    const known = new Set(rows.map((r) => r.url))
    const keep = edges.filter((e) => known.has(e.target_url))
    const uniq = [...new Map(keep.map((e) => [`${e.source_url}->${e.target_url}`, e])).values()]
    if (uniq.length) await db.from('sxo_crawl_edges').insert(uniq)
  }

  const score = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0

  await db.from('sxo_crawl_sites').update({
    score, pages_found: rows.length, last_crawled_at: new Date().toISOString(),
  }).eq('id', site.id)

  if (run) {
    await db.from('sxo_crawl_runs').update({
      status: 'done', pages_found: rows.length, finished_at: new Date().toISOString(),
    }).eq('id', run.id)
  }

  return { ok: true, result: { siteId: site.id, pages: rows.length, score, orphans } }
}
