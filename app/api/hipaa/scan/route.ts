/**
 * HIPAA 2026 Readiness Assessment — Scan API
 * POST: runs scanner, saves to Supabase, creates CRM contact
 * PRIVATE: RocketOpp location only (6MSqx0trfxgLxeHBJE1k)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runHIPAAScan, type HIPAAInput } from '@/lib/hipaa/scanner'
import { crmPost } from '@/lib/crm'

const ROCKETOPP_LOCATION = '6MSqx0trfxgLxeHBJE1k'
const WEBHOOK_SECRET = process.env.HIPAA_WEBHOOK_SECRET || ''

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const isPublic = body.public === true

    // Auth: public mode (limited results), webhook secret, or admin session
    const authHeader = req.headers.get('authorization') || ''
    const webhookKey = req.headers.get('x-hipaa-webhook-secret') || ''
    let authenticated = false
    let fullAccess = false

    if (isPublic) {
      // Public lead-magnet mode — limited results returned below
      authenticated = true
      fullAccess = false
    } else if (webhookKey && webhookKey === WEBHOOK_SECRET) {
      authenticated = true
      fullAccess = true
    } else if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const supabase = getAdmin()
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        // Verify admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        if (profile?.is_admin) {
          authenticated = true
          fullAccess = true
        }
      }
    }

    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized — admin access required' }, { status: 401 })
    }

    // Map public form fields to HIPAAInput
    const scanInput: HIPAAInput = {
      publicUrl: body.publicUrl,
      dashboardUrl: body.dashboardUrl,
      companyName: body.companyName || 'Unknown',
      contactEmail: body.contactEmail || '',
      entityType: body.entityType || 'unsure',
      employeeCount: body.employeeCount || '',
      primaryState: body.primaryState || '',
      locationId: body.locationId,
    }

    // Validate required fields
    if (!scanInput.publicUrl || !scanInput.dashboardUrl) {
      return NextResponse.json({ error: 'publicUrl and dashboardUrl are required' }, { status: 400 })
    }

    // Run the scanner
    const result = await runHIPAAScan(scanInput)

    // Save to Supabase
    const supabase = getAdmin()
    const { data: assessment, error: dbError } = await supabase
      .from('hipaa_assessments')
      .insert({
        company_name: result.companyName,
        contact_email: scanInput.contactEmail || null,
        public_url: result.publicUrl,
        dashboard_url: result.dashboardUrl,
        entity_type: scanInput.entityType || 'unsure',
        employee_count: scanInput.employeeCount || null,
        primary_state: scanInput.primaryState || null,
        current_rule_score: result.currentRuleScore,
        nprm_2026_score: result.nprm2026Score,
        current_grade: result.currentGrade,
        nprm_grade: result.nprmGrade,
        results: {
          publicChecks: result.publicChecks,
          dashboardChecks: result.dashboardChecks,
          universalChecks: result.universalChecks,
          stateOverlay: result.stateOverlay,
          criticalFindings: result.criticalFindings,
          highFindings: result.highFindings,
          mediumFindings: result.mediumFindings,
          lowFindings: result.lowFindings,
          passCount: result.passCount,
          failCount: result.failCount,
        },
        remediation: result.remediationPriority,
        location_id: scanInput.locationId || ROCKETOPP_LOCATION,
        status: 'completed',
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('[HIPAA] Supabase insert error:', dbError)
      // Still return the result even if DB fails
      return NextResponse.json({ result, assessmentId: null, dbError: dbError.message })
    }

    // Create CRM contact for the prospect
    let crmContactId: string | null = null
    if (scanInput.contactEmail) {
      try {
        const crmRes = await crmPost('/contacts/', ROCKETOPP_LOCATION, {
          email: scanInput.contactEmail,
          name: scanInput.companyName,
          tags: ['hipaa-scan', `hipaa-grade-${result.currentGrade.toLowerCase()}`, ...(isPublic ? ['hipaa-public-scan'] : [])],
          customFields: [
            { key: 'hipaa_current_score', value: String(result.currentRuleScore) },
            { key: 'hipaa_nprm_score', value: String(result.nprm2026Score) },
            { key: 'hipaa_critical_findings', value: String(result.criticalFindings) },
            { key: 'hipaa_scan_date', value: result.scanDate },
          ],
          source: isPublic ? 'HIPAA Public Scanner' : 'HIPAA Scanner',
        })
        if (crmRes.ok) {
          const crmData = await crmRes.json()
          crmContactId = crmData.contact?.id || crmData.id || null

          // Update assessment with CRM contact ID
          if (crmContactId && assessment?.id) {
            await supabase
              .from('hipaa_assessments')
              .update({ crm_contact_id: crmContactId })
              .eq('id', assessment.id)
          }
        }
      } catch (err) {
        console.error('[HIPAA] CRM contact creation error:', err)
      }
    }

    // Public mode: return limited results (scores + grade + critical count + top 5 findings)
    if (!fullAccess) {
      const allChecks = [
        ...(result.publicChecks || []),
        ...(result.dashboardChecks || []),
        ...(result.universalChecks || []),
      ]
      const failed = allChecks
        .filter(c => c.status === 'fail')
        .sort((a, b) => {
          const sev: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
          return (sev[b.severity] || 0) - (sev[a.severity] || 0)
        })
        .slice(0, 5)

      return NextResponse.json({
        result: {
          currentRuleScore: result.currentRuleScore,
          nprm2026Score: result.nprm2026Score,
          currentGrade: result.currentGrade,
          nprmGrade: result.nprmGrade,
          criticalFindings: result.criticalFindings,
          highFindings: result.highFindings,
        },
        topFindings: failed.map(f => ({
          name: f.name,
          severity: f.severity,
          detail: f.detail,
        })),
        assessmentId: assessment?.id || null,
      })
    }

    return NextResponse.json({
      result,
      assessmentId: assessment?.id || null,
      crmContactId,
    })
  } catch (err) {
    console.error('[HIPAA] Scan error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 }
    )
  }
}
