/**
 * POST /api/lead-magnet/opt-in
 *
 * Records a new lead opt-in: writes lead_subscribers, creates a CRM contact
 * (best-effort), sends the verification email via the CRM Conversations API
 * (best-effort). Returns the subscriber id.
 *
 * Body: {
 *   email, name, funnel_id?, utm_source, utm_medium, utm_campaign,
 *   utm_content, linkedin_source
 * }
 *
 * Public — no auth required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crmPost } from '@/lib/crm'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface OptInBody {
  email: string
  name?: string
  funnel_id?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  linkedin_source?: string
}

export async function POST(req: NextRequest) {
  let body: OptInBody
  try {
    body = (await req.json()) as OptInBody
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: 'valid email required' }, { status: 400 })
  }

  const funnelId = body.funnel_id || 'default'
  const sb = admin()

  // Confirm the funnel exists
  const { data: funnel } = await sb
    .from('funnel_config')
    .select('user_id, funnel_name, from_name, from_email, offer_title')
    .eq('funnel_id', funnelId)
    .maybeSingle()
  if (!funnel) return NextResponse.json({ error: 'funnel not found' }, { status: 404 })

  // Resolve the funnel owner's CRM location (so we send the verification email
  // through their CRM, not ours)
  const { data: ownerProfile } = await sb
    .from('profiles')
    .select('crm_location_id')
    .eq('id', funnel.user_id)
    .maybeSingle()
  const ownerLocationId = ownerProfile?.crm_location_id ?? null

  // Upsert subscriber
  const { data: subscriber, error } = await sb
    .from('lead_subscribers')
    .upsert(
      {
        email: body.email.toLowerCase(),
        name: body.name ?? null,
        funnel_id: funnelId,
        utm_source: body.utm_source ?? null,
        utm_medium: body.utm_medium ?? null,
        utm_campaign: body.utm_campaign ?? null,
        utm_content: body.utm_content ?? null,
        linkedin_source: body.linkedin_source ?? null,
        status: 'pending',
      },
      { onConflict: 'email,funnel_id' }
    )
    .select('id')
    .single()

  if (error || !subscriber) {
    console.error('[lead-magnet/opt-in]', error)
    return NextResponse.json({ error: 'subscriber upsert failed' }, { status: 500 })
  }

  // Best-effort: create a CRM contact + send verification email
  if (ownerLocationId) {
    void (async () => {
      try {
        const contactRes = await crmPost('/contacts/', ownerLocationId, {
          firstName: (body.name ?? '').split(' ')[0] || undefined,
          lastName: (body.name ?? '').split(' ').slice(1).join(' ') || undefined,
          email: body.email.toLowerCase(),
          tags: ['linkedin-lead', funnelId, body.linkedin_source ?? 'unknown'].filter(Boolean),
          source: 'LinkedIn Lead Magnet',
          customFields: {
            utm_source: body.utm_source,
            utm_medium: body.utm_medium,
            utm_campaign: body.utm_campaign,
          },
        })
        type ContactResp = { contact?: { id?: string }; id?: string }
        const contactJson: ContactResp = await contactRes.json().catch(() => ({}))
        const crmContactId = contactJson.contact?.id ?? contactJson.id ?? null

        if (crmContactId) {
          await sb
            .from('lead_subscribers')
            .update({ crm_contact_id: crmContactId })
            .eq('id', subscriber.id)

          // Send verification email
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
          const verifyLink = `${baseUrl}/api/lead-magnet/verify?sub=${subscriber.id}`
          await crmPost('/conversations/messages', ownerLocationId, {
            type: 'Email',
            contactId: crmContactId,
            subject: `Click to confirm + get ${funnel.offer_title}`,
            html: `<p>Hi${body.name ? ' ' + body.name.split(' ')[0] : ''},</p>
<p>One click to confirm your email and get <strong>${funnel.offer_title}</strong>.</p>
<p><a href="${verifyLink}" style="background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Yes, send it →</a></p>
<p style="color:#666;font-size:13px;margin-top:24px">If the button doesn't work: ${verifyLink}</p>`,
            from: funnel.from_name ?? 'Mike @ RocketOpp',
            fromEmail: funnel.from_email ?? 'mike@rocketopp.com',
          })
        }
      } catch (err) {
        console.error('[lead-magnet/opt-in] CRM side failed:', err)
      }
    })()
  }

  return NextResponse.json({ ok: true, subscriber_id: subscriber.id, funnel_id: funnelId })
}
