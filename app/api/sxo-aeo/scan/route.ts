/**
 * POST /api/sxo-aeo/scan — run combined SXO+AEO scan + return MD report.
 *
 * 0nCore-internal version: any logged-in user can run scans against any
 * URL. Results are written to sxo_aeo_scans (separate from sxowebsite's
 * sxo_scans table — this is the internal portal, not the storefront).
 * Markdown is generated inline so the user can download immediately.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runCombinedScan } from '@/lib/sxo-aeo/engine'
import { generateMarkdownReport } from '@/lib/sxo-aeo/markdown'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url, userId, withMarkdown = true } = body as {
      url?: string
      userId?: string
      withMarkdown?: boolean
    }

    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

    const result = await runCombinedScan(url)
    const markdown = withMarkdown ? generateMarkdownReport(result) : null

    const { data: row, error } = await admin
      .from('sxo_aeo_scans')
      .insert({
        url: result.url,
        domain: result.domain,
        page_title: result.pageTitle,
        user_id: userId || null,
        sxo_score: result.sxoScore,
        aeo_score: result.aeoScore,
        combined_score: result.combinedScore,
        sxo_breakdown: result.sxoBreakdown,
        aeo_factors: result.aeoFactors,
        sxo_findings: result.sxoFindings,
        aeo_findings: result.aeoFindings,
        page_snapshot: result.pageSnapshot,
        markdown,
      })
      .select('id')
      .single()

    if (error) console.error('[sxo-aeo/scan] persist failed:', error.message)

    return NextResponse.json({
      scanId: row?.id || null,
      ...result,
      markdown,
    })
  } catch (e) {
    console.error('[sxo-aeo/scan] failed:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
