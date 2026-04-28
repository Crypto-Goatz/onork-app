/**
 * 0n Service Packager — ingestion layer.
 *
 * Three modes:
 *   ingestFromURL       — fetch a public URL, scrape title/meta/h1/h2/body/og:image, extract pricing
 *   ingestFromPrompt    — pass a free-form description directly
 *   ingestFromMCPServer — read mcp_registry_cache, optionally call tools/list, build a service offering
 *
 * All three produce the same IngestResult shape. Generators downstream
 * don't care which mode produced the input.
 */

import { createClient } from '@supabase/supabase-js'
import { groqJSON } from './groq'
import type { IngestResult } from './types'

const FETCH_TIMEOUT_MS = 10_000
const MAX_BODY_CHARS = 6_000

const EXTRACTION_SYSTEM = `You are a service packaging expert. Extract structured service data from the supplied content. Do not invent capabilities not mentioned. If a field is genuinely unknowable, return your best inference clearly grounded in the content.`

function extractionPrompt(content: string): string {
  return `Extract the following from this content. Return ONLY valid JSON with these exact keys:

{
  "service_name": "Clear name (e.g., 'HIPAA Compliance Scanning')",
  "service_description": "2-3 sentences describing what the service does",
  "target_audience": "Who needs this service",
  "primary_deliverable": "The main thing the buyer receives",
  "delivery_time": "How long it takes (e.g., '15 minutes' or '24 hours')",
  "price_anchor_cents": 14900,
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "category": "Service category"
}

Rules:
- price_anchor_cents must be an integer (14900 = $149.00). If no price visible, estimate based on market rates for similar services.
- keywords: exactly 5 search terms a buyer would use to find this service.
- Do not wrap in markdown fences.

Content to analyze:
${content.slice(0, MAX_BODY_CHARS)}`
}

// ─────────────────────────────────────────────────────────────────────────
// Mode A — URL ingestion
// ─────────────────────────────────────────────────────────────────────────

interface ScrapedPage {
  text: string
  images: string[]
}

function pickAttr(html: string, tag: string, attr: string, name: string): string | null {
  // <meta property="og:image" content="...">
  const re = new RegExp(`<${tag}[^>]*${attr}=["']${name}["'][^>]*>`, 'i')
  const m = html.match(re)
  if (!m) return null
  const valueMatch = m[0].match(/content=["']([^"']+)["']/i)
  return valueMatch ? valueMatch[1] : null
}

function scrapeHtml(html: string, baseUrl: string): ScrapedPage {
  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''

  // Meta description
  const metaDesc =
    pickAttr(html, 'meta', 'name', 'description') ??
    pickAttr(html, 'meta', 'property', 'og:description') ??
    ''

  // H1 / H2
  const headings = Array.from(html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi))
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
    .slice(0, 8)

  // Body — strip scripts/styles, keep first 3000 chars of text
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)

  // Images: og:image + first few <img src=>
  const images: string[] = []
  const ogImage = pickAttr(html, 'meta', 'property', 'og:image') ?? pickAttr(html, 'meta', 'name', 'twitter:image')
  if (ogImage) images.push(absoluteUrl(ogImage, baseUrl))
  const imgMatches = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi))
  for (const m of imgMatches.slice(0, 6)) {
    images.push(absoluteUrl(m[1], baseUrl))
  }

  // Pricing — look for $XX patterns in body
  const priceMatches = Array.from(body.matchAll(/\$\s*(\d{1,4})(?:\.(\d{2}))?/g))
    .slice(0, 5)
    .map((m) => `$${m[1]}${m[2] ? '.' + m[2] : ''}`)

  const text = [
    `URL: ${baseUrl}`,
    `Title: ${title}`,
    `Meta description: ${metaDesc}`,
    headings.length > 0 ? `Headings: ${headings.join(' | ')}` : '',
    priceMatches.length > 0 ? `Prices spotted: ${priceMatches.join(', ')}` : '',
    `Body excerpt: ${body}`,
  ]
    .filter(Boolean)
    .join('\n')

  return { text, images: Array.from(new Set(images)).slice(0, 5) }
}

function absoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

export async function ingestFromURL(url: string): Promise<IngestResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let html = ''
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 0nServicePackager/1.0; +https://0ncore.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`URL fetch ${res.status}`)
    html = await res.text()
  } finally {
    clearTimeout(timer)
  }

  const { text, images } = scrapeHtml(html, url)
  const extracted = await groqJSON<Omit<IngestResult, 'images' | 'raw_content'>>(
    EXTRACTION_SYSTEM,
    extractionPrompt(text)
  )

  return { ...extracted, images, raw_content: text }
}

// ─────────────────────────────────────────────────────────────────────────
// Mode B — Prompt ingestion
// ─────────────────────────────────────────────────────────────────────────

export async function ingestFromPrompt(prompt: string): Promise<IngestResult> {
  const extracted = await groqJSON<Omit<IngestResult, 'images' | 'raw_content'>>(
    EXTRACTION_SYSTEM,
    extractionPrompt(prompt)
  )
  return { ...extracted, images: [], raw_content: prompt }
}

// ─────────────────────────────────────────────────────────────────────────
// Mode C — MCP Registry ingestion
// ─────────────────────────────────────────────────────────────────────────

interface CachedMcpServer {
  server_name: string
  server_title: string | null
  description: string | null
  remote_url: string | null
  remote_type: string | null
  category: string | null
  tools_count: number | null
  raw_data: Record<string, unknown> | null
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function listToolsFromRemote(remoteUrl: string): Promise<Array<{ name: string; description?: string }>> {
  try {
    const res = await fetch(remoteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const ct = res.headers.get('content-type') ?? ''
    let payload: unknown
    if (ct.includes('text/event-stream')) {
      const text = await res.text()
      const dataLine = text
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith('data:'))
      if (!dataLine) return []
      payload = JSON.parse(dataLine.slice('data:'.length).trim())
    } else {
      payload = await res.json()
    }
    const result = (payload as { result?: { tools?: Array<{ name: string; description?: string }> } }).result
    return result?.tools ?? []
  } catch {
    return []
  }
}

export async function ingestFromMCPServer(serverName: string): Promise<IngestResult> {
  const sb = admin()
  const { data: server } = await sb
    .from('mcp_registry_cache')
    .select('server_name, server_title, description, remote_url, remote_type, category, tools_count, raw_data')
    .eq('server_name', serverName)
    .order('last_synced_at', { ascending: false })
    .limit(1)
    .maybeSingle<CachedMcpServer>()

  if (!server) throw new Error(`MCP server not found in cache: ${serverName}`)

  // If we have a remote endpoint, try to list tools for richer context
  let tools: Array<{ name: string; description?: string }> = []
  if (server.remote_url && (server.remote_type === 'streamable-http' || server.remote_type === 'http')) {
    tools = await listToolsFromRemote(server.remote_url)
  }

  const ctx = [
    `MCP Server: ${server.server_title || server.server_name} (${server.server_name})`,
    server.description ? `Description: ${server.description}` : '',
    server.category ? `Category: ${server.category}` : '',
    server.remote_url ? `Remote: ${server.remote_url}` : 'Local/STDIO server',
    tools.length > 0
      ? `Tools (${tools.length}):\n` +
        tools.slice(0, 30).map((t) => `  - ${t.name}: ${t.description ?? ''}`).join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const extracted = await groqJSON<Omit<IngestResult, 'images' | 'raw_content'>>(
    EXTRACTION_SYSTEM,
    `This is an MCP server we want to package as a sellable service. Build the service offering AROUND its capabilities — describe what a buyer would get if we hosted, configured, and operated this server for them.

${extractionPrompt(ctx)}`
  )

  return { ...extracted, images: [], raw_content: ctx }
}
