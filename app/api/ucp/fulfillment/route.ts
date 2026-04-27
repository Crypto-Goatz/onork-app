import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'

interface FulfillmentResult {
  status: 'fulfilled' | 'queued' | 'manual_review'
  deliverable: Record<string, unknown>
}

async function fulfillHipaaScan(order: Record<string, unknown>): Promise<FulfillmentResult> {
  const meta = (order.metadata as Record<string, unknown>) || {}
  const target = (meta.target_url as string) || (meta.website as string) || ''
  return {
    status: 'queued',
    deliverable: {
      type: 'hipaa_scan',
      target_url: target,
      scan_url: `${SITE_URL}/dashboard/hipaa?order=${order.id}`,
      message: 'HIPAA scan queued. Report ready in 5-10 minutes.',
    },
  }
}

async function fulfillCro9Audit(order: Record<string, unknown>): Promise<FulfillmentResult> {
  const meta = (order.metadata as Record<string, unknown>) || {}
  const target = (meta.target_url as string) || (meta.website as string) || ''
  return {
    status: 'queued',
    deliverable: {
      type: 'cro9_audit',
      target_url: target,
      audit_url: `${SITE_URL}/dashboard/cro9?order=${order.id}`,
      message: 'CRO9 audit queued. Full report ready in 15-20 minutes.',
    },
  }
}

async function fulfillBlogPost(order: Record<string, unknown>): Promise<FulfillmentResult> {
  const meta = (order.metadata as Record<string, unknown>) || {}
  return {
    status: 'queued',
    deliverable: {
      type: 'blog_post',
      topic: meta.topic || 'Auto-generated topic',
      post_url: `${SITE_URL}/dashboard/blog?order=${order.id}`,
      message: 'Blog post generation queued. Draft ready in 5 minutes.',
    },
  }
}

async function fulfillCrmSetup(order: Record<string, unknown>): Promise<FulfillmentResult> {
  return {
    status: 'manual_review',
    deliverable: {
      type: 'crm_setup',
      next_step_url: `${SITE_URL}/dashboard/onboarding?order=${order.id}`,
      message: 'CRM setup scheduled. We will reach out within 24 hours to begin onboarding.',
    },
  }
}

async function fulfillWordpressManagement(order: Record<string, unknown>): Promise<FulfillmentResult> {
  return {
    status: 'fulfilled',
    deliverable: {
      type: 'wordpress_management',
      dashboard_url: `${SITE_URL}/dashboard/wordpress?order=${order.id}`,
      message: 'WordPress management activated. Connect your site in the dashboard.',
    },
  }
}

async function fulfillCustomAutomation(order: Record<string, unknown>): Promise<FulfillmentResult> {
  return {
    status: 'manual_review',
    deliverable: {
      type: 'custom_automation',
      brief_url: `${SITE_URL}/dashboard/automations/new?order=${order.id}`,
      message: 'Custom automation order received. Fill out the brief to kick off the build.',
    },
  }
}

async function fulfillOnApp(order: Record<string, unknown>, supabase: ReturnType<typeof getSupabase>): Promise<FulfillmentResult> {
  const meta = (order.metadata as Record<string, unknown>) || {}
  const appId = meta.app_id as string | undefined
  const userId = order.buyer_user_id as string | undefined

  if (!appId || !userId) {
    return {
      status: 'manual_review',
      deliverable: {
        type: '0n_app',
        message: 'App or user reference missing. Manual provisioning required.',
      },
    }
  }

  const { data: app } = await supabase
    .from('marketplace_apps')
    .select('id, name, slug, app_config')
    .eq('id', appId)
    .single()

  if (!app) {
    return {
      status: 'manual_review',
      deliverable: { type: '0n_app', message: 'App not found.' },
    }
  }

  const { error: installErr } = await supabase
    .from('user_installed_apps')
    .upsert(
      { user_id: userId, app_id: appId, order_id: order.id, status: 'active' },
      { onConflict: 'user_id,app_id' },
    )

  if (installErr) {
    return {
      status: 'manual_review',
      deliverable: { type: '0n_app', message: `Install failed: ${installErr.message}` },
    }
  }

  await supabase.rpc('increment_app_installs', { app_id_param: appId }).then(() => {}, () => {})

  return {
    status: 'fulfilled',
    deliverable: {
      type: '0n_app',
      app_id: appId,
      app_slug: app.slug,
      app_name: app.name,
      dashboard_url: `${SITE_URL}/dashboard/marketplace/my-apps`,
      message: `${app.name} installed.`,
    },
  }
}

async function fulfillMarketplaceApp(order: Record<string, unknown>, supabase: ReturnType<typeof getSupabase>): Promise<FulfillmentResult> {
  return fulfillOnApp(order, supabase)
}

async function fulfillManual(order: Record<string, unknown>): Promise<FulfillmentResult> {
  return {
    status: 'manual_review',
    deliverable: {
      type: 'manual',
      message: 'Order received. Our team will follow up shortly.',
      support_url: `${SITE_URL}/dashboard/support?order=${order.id}`,
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const orderId = body.order_id
    const sessionId = body.stripe_session_id

    if (!orderId && !sessionId) {
      return NextResponse.json({ error: 'order_id or stripe_session_id required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const orderQuery = supabase
      .from('ucp_orders')
      .select('*, ucp_products!inner(id, slug, name, fulfillment_type, app_config)')
    const { data: order, error } = orderId
      ? await orderQuery.eq('id', orderId).single()
      : await orderQuery.eq('stripe_session_id', sessionId).single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'fulfilled') {
      return NextResponse.json({
        already_fulfilled: true,
        order_id: order.id,
        deliverable: order.deliverable,
      })
    }

    if (order.status === 'pending') {
      return NextResponse.json({
        error: 'Order not yet paid',
        order_status: order.status,
      }, { status: 400 })
    }

    const product = order.ucp_products
    const fulfillmentType = product?.fulfillment_type || 'manual'

    let result: FulfillmentResult
    switch (fulfillmentType) {
      case 'hipaa_scan': result = await fulfillHipaaScan(order); break
      case 'cro9_audit': result = await fulfillCro9Audit(order); break
      case 'blog_post': result = await fulfillBlogPost(order); break
      case 'crm_setup': result = await fulfillCrmSetup(order); break
      case 'wordpress_management': result = await fulfillWordpressManagement(order); break
      case 'custom_automation': result = await fulfillCustomAutomation(order); break
      case '0n_app': result = await fulfillOnApp(order, supabase); break
      case 'marketplace_app': result = await fulfillMarketplaceApp(order, supabase); break
      default: result = await fulfillManual(order)
    }

    const newStatus = result.status === 'fulfilled' ? 'fulfilled' : 'paid'
    await supabase
      .from('ucp_orders')
      .update({
        status: newStatus,
        deliverable: result.deliverable,
        fulfilled_at: result.status === 'fulfilled' ? new Date().toISOString() : null,
      })
      .eq('id', order.id)

    if (result.status === 'fulfilled' && product?.id) {
      await supabase.rpc('increment_product_sales', { product_id_param: product.id, amount_param: order.amount_cents }).then(() => {}, () => {})
    }

    return NextResponse.json({
      order_id: order.id,
      status: result.status,
      fulfillment_type: fulfillmentType,
      deliverable: result.deliverable,
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fulfillment error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
