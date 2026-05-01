/**
 * POST /api/reports/run
 *
 * Body: { url: string, scanners: ScannerSlug[], contact_id?: string, label?: string }
 *
 * Runs every requested scanner against the URL in parallel where possible,
 * aggregates results, returns a ReportResult bundle.
 *
 * Auth: admin-only (manage_options equivalent — checks if the caller is Mike).
 * For now this is gated by a shared admin token until we wire it through to
 * the existing 0ncore session auth.
 */

import { NextResponse } from 'next/server'
import type { ReportRequest, ReportResult, ScanInput, ScanOutput } from '@/lib/scanners/types'
import { runCrmStackScan } from '@/lib/scanners/crm-stack'
import { getScanner } from '@/lib/scanners/registry'
import { randomUUID } from 'crypto'

const ADMIN_TOKEN = process.env.REPORT_BUILDER_ADMIN_TOKEN ?? ''

function isAuthorized(req: Request): boolean {
  // Allow when token is set and matches header.
  if (ADMIN_TOKEN) {
    const got = req.headers.get('x-admin-token') || ''
    return got === ADMIN_TOKEN
  }
  // Otherwise, accept same-origin requests from the dashboard.
  const origin = req.headers.get('origin') || ''
  return origin.endsWith('0ncore.com') || origin.endsWith('.vercel.app') || origin === ''
}

function normalizeUrl(input: string): { url: string; domain: string } {
  let url = input.trim()
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  let domain = ''
  try {
    domain = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    domain = url
  }
  return { url, domain }
}

/**
 * Pre-fetch the page once so multiple scanners can share the response. Saves
 * 1 round-trip per additional scanner that needs HTML/headers.
 */
async function prefetch(url: string): Promise<{ html?: string; headers?: Record<string, string> }> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    const html = await res.text()
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v
    })
    return { html, headers }
  } catch {
    return {}
  }
}

async function runOne(slug: string, input: ScanInput): Promise<ScanOutput> {
  const t0 = Date.now()
  switch (slug) {
    case 'crm_stack':
      return runCrmStackScan(input)
    default: {
      const meta = getScanner(slug)
      return {
        scanner: slug as ScanOutput['scanner'],
        ok: false,
        duration_ms: Date.now() - t0,
        error: meta
          ? `Scanner "${meta.name}" is ${meta.status} — runner not yet implemented.`
          : `Unknown scanner "${slug}".`,
      }
    }
  }
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ReportRequest
  try {
    body = (await req.json()) as ReportRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.url) return NextResponse.json({ error: 'url required' }, { status: 400 })
  if (!Array.isArray(body.scanners) || body.scanners.length === 0) {
    return NextResponse.json({ error: 'scanners[] required' }, { status: 400 })
  }

  const { url, domain } = normalizeUrl(body.url)
  const t0 = Date.now()

  const prefetched = await prefetch(url)
  const input: ScanInput = { url, domain, html: prefetched.html, headers: prefetched.headers }

  // Run scanners in parallel — each one is internally bounded by its own timeout.
  const settled = await Promise.allSettled(body.scanners.map((slug) => runOne(slug, input)))
  const results: ScanOutput[] = settled.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return {
      scanner: body.scanners[i] as ScanOutput['scanner'],
      ok: false,
      duration_ms: 0,
      error: r.reason instanceof Error ? r.reason.message : 'unknown',
    }
  })

  const scoring = results.filter((r) => r.ok && typeof r.score === 'number') as Array<
    ScanOutput & { score: number }
  >
  const composite_score =
    scoring.length === 0
      ? undefined
      : Math.round(scoring.reduce((sum, r) => sum + r.score, 0) / scoring.length)

  const report: ReportResult = {
    id: randomUUID(),
    url,
    domain,
    requested_at: new Date().toISOString(),
    duration_ms: Date.now() - t0,
    scanners: body.scanners,
    results,
    composite_score,
  }

  return NextResponse.json(report)
}
