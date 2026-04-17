import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADDON_PRICES: Record<string, { name: string; cents: number; capabilities: string[] }> = {
  'ai-course-builder': { name: 'AI Course Builder', cents: 4900, capabilities: ['course_create', 'course_import', 'course_list', 'lesson_generate'] },
  'voice-ai-agent': { name: 'Voice AI Agent', cents: 9900, capabilities: ['voice_agent_create', 'voice_agent_configure', 'voice_action_create', 'voice_call_logs'] },
  'conversation-ai': { name: 'Conversation AI', cents: 4900, capabilities: ['convo_ai_configure', 'convo_ai_manage', 'convo_message_send'] },
  'social-planner': { name: 'Social Media Planner', cents: 2900, capabilities: ['social_post_create', 'social_post_schedule', 'social_account_list'] },
  'blog-engine': { name: 'Blog Engine', cents: 1900, capabilities: ['blog_post_create', 'blog_post_update', 'blog_list'] },
  'snapshot-manager': { name: 'Snapshot Manager', cents: 9900, capabilities: ['snapshot_create', 'snapshot_deploy', 'snapshot_list'] },
  'affiliate-manager': { name: 'Affiliate Manager', cents: 4900, capabilities: ['affiliate_create', 'affiliate_campaign', 'affiliate_commission'] },
  'invoice-automation': { name: 'Invoice Automation', cents: 2900, capabilities: ['invoice_create', 'invoice_send', 'invoice_schedule', 'estimate_create'] },
  'email-builder': { name: 'Email Builder', cents: 1900, capabilities: ['email_template_create', 'email_schedule', 'email_send'] },
  'knowledge-base': { name: 'Knowledge Base Manager', cents: 2900, capabilities: ['kb_create', 'kb_update', 'kb_source_add', 'kb_list'] },
  'workflow-reader': { name: 'Workflow Intelligence', cents: 1900, capabilities: ['workflow_list', 'workflow_read', 'workflow_export_0n'] },
  'agent-studio': { name: 'Agent Studio Pro', cents: 9900, capabilities: ['agent_create', 'agent_execute', 'agent_promote', 'agent_configure_kb', 'agent_configure_mcp'] },
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productSlug } = await req.json()
  const addon = ADDON_PRICES[productSlug]
  if (!addon) return NextResponse.json({ error: 'Unknown product' }, { status: 400 })

  const profile = await supabase.from('profiles').select('crm_location_id').eq('id', user.id).single()
  const locationId = profile.data?.crm_location_id || ''

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: addon.cents,
        product_data: { name: `0nCore Add-on: ${addon.name}` },
      },
      quantity: 1,
    }],
    metadata: {
      type: 'addon_purchase',
      product_slug: productSlug,
      product_name: addon.name,
      user_id: user.id,
      location_id: locationId,
      capabilities: JSON.stringify(addon.capabilities),
    },
    customer_email: user.email || undefined,
    success_url: `${origin}/dashboard/marketplace?success=${productSlug}`,
    cancel_url: `${origin}/dashboard/marketplace`,
  })

  return NextResponse.json({ url: session.url })
}
