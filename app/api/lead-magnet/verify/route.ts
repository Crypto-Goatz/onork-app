/**
 * GET /api/lead-magnet/verify?sub=<subscriber_id>
 *
 * The link target inside the verification email. Marks the subscriber as
 * verified, fires the ebook delivery email, then redirects to the thank-you
 * page where the recommendations modal opens.
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

export async function GET(req: NextRequest) {
  const subscriberId = req.nextUrl.searchParams.get('sub')
  if (!subscriberId) {
    return new NextResponse('Invalid link.', { status: 400 })
  }

  const sb = admin()

  const { data: subscriber } = await sb
    .from('lead_subscribers')
    .select('id, email, name, funnel_id, status, crm_contact_id')
    .eq('id', subscriberId)
    .maybeSingle()

  if (!subscriber) {
    return new NextResponse('Subscriber not found.', { status: 404 })
  }

  // Mark verified (idempotent; already-verified is fine)
  await sb
    .from('lead_subscribers')
    .update({ status: 'verified', verified_at: new Date().toISOString() })
    .eq('id', subscriberId)
    .neq('status', 'verified')

  // Fetch funnel for delivery email
  const { data: funnel } = await sb
    .from('funnel_config')
    .select('user_id, offer_title, offer_file_url, from_name, from_email, post_subscribe_redirect')
    .eq('funnel_id', subscriber.funnel_id)
    .maybeSingle()

  if (funnel?.user_id && subscriber.crm_contact_id && funnel.offer_file_url) {
    // Resolve owner's CRM location for sending the delivery email
    const { data: ownerProfile } = await sb
      .from('profiles')
      .select('crm_location_id')
      .eq('id', funnel.user_id)
      .maybeSingle()
    const ownerLocationId = ownerProfile?.crm_location_id

    if (ownerLocationId) {
      void (async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
          const thankYouUrl = `${baseUrl}/lead/${subscriber.funnel_id}/thank-you?sub=${subscriber.id}`

          await crmPost('/conversations/messages', ownerLocationId, {
            type: 'Email',
            contactId: subscriber.crm_contact_id,
            subject: `Here's your free ${funnel.offer_title}`,
            html: `<p>Hi${subscriber.name ? ' ' + subscriber.name.split(' ')[0] : ''},</p>
<p>Here's your free guide — download it below.</p>
<p><a href="${funnel.offer_file_url}" style="background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Download Now →</a></p>
<p style="margin-top:24px;font-size:14px;color:#666">While you're here — I put together a short list of resources worth checking out.</p>
<p><a href="${thankYouUrl}" style="color:#111;font-weight:600">See my recommendations →</a></p>`,
            from: funnel.from_name ?? 'Mike @ RocketOpp',
            fromEmail: funnel.from_email ?? 'mike@rocketopp.com',
          })

          await sb
            .from('lead_subscribers')
            .update({ status: 'delivered', delivered_at: new Date().toISOString() })
            .eq('id', subscriberId)
        } catch (err) {
          console.error('[lead-magnet/verify] delivery failed:', err)
        }
      })()
    }
  }

  // Redirect to the thank-you page with the modal
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
  const redirect = `${baseUrl}/lead/${subscriber.funnel_id}/thank-you?sub=${subscriber.id}`
  return NextResponse.redirect(redirect, 302)
}
