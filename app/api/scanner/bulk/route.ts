/**
 * POST /api/scanner/bulk
 *
 * Bulk URL enrichment. Accepts a list of URLs (raw text or array), fans out
 * server-side detector scans with bounded concurrency, and persists each
 * successful result to stack_scans for the authenticated user.
 *
 * Body:
 *   { urls: string[] }       OR
 *   { text: "url\nurl..." }  (newline / comma / space separated)
 *
 * Response: { ok, scanned, results: UrlEnrichResult[] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServer } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { scanUrl, type UrlScanResult, type ScanHit } from '@/lib/scanner/detectors-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_URLS = 50
const CONCURRENCY = 6

interface BulkBody {
  urls?: string[]
  text?: string
}

interface UrlEnrichResult {
  ok: boolean
  input: string
  url?: string
  hostname?: string
  status?: number
  platform?: string
  crm?: string
  analytics: string[]
  chat: string[]
  email: string[]
  payments: string[]
  security: string[]
  detected_count: number
  gaps: string[]
  scan_id?: string | null
  elapsed_ms: number
  error?: string
}

function parseUrls(body: BulkBody): string[] {
  const out: string[] = []
  if (Array.isArray(body.urls)) {
    for (const u of body.urls) {
      if (typeof u === 'string' && u.trim()) out.push(u.trim())
    }
  }
  if (typeof body.text === 'string' && body.text.trim()) {
    const split = body.text.split(/[\s,;]+/g).filter(Boolean)
    for (const u of split) out.push(u.trim())
  }
  // dedupe (case-insensitive)
  const seen = new Set<string>()
  const dedup: string[] = []
  for (const u of out) {
    const key = u.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')
    if (!seen.has(key)) {
      seen.add(key)
      dedup.push(u)
    }
  }
  return dedup.slice(0, MAX_URLS)
}

function summarize(scan: UrlScanResult): UrlEnrichResult {
  const base: UrlEnrichResult = {
    ok: scan.ok,
    input: scan.url,
    url: scan.url,
    hostname: scan.hostname,
    status: scan.status,
    analytics: [],
    chat: [],
    email: [],
    payments: [],
    security: [],
    detected_count: 0,
    gaps: [],
    elapsed_ms: scan.elapsed_ms,
    error: scan.error,
  }
  if (!scan.result) return base
  const bc = scan.result.by_category
  const pickName = (arr: ScanHit[]) =>
    arr.filter((h) => h.id !== 'custom').map((h) => h.name)

  const platformHit = bc.platform.find((h) => h.id !== 'custom')
  base.platform = platformHit?.name ?? 'Unknown'
  base.crm = bc.crm[0]?.name
  base.analytics = pickName(bc.analytics)
  base.chat = pickName(bc.chat)
  base.email = pickName(bc.email)
  base.payments = pickName(bc.payments)
  base.security = pickName(bc.security)
  base.detected_count = scan.result.hits.filter((h) => h.id !== 'custom').length

  const required = ['analytics', 'crm', 'email'] as const
  base.gaps = required.filter((c) => bc[c].length === 0)

  return base
}

async function poolMap<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export async function POST(req: NextRequest) {
  let body: BulkBody
  try {
    body = (await req.json()) as BulkBody
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }

  const urls = parseUrls(body)
  if (urls.length === 0) {
    return NextResponse.json({ ok: false, error: 'no urls provided' }, { status: 400 })
  }

  const supabase = await createServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session?.user?.id ?? null

  const sb = userId
    ? createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null

  const scans = await poolMap(urls, CONCURRENCY, scanUrl)
  const results: UrlEnrichResult[] = []

  for (let i = 0; i < scans.length; i++) {
    const scan = scans[i]
    const summary = summarize(scan)

    if (sb && userId && scan.ok && scan.result) {
      try {
        const detectedJson: Record<string, ScanHit[]> = {}
        for (const [cat, hits] of Object.entries(scan.result.by_category)) {
          detectedJson[cat] = hits
        }
        const { data, error } = await sb
          .from('stack_scans')
          .insert({
            user_id: userId,
            url: scan.url,
            hostname: scan.hostname,
            detected: detectedJson,
            network_hosts: [],
            gaps: summary.gaps,
            recommendations: [],
            stack_gap_score: 100 - summary.gaps.length * 20,
          })
          .select('id')
          .single()
        if (!error && data) summary.scan_id = data.id
      } catch (e) {
        console.warn('[bulk-scan] persist skipped:', (e as Error).message)
      }
    }

    summary.input = urls[i]
    results.push(summary)
  }

  return NextResponse.json({
    ok: true,
    scanned: results.length,
    saved_user: !!userId,
    results,
  })
}
