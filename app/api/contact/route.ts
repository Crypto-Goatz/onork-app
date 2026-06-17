/**
 * Public Contact Form Endpoint
 * POST /api/contact
 *
 * Receives submissions from the contact page (app/contact/contact-client.tsx).
 * Creates a CRM contact in the 0nCore location + logs the submission locally.
 * No auth required — public endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = (body.name as string | undefined)?.trim() || ''
  const email = (body.email as string | undefined)?.trim() || ''
  const reason = (body.reason as string | undefined)?.trim() || 'General'
  const message = (body.message as string | undefined)?.trim() || ''

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const pit = process.env.CRM_PIT_ONCORE || process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
  const locationId = process.env.CRM_LOCATION_ID || ''
  const submissionId = crypto.randomUUID()

  // 1. Store the submission locally first so the lead is never lost
  try {
    await admin.from('form_submissions').insert({
      id: submissionId,
      form_id: 'contact',
      location_id: locationId || null,
      fields: { name, email, reason, message },
      meta: {
        form: 'contact',
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
        userAgent: req.headers.get('user-agent') || '',
        referer: req.headers.get('referer') || '',
        submittedAt: new Date().toISOString(),
      },
      status: 'new',
    })
  } catch (err) {
    console.error('[Contact] Local store error:', err)
  }

  // 2. Create / update CRM contact
  let crmContactId: string | null = null
  if (pit && locationId) {
    try {
      const nameParts = name.split(' ')
      const crmRes = await fetch(`${CRM_API}/contacts/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pit}`,
          Version: CRM_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId,
          email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          source: 'website-contact-form',
          tags: ['contact-form', `reason:${reason.toLowerCase()}`],
          customFields: message ? [{ key: 'contact_message', value: message }] : undefined,
        }),
      })

      if (crmRes.ok) {
        const crmData = await crmRes.json()
        crmContactId = crmData.contact?.id || null
        try {
          await admin
            .from('form_submissions')
            .update({ crm_contact_id: crmContactId, status: 'synced' })
            .eq('id', submissionId)
        } catch {}
      } else {
        console.error(`[Contact] CRM contact creation failed: ${crmRes.status}`)
      }
    } catch (err) {
      console.error('[Contact] CRM error:', err)
    }
  }

  console.log(`[Contact] ${email} | reason=${reason} | CRM: ${crmContactId || 'skipped'}`)

  return NextResponse.json({ success: true, submissionId, crmContactId })
}
