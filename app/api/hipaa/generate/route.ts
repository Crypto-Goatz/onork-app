/**
 * POST /api/hipaa/generate — manually (re)run AI report generation for an order.
 *
 * Used as a fallback when the `after()` call from /api/hipaa/order is cut
 * short by the serverless runtime. Safe to retry — this endpoint is
 * idempotent-ish: it replaces any existing hipaa_reports row for the order.
 *
 * Auth: webhook secret (x-hipaa-webhook-secret) — server-to-server only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateReport } from '@/lib/hipaa/ai-generate'
import { TIER_META, type Tier } from '@/lib/hipaa/report-types'
import { sendReportReady, upsertHipaaContact } from '@/lib/hipaa/email'

export const runtime = 'nodejs'
export const maxDuration = 300

const WEBHOOK_SECRET = process.env.HIPAA_WEBHOOK_SECRET || ''

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const wh = req.headers.get('x-hipaa-webhook-secret') || ''
  if (!WEBHOOK_SECRET || wh !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const orderId = String(body?.orderId || '')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const sb = admin()
  const { data: order, error } = await sb
    .from('hipaa_orders')
    .select('*')
    .eq('id', orderId)
    .single()
  if (error || !order) {
    return NextResponse.json({ error: 'order not found', detail: error?.message }, { status: 404 })
  }

  const { data: a } = await sb
    .from('hipaa_assessments')
    .select('*')
    .eq('id', order.assessment_id)
    .single()
  if (!a) return NextResponse.json({ error: 'assessment not found' }, { status: 404 })

  const tier = (order.tier || 1) as Tier
  const tierMeta = TIER_META[tier]

  await sb.from('hipaa_orders').update({ report_status: 'generating' }).eq('id', orderId)

  try {
    const report = await generateReport({
      orderId,
      tier,
      customerEmail: order.customer_email,
      supportCallUrl: tierMeta.includesSupportCall
        ? `https://rocketopp.com/hipaa/book-call?order=${orderId}`
        : undefined,
      supportCallExpiresAt: order.support_call_expires_at || undefined,
      assessment: a,
    })

    // Replace any existing report row.
    await sb.from('hipaa_reports').delete().eq('order_id', orderId)
    await sb.from('hipaa_reports').insert({
      order_id: orderId,
      tier,
      executive_summary: report.executiveSummary,
      findings: report.findings,
      attestation_items: report.attestationItems,
      nprm_delta: tierMeta.includesNprmOverlay
        ? report.findings.filter((f) => f.nprmAnalysis).map((f) => ({ checkId: f.checkId, nprmAnalysis: f.nprmAnalysis }))
        : null,
      remediation_plan: report.remediationPlan,
      support_call_url: report.supportCallUrl,
      generated_by: report.meta.generatedBy,
      tokens_used: report.meta.tokensUsed,
      duration_ms: report.meta.durationMs,
    })

    await sb.from('hipaa_orders').update({
      report_status: 'ready',
      report_generated_at: new Date().toISOString(),
      status: 'delivered',
      full_report_sent_at: new Date().toISOString(),
    }).eq('id', orderId)

    // Resolve (or rebuild) contactId + fire the report-ready email so this
    // endpoint is a single-shot "make the customer happy" entry point.
    let contactId: string | null = order.contact_id || null
    if (!contactId && order.customer_email) {
      contactId = await upsertHipaaContact({
        email: order.customer_email,
        name: order.customer_name,
        companyName: a.company_name,
        orderId,
        tier,
        sourceSite: order.source_site,
      })
      if (contactId) {
        await sb.from('hipaa_orders').update({ contact_id: contactId }).eq('id', orderId)
      }
    }
    if (contactId && order.report_view_token) {
      try {
        await sendReportReady({
          contactId,
          toName: order.customer_name,
          companyName: report.companyName,
          orderId,
          reportViewUrl: `https://rocketopp.com/hipaa/reports/${orderId}?t=${order.report_view_token}`,
          supportCallUrl: tierMeta.includesSupportCall ? `https://rocketopp.com/hipaa/book-call?order=${orderId}` : null,
          supportCallExpiresAt: order.support_call_expires_at || null,
          tier,
          tierName: tierMeta.name,
          currentGrade: report.currentGrade,
          nprmGrade: report.nprmGrade,
          criticalFindings: report.findings.filter((f) => f.severity === 'critical').length,
          findingsCount: report.findings.length,
          creditHidden: Boolean(order.credit_hidden),
        })
      } catch (e) {
        console.warn('[HIPAA] report-ready email failed:', (e as Error).message)
      }
    }

    return NextResponse.json({
      ok: true,
      orderId,
      tier,
      findings: report.findings.length,
      durationMs: report.meta.durationMs,
      tokensUsed: report.meta.tokensUsed,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[HIPAA] manual generation failure', e)
    await sb.from('hipaa_orders').update({ report_status: 'failed' }).eq('id', orderId)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
