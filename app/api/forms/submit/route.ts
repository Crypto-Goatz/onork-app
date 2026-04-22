/**
 * Public Form Submission Endpoint
 * POST /api/forms/submit
 *
 * Receives submissions from embedded forms on external sites.
 * Creates a CRM contact + logs the submission.
 * No auth required — public endpoint with CORS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { formId, fields, meta } = body

    if (!formId || !fields) {
      return NextResponse.json({ error: 'formId and fields required' }, { status: 400, headers: corsHeaders() })
    }

    // 1. Look up form config to find the owner's location
    const { data: form } = await admin
      .from('forms')
      .select('id, user_id, location_id, name, fields, settings')
      .eq('id', formId)
      .single()

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404, headers: corsHeaders() })
    }

    const locationId = form.location_id
    const submissionId = crypto.randomUUID()

    // 2. Store submission locally
    await admin.from('form_submissions').insert({
      id: submissionId,
      form_id: formId,
      user_id: form.user_id,
      location_id: locationId,
      fields,
      meta: {
        ...meta,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
        userAgent: req.headers.get('user-agent') || '',
        referer: req.headers.get('referer') || '',
        submittedAt: new Date().toISOString(),
      },
      status: 'new',
    })

    // 3. Create CRM contact from form fields
    let crmContactId: string | null = null
    if (locationId) {
      try {
        // Resolve PIT for this location
        const pitMap: Record<string, string | undefined> = {
          '6MSqx0trfxgLxeHBJE1k': process.env.CRM_PIT_ROCKETOPP,
          'nphConTwfHcVE1oA0uep': process.env.CRM_PIT_RAW,
        }
        const pit = pitMap[locationId] || process.env.CRM_AGENCY_PIT_NEW || process.env.CRM_PIT_RAW || ''

        if (pit) {
          const contactPayload: Record<string, unknown> = { locationId, source: `Form: ${form.name}` }

          // Map common field names to CRM fields
          for (const [key, value] of Object.entries(fields)) {
            const k = key.toLowerCase()
            if (k === 'email' || k === 'e-mail') contactPayload.email = value
            else if (k === 'firstname' || k === 'first_name' || k === 'first name') contactPayload.firstName = value
            else if (k === 'lastname' || k === 'last_name' || k === 'last name') contactPayload.lastName = value
            else if (k === 'name' || k === 'full name' || k === 'fullname') {
              const parts = String(value).split(' ')
              contactPayload.firstName = parts[0]
              contactPayload.lastName = parts.slice(1).join(' ')
            }
            else if (k === 'phone' || k === 'telephone' || k === 'mobile') contactPayload.phone = value
            else if (k === 'company' || k === 'business' || k === 'organization') contactPayload.companyName = value
          }

          // Only create contact if we have at least an email or phone
          if (contactPayload.email || contactPayload.phone) {
            const crmRes = await fetch(`${CRM_API}/contacts/`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${pit}`,
                Version: CRM_VERSION,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(contactPayload),
            })

            if (crmRes.ok) {
              const crmData = await crmRes.json()
              crmContactId = crmData.contact?.id || null

              // Update submission with CRM contact ID
              await admin.from('form_submissions').update({ crm_contact_id: crmContactId, status: 'synced' }).eq('id', submissionId)
            } else {
              console.error(`[Form Submit] CRM contact creation failed: ${crmRes.status}`)
            }
          }
        }
      } catch (err) {
        console.error('[Form Submit] CRM error:', err)
      }
    }

    // 4. Increment form submission count
    try {
      await admin.from('forms').update({ submission_count: ((form as Record<string, number>).submission_count || 0) + 1 }).eq('id', formId)
    } catch {}


    console.log(`[Form Submit] ${formId} | ${Object.keys(fields).join(',')} | CRM: ${crmContactId || 'skipped'}`)

    return NextResponse.json({
      success: true,
      submissionId,
      crmContactId,
    }, { headers: corsHeaders() })
  } catch (error) {
    console.error('[Form Submit] Error:', error)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500, headers: corsHeaders() })
  }
}
