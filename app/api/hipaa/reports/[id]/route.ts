/**
 * GET /api/hipaa/reports/:id
 *
 * Auth:
 *   ?t=<report_view_token>                           — emailed to the customer on purchase
 *   x-hipaa-webhook-secret                           — server-to-server (rocketopp proxy)
 *   cookie sb-access-token / onork admin session     — dashboard admin
 *
 * Returns the full report bundle or a "generating" / "failed" status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TIER_META } from '@/lib/hipaa/report-types'

const WEBHOOK_SECRET = process.env.HIPAA_WEBHOOK_SECRET || ''

export const runtime = 'nodejs'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  const token = url.searchParams.get('t') || ''
  const wh = req.headers.get('x-hipaa-webhook-secret') || ''

  const sb = admin()

  const { data: order } = await sb
    .from('hipaa_orders')
    .select('id, customer_email, customer_name, company_name, tier, report_status, report_view_token, report_generated_at, support_call_expires_at, source_site, credit_hidden')
    .eq('id', id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const authed =
    (WEBHOOK_SECRET && wh === WEBHOOK_SECRET) ||
    (token && order.report_view_token && token === order.report_view_token)

  if (!authed) return NextResponse.json({ error: 'unauthorised' }, { status: 401 })

  if (order.report_status !== 'ready') {
    return NextResponse.json({
      orderId: order.id,
      tier: order.tier,
      reportStatus: order.report_status,
      companyName: order.company_name,
      message: order.report_status === 'failed'
        ? 'Report generation failed — contact support.'
        : 'Your report is still being generated. Refresh in 60 seconds.',
    })
  }

  const [{ data: report }, { data: assessment }] = await Promise.all([
    sb.from('hipaa_reports').select('*').eq('order_id', order.id).maybeSingle(),
    sb.from('hipaa_assessments').select('public_url, dashboard_url, current_grade, current_rule_score, nprm_grade, nprm_2026_score, created_at, results').eq('id', (await sb.from('hipaa_orders').select('assessment_id').eq('id', order.id).single()).data?.assessment_id || '').maybeSingle(),
  ])

  if (!report) {
    return NextResponse.json({ error: 'report_missing', reportStatus: 'generating' })
  }

  const meta = TIER_META[(order.tier || 1) as 1 | 2 | 3 | 4]

  return NextResponse.json({
    orderId: order.id,
    tier: order.tier,
    tierMeta: meta,
    customerEmail: order.customer_email,
    customerName: order.customer_name,
    companyName: order.company_name,
    creditHidden: order.credit_hidden,
    sourceSite: order.source_site,
    reportStatus: 'ready',
    reportGeneratedAt: order.report_generated_at,
    supportCallExpiresAt: order.support_call_expires_at,

    assessment: assessment ? {
      publicUrl: assessment.public_url,
      dashboardUrl: assessment.dashboard_url,
      currentGrade: assessment.current_grade,
      currentRuleScore: assessment.current_rule_score,
      nprmGrade: assessment.nprm_grade,
      nprm2026Score: assessment.nprm_2026_score,
      scanDate: assessment.created_at,
    } : null,

    executiveSummary: report.executive_summary,
    findings:         report.findings || [],
    attestationItems: report.attestation_items || [],
    remediationPlan:  report.remediation_plan || [],
    supportCallUrl:   report.support_call_url || null,
    meta: {
      generatedBy: report.generated_by,
      tokensUsed:  report.tokens_used,
      durationMs:  report.duration_ms,
    },
  })
}
