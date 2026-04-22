/**
 * POST /api/hipaa/order — convert a public HIPAA scan into a full-report order.
 *
 * Auth: webhook secret (x-hipaa-webhook-secret) so external sites like
 * rocketopp.com can create orders server-side without bundling secrets
 * into the browser.
 *
 * Flow:
 *   1. Look up the assessment row created by /api/hipaa/scan
 *   2. Create a hipaa_orders row
 *   3. Render the "laymen findings" PDF
 *   4. Upload to Supabase Storage (bucket: hipaa-reports)
 *   5. Email the customer (with the PDF link)
 *   6. Email Mike with the notification
 *   7. Return the order id + pdf url
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildHipaaPdf } from '@/lib/hipaa/pdf'
import { sendCustomerConfirmation, sendMikeNotification } from '@/lib/hipaa/email'

export const runtime = 'nodejs'
export const maxDuration = 60

const WEBHOOK_SECRET = process.env.HIPAA_WEBHOOK_SECRET || ''
const BUCKET = 'hipaa-reports'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const wh = req.headers.get('x-hipaa-webhook-secret') || ''
  if (!WEBHOOK_SECRET || wh !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const assessmentId = String(body?.assessmentId || '')
  const customerEmail = String(body?.customerEmail || '').toLowerCase().trim()
  const customerName = body?.customerName ? String(body.customerName) : null
  const sourceSite   = body?.sourceSite ? String(body.sourceSite) : null
  const referralCode = body?.referralCode ? String(body.referralCode) : null
  const creditHidden = Boolean(body?.creditHidden)

  if (!assessmentId || !customerEmail) {
    return NextResponse.json({ error: 'assessmentId + customerEmail required' }, { status: 400 })
  }

  const sb = admin()

  // 1) load the assessment
  const { data: a, error: aErr } = await sb
    .from('hipaa_assessments')
    .select('*')
    .eq('id', assessmentId)
    .maybeSingle()

  if (aErr || !a) {
    return NextResponse.json({ error: 'assessment_not_found' }, { status: 404 })
  }

  // 2) insert order row
  const { data: order, error: oErr } = await sb
    .from('hipaa_orders')
    .insert({
      assessment_id: a.id,
      customer_email: customerEmail,
      customer_name: customerName,
      company_name: a.company_name,
      source_site: sourceSite,
      referral_code: referralCode,
      credit_hidden: creditHidden,
      price_cents: 0,
      status: 'processing',
    })
    .select()
    .single()

  if (oErr || !order) {
    return NextResponse.json({ error: 'order_insert_failed', detail: oErr?.message }, { status: 500 })
  }

  // 3) top findings for the PDF (laymen-terms)
  const results = (a.results || {}) as {
    publicChecks?: { name: string; severity: string; status: string; detail: string }[]
    dashboardChecks?: { name: string; severity: string; status: string; detail: string }[]
    universalChecks?: { name: string; severity: string; status: string; detail: string }[]
  }
  const allChecks = [
    ...(results.publicChecks || []),
    ...(results.dashboardChecks || []),
    ...(results.universalChecks || []),
  ]
  const topFindings = allChecks
    .filter((c) => c.status === 'fail')
    .sort((x, y) => {
      const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
      return (rank[y.severity] || 0) - (rank[x.severity] || 0)
    })
    .slice(0, 8)
    .map((c) => ({ name: c.name, severity: c.severity, detail: c.detail }))

  // 4) render + upload PDF
  let pdfUrl: string | null = null
  try {
    const pdfBuf = await buildHipaaPdf({
      companyName: a.company_name,
      publicUrl: a.public_url,
      dashboardUrl: a.dashboard_url,
      currentGrade: a.current_grade || 'F',
      currentRuleScore: a.current_rule_score || 0,
      nprmGrade: a.nprm_grade || 'F',
      nprm2026Score: a.nprm_2026_score || 0,
      criticalFindings: countBy(allChecks, 'critical'),
      highFindings: countBy(allChecks, 'high'),
      topFindings,
      scanDate: a.created_at,
      contactEmail: customerEmail,
      creditHidden,
    })

    // Ensure bucket exists (idempotent)
    await ensureBucket(sb)

    const path = `orders/${order.id}/initial-findings.pdf`
    const up = await sb.storage.from(BUCKET).upload(path, pdfBuf, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (up.error) throw up.error

    // Signed URL, 7-day window (laymen's interim; full report follows)
    const signed = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7)
    if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error('signed_url_missing')
    pdfUrl = signed.data.signedUrl

    await sb.from('hipaa_orders').update({ pdf_url: pdfUrl }).eq('id', order.id)
  } catch (e) {
    console.error('[HIPAA] PDF generation failed:', e)
    // Non-fatal: continue to send email without attachment link
  }

  // 5) customer email
  try {
    await sendCustomerConfirmation({
      to: customerEmail,
      toName: customerName,
      companyName: a.company_name,
      orderId: order.id,
      pdfUrl: pdfUrl || 'https://0ncore.com/dashboard/hipaa',
      currentGrade: a.current_grade || 'F',
      currentRuleScore: a.current_rule_score || 0,
      criticalFindings: countBy(allChecks, 'critical'),
      highFindings: countBy(allChecks, 'high'),
      creditHidden,
    })
    await sb.from('hipaa_orders').update({ initial_email_sent_at: new Date().toISOString() }).eq('id', order.id)
  } catch (e) {
    console.error('[HIPAA] customer email failed:', e)
  }

  // 6) Mike notification
  try {
    await sendMikeNotification({
      orderId: order.id,
      customerEmail,
      customerName,
      companyName: a.company_name,
      sourceSite,
      currentGrade: a.current_grade || 'F',
      criticalFindings: countBy(allChecks, 'critical'),
      highFindings: countBy(allChecks, 'high'),
    })
  } catch (e) {
    console.error('[HIPAA] Mike notification failed:', e)
  }

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    pdfUrl,
    message: 'Order received. Full report within 60 minutes.',
  })
}

function countBy(checks: { severity: string; status: string }[], sev: string): number {
  return checks.filter((c) => c.status === 'fail' && c.severity.toLowerCase() === sev).length
}

async function ensureBucket(sb: ReturnType<typeof admin>) {
  const { data } = await sb.storage.listBuckets()
  const exists = (data || []).some((b) => b.name === BUCKET)
  if (!exists) {
    await sb.storage.createBucket(BUCKET, { public: false })
  }
}
