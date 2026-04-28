/**
 * POST /api/lead-magnet/modal-selections
 *
 * Records the recommendations the subscriber selected, applies CRM tags
 * per pick (best-effort), and returns the post-subscribe redirect URL
 * (typically builtwith.0nmcp.com — the viral loop closer).
 *
 * Body: { subscriber_id, selected_recommendation_ids: string[] }
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

interface SelectionsBody {
  subscriber_id: string
  selected_recommendation_ids?: string[]
}

export async function POST(req: NextRequest) {
  let body: SelectionsBody
  try {
    body = (await req.json()) as SelectionsBody
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.subscriber_id) {
    return NextResponse.json({ error: 'subscriber_id required' }, { status: 400 })
  }

  const sb = admin()

  // Mark the modal as viewed + subscribed
  await sb
    .from('lead_subscribers')
    .update({
      modal_viewed_at: new Date().toISOString(),
      modal_subscribed_at: new Date().toISOString(),
    })
    .eq('id', body.subscriber_id)

  const selected = body.selected_recommendation_ids ?? []

  if (selected.length > 0) {
    const rows = selected.map((rec_id) => ({
      subscriber_id: body.subscriber_id,
      recommendation_id: rec_id,
      selected: true,
    }))
    await sb
      .from('recommendation_selections')
      .upsert(rows, { onConflict: 'subscriber_id,recommendation_id' })

    // Apply CRM tags per pick (best-effort)
    void (async () => {
      try {
        const { data: subscriber } = await sb
          .from('lead_subscribers')
          .select('crm_contact_id, funnel_id')
          .eq('id', body.subscriber_id)
          .maybeSingle()
        if (!subscriber?.crm_contact_id) return

        const { data: funnel } = await sb
          .from('funnel_config')
          .select('user_id')
          .eq('funnel_id', subscriber.funnel_id)
          .maybeSingle()
        if (!funnel?.user_id) return

        const { data: ownerProfile } = await sb
          .from('profiles')
          .select('crm_location_id')
          .eq('id', funnel.user_id)
          .maybeSingle()
        const ownerLocationId = ownerProfile?.crm_location_id
        if (!ownerLocationId) return

        const { data: recs } = await sb
          .from('recommendations')
          .select('crm_tag')
          .in('id', selected)
        const tags = (recs ?? [])
          .map((r) => r.crm_tag as string | null)
          .filter((t): t is string => Boolean(t))
        if (tags.length === 0) return

        await crmPost(
          `/contacts/${subscriber.crm_contact_id}/tags`,
          ownerLocationId,
          { tags }
        )
      } catch (err) {
        console.error('[lead-magnet/modal-selections] tag apply failed:', err)
      }
    })()
  }

  // Resolve redirect URL from the funnel config
  const { data: subscriber } = await sb
    .from('lead_subscribers')
    .select('funnel_id')
    .eq('id', body.subscriber_id)
    .maybeSingle()

  const { data: cfg } = await sb
    .from('funnel_config')
    .select('post_subscribe_redirect')
    .eq('funnel_id', subscriber?.funnel_id ?? 'default')
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    redirect_url: cfg?.post_subscribe_redirect || 'https://builtwith.0nmcp.com',
  })
}
