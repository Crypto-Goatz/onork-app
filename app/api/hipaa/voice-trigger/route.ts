/**
 * HIPAA 2026 — Voice AI Trigger
 * POST: after assessment, creates CRM contact and triggers voice follow-up
 * Falls back to email if voice is not configured.
 * PRIVATE: webhook secret required
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crmPost, crmGet } from '@/lib/crm'

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
    // Auth: webhook secret or admin bearer token
    const webhookKey = req.headers.get('x-hipaa-webhook-secret') || ''
    const authHeader = req.headers.get('authorization') || ''
    let authenticated = false

    if (webhookKey && webhookKey === WEBHOOK_SECRET) {
      authenticated = true
    } else if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const supabase = getAdmin()
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        if (profile?.is_admin) authenticated = true
      }
    }

    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { assessmentId, contactEmail, companyName, contactPhone, contactName } = body

    if (!assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required' }, { status: 400 })
    }

    // Fetch the assessment
    const supabase = getAdmin()
    const { data: assessment } = await supabase
      .from('hipaa_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single()

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const results = assessment.results as Record<string, unknown>
    const criticalCount = (results?.criticalFindings as number) || 0
    const currentGrade = assessment.current_grade || 'N/A'

    // Ensure CRM contact exists
    let crmContactId = assessment.crm_contact_id
    if (!crmContactId && (contactEmail || contactPhone)) {
      try {
        const crmRes = await crmPost('/contacts/', ROCKETOPP_LOCATION, {
          email: contactEmail || undefined,
          phone: contactPhone || undefined,
          name: contactName || companyName || assessment.company_name,
          tags: ['hipaa-scan', `hipaa-grade-${currentGrade.toLowerCase()}`, 'voice-followup'],
          source: 'HIPAA Scanner Voice Trigger',
        })
        if (crmRes.ok) {
          const crmData = await crmRes.json()
          crmContactId = crmData.contact?.id || crmData.id || null

          if (crmContactId) {
            await supabase
              .from('hipaa_assessments')
              .update({ crm_contact_id: crmContactId })
              .eq('id', assessmentId)
          }
        }
      } catch (err) {
        console.error('[HIPAA Voice] CRM contact error:', err)
      }
    }

    // Build the voice prompt
    const voicePrompt = [
      `Hello ${contactName || companyName || assessment.company_name}.`,
      `This is a follow-up call from RocketOpp regarding your HIPAA 2026 Readiness Assessment.`,
      `Your current compliance score is ${assessment.current_rule_score} out of 100, grade ${currentGrade}.`,
      criticalCount > 0
        ? `We identified ${criticalCount} critical finding${criticalCount > 1 ? 's' : ''} that need immediate attention.`
        : `Your site has no critical findings, which is a strong foundation.`,
      `Under the proposed 2026 NPRM rules, your projected score would be ${assessment.nprm_2026_score} out of 100.`,
      `We recommend scheduling a consultation to walk through the remediation roadmap.`,
      `Would you like to schedule a 30-minute HIPAA review session?`,
    ].join(' ')

    let triggerResult: { method: 'voice' | 'email' | 'none'; success: boolean; detail: string } = {
      method: 'none',
      success: false,
      detail: 'No contact method available',
    }

    // Try voice first (if phone is available and voice agent is configured)
    if (contactPhone && process.env.CRM_VOICE_AGENT_ID) {
      try {
        const voiceRes = await crmPost('/voice-ai/calls', ROCKETOPP_LOCATION, {
          agentId: process.env.CRM_VOICE_AGENT_ID,
          contactId: crmContactId,
          phone: contactPhone,
          prompt: voicePrompt,
          metadata: {
            assessmentId,
            currentScore: assessment.current_rule_score,
            nprmScore: assessment.nprm_2026_score,
            criticalFindings: criticalCount,
          },
        })

        if (voiceRes.ok) {
          triggerResult = { method: 'voice', success: true, detail: 'Voice call initiated' }
        } else {
          const txt = await voiceRes.text()
          console.error('[HIPAA Voice] Voice call failed:', txt)
          triggerResult = { method: 'voice', success: false, detail: `Voice call failed: ${voiceRes.status}` }
        }
      } catch (err) {
        console.error('[HIPAA Voice] Voice error:', err)
        triggerResult = { method: 'voice', success: false, detail: 'Voice call error' }
      }
    }

    // Fall back to email if voice didn't succeed
    if (!triggerResult.success && contactEmail) {
      try {
        const emailBody = `
<h2>HIPAA 2026 Readiness Assessment Results</h2>
<p>Hello ${contactName || companyName || assessment.company_name},</p>
<p>Thank you for running a HIPAA 2026 Readiness Assessment with RocketOpp.</p>

<table style="border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:8px;border:1px solid #333;font-weight:bold">Current Rule Score</td><td style="padding:8px;border:1px solid #333">${assessment.current_rule_score}/100 (Grade: ${currentGrade})</td></tr>
  <tr><td style="padding:8px;border:1px solid #333;font-weight:bold">2026 NPRM Score</td><td style="padding:8px;border:1px solid #333">${assessment.nprm_2026_score}/100 (Grade: ${assessment.nprm_grade})</td></tr>
  <tr><td style="padding:8px;border:1px solid #333;font-weight:bold">Critical Findings</td><td style="padding:8px;border:1px solid #333">${criticalCount}</td></tr>
</table>

<p>${criticalCount > 0
  ? `We identified <strong>${criticalCount} critical finding${criticalCount > 1 ? 's' : ''}</strong> that require immediate remediation.`
  : 'No critical findings were detected, but there are areas for improvement under the proposed 2026 NPRM rules.'
}</p>

<p>We recommend scheduling a complimentary 30-minute HIPAA review session to walk through your remediation roadmap.</p>

<p><a href="https://0ncore.com/request?type=hipaa-review&id=${assessmentId}" style="display:inline-block;padding:12px 24px;background:#7ed957;color:#000;text-decoration:none;border-radius:6px;font-weight:bold">Schedule HIPAA Review</a></p>

<p style="color:#888;font-size:12px">This assessment was generated by the 0nCore HIPAA 2026 Readiness Scanner. It is not legal advice.</p>
`

        const emailRes = await crmPost('/conversations/messages', ROCKETOPP_LOCATION, {
          type: 'Email',
          contactId: crmContactId,
          subject: `HIPAA 2026 Assessment: ${currentGrade} Grade — ${assessment.company_name}`,
          html: emailBody,
        })

        if (emailRes.ok) {
          triggerResult = { method: 'email', success: true, detail: 'Follow-up email sent' }
        } else {
          const txt = await emailRes.text()
          triggerResult = { method: 'email', success: false, detail: `Email failed: ${emailRes.status} — ${txt}` }
        }
      } catch (err) {
        console.error('[HIPAA Voice] Email fallback error:', err)
        triggerResult = { method: 'email', success: false, detail: 'Email error' }
      }
    }

    return NextResponse.json({
      assessmentId,
      crmContactId,
      trigger: triggerResult,
    })
  } catch (err) {
    console.error('[HIPAA Voice Trigger] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Voice trigger failed' },
      { status: 500 }
    )
  }
}
