/**
 * Lightweight HTML crawler — fetches a URL and pulls the on-page signals
 * we need for scoring + brief generation. Runs in Node; uses the same
 * pattern as lib/research.ts on verifiedsxo so this is edge-ready too.
 *
 * Captures:
 *   - title
 *   - meta description
 *   - canonical
 *   - H1 / H2 / H3
 *   - total word count (visible text)
 *   - schema types found (JSON-LD)
 *   - anchor-text map (for internal-link analysis)
 *   - approx last-modified (from <meta> or Last-Modified header)
 */

export interface CrawlReport {
  url: string
  status: number
  title?: string
  metaDescription?: string
  canonical?: string
  h1: string[]
  h2: string[]
  h3: string[]
  wordCount: number
  schemaTypes: string[]
  hasOpenGraph: boolean
  hasTwitterCard: boolean
  outboundLinkCount: number
  internalLinkCount: number
  lastModifiedDaysAgo?: number
  sampleText?: string   // first 1000 chars of cleaned body
}

export async function crawl(url: string): Promise<CrawlReport> {
  const out: CrawlReport = {
    url,
    status: 0,
    h1: [], h2: [], h3: [],
    wordCount: 0,
    schemaTypes: [],
    hasOpenGraph: false,
    hasTwitterCard: false,
    outboundLinkCount: 0,
    internalLinkCount: 0,
  }

  let html = ''
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; CRO9Bot/1.0; +https://0ncore.com)' },
      signal: AbortSignal.timeout(10000),
    })
    out.status = r.status
    if (!r.ok) return out
    html = await r.text()
    const lm = r.headers.get('last-modified')
    if (lm) {
      const d = new Date(lm).getTime()
      if (Number.isFinite(d)) out.lastModifiedDaysAgo = Math.round((Date.now() - d) / 86400000)
    }
  } catch {
    return out
  }

  const siteHost = (() => { try { return new URL(url).hostname } catch { return '' } })()

  out.title = matchOne(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.trim()
  out.metaDescription = matchMetaAttr(html, 'name', 'description')
  out.canonical = matchLinkAttr(html, 'rel', 'canonical')

  out.h1 = matchAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(stripTags).filter(Boolean)
  out.h2 = matchAll(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi).map(stripTags).filter(Boolean)
  out.h3 = matchAll(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi).map(stripTags).filter(Boolean)

  out.hasOpenGraph = /<meta[^>]+property=["']og:/i.test(html)
  out.hasTwitterCard = /<meta[^>]+name=["']twitter:/i.test(html)

  // JSON-LD schema types
  const ldJsonBlocks = matchAll(html, /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const raw of ldJsonBlocks) {
    try {
      const parsed = JSON.parse(raw)
      collectSchemaTypes(parsed, out.schemaTypes)
    } catch { /* ignore invalid JSON-LD */ }
  }

  // Anchors — inbound vs outbound
  const anchors = matchAll(html, /<a[^>]+href=["']([^"']+)["'][^>]*>/gi)
  for (const href of anchors) {
    try {
      const u = new URL(href, url)
      if (u.hostname === siteHost) out.internalLinkCount++
      else out.outboundLinkCount++
    } catch { /* skip malformed */ }
  }

  // Visible text + word count
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  out.wordCount = cleaned ? cleaned.split(' ').filter(Boolean).length : 0
  out.sampleText = cleaned.slice(0, 1000)

  // Fallback last-modified: article:modified_time
  if (!out.lastModifiedDaysAgo) {
    const mod = matchMetaAttr(html, 'property', 'article:modified_time') || matchMetaAttr(html, 'name', 'last-modified')
    if (mod) {
      const d = new Date(mod).getTime()
      if (Number.isFinite(d)) out.lastModifiedDaysAgo = Math.round((Date.now() - d) / 86400000)
    }
  }

  return out
}

function matchOne(html: string, rx: RegExp): string | undefined {
  const m = rx.exec(html)
  return m ? stripTags(m[1]) : undefined
}

function matchAll(html: string, rx: RegExp): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = rx.exec(html)) !== null) {
    if (m[1] !== undefined) out.push(m[1])
  }
  return out
}

function matchMetaAttr(html: string, attrName: string, attrValue: string): string | undefined {
  const rx = new RegExp(`<meta[^>]+${attrName}=["']${attrValue}["'][^>]+content=["']([^"']+)["']`, 'i')
  const m = rx.exec(html)
  if (m) return m[1]
  const rx2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attrName}=["']${attrValue}["']`, 'i')
  const m2 = rx2.exec(html)
  return m2?.[1]
}

function matchLinkAttr(html: string, attrName: string, attrValue: string): string | undefined {
  const rx = new RegExp(`<link[^>]+${attrName}=["']${attrValue}["'][^>]+href=["']([^"']+)["']`, 'i')
  const m = rx.exec(html)
  return m?.[1]
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function collectSchemaTypes(node: unknown, out: string[]): void {
  if (!node) return
  if (Array.isArray(node)) { node.forEach((n) => collectSchemaTypes(n, out)); return }
  if (typeof node !== 'object') return
  const obj = node as Record<string, unknown>
  const t = obj['@type']
  if (typeof t === 'string' && !out.includes(t)) out.push(t)
  if (Array.isArray(t)) t.forEach((tt) => typeof tt === 'string' && !out.includes(tt) && out.push(tt))
  const graph = obj['@graph']
  if (Array.isArray(graph)) graph.forEach((g) => collectSchemaTypes(g, out))
}
