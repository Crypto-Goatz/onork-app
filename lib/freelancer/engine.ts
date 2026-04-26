// lib/freelancer/engine.ts
// Core fulfillment orchestrator for freelancer gigs.
// Uses Groq for AI parsing (NOT Anthropic).
// Pushes every buyer into CRM pipeline as a qualified opportunity.

import { createClient } from '@supabase/supabase-js'
import { getTemplate } from './templates'
import type { GigId, OrderContext, FulfillmentBundle } from './types'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Parse buyer brief into structured JSON via Groq ──
const SCHEMAS: Partial<Record<GigId, string>> = {
  'claude-mcp-setup': `{
  "buyer_name": "string",
  "buyer_email": "string",
  "selected_apps": ["gmail", "slack", "notion", ...],
  "operating_system": "macos | windows",
  "notes": "any constraints"
}`,
  'ai-agent-build': `{
  "agent_purpose": "what the agent should do",
  "apps_to_connect": ["string"],
  "trigger": "what kicks off the agent",
  "delivery_format": "string",
  "buyer_name": "string",
  "buyer_email": "string"
}`,
  'crm-ai-funnel': `{
  "business_type": "string",
  "target_audience": "string",
  "funnel_goal": "string",
  "lead_magnet": "string",
  "email_sequence_count": 5,
  "buyer_name": "string",
  "buyer_email": "string"
}`,
  'saas-landing': `{
  "product_name": "string",
  "tagline": "string",
  "target_audience": "string",
  "key_features": ["string"],
  "pricing_tiers": [{"name":"","price":"","features":[]}],
  "color_scheme": "string",
  "buyer_name": "string",
  "buyer_email": "string"
}`,
  'linkedin-content': `{
  "industry": "string",
  "target_audience": "string",
  "content_pillars": ["string"],
  "posting_frequency": "string",
  "tone": "string",
  "buyer_name": "string",
  "buyer_email": "string",
  "linkedin_url": "string"
}`,
}

async function parseBrief(gigId: GigId, rawBrief: string): Promise<Record<string, unknown>> {
  const systemPrompt = `You are an order-parsing assistant for a freelancer.
Extract structured requirements from the buyer's brief. Output ONLY valid JSON.
No prose, no markdown, no code fences. Just the JSON object.

Schema for gig "${gigId}":
${SCHEMAS[gigId] || '{ "notes": "<free text summary>" }'}

If the buyer didn't specify a field, omit it. Don't fabricate values.`

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawBrief },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    if (!res.ok) {
      console.error('[freelancer] Groq parse failed:', res.status)
      return { notes: rawBrief }
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim() || ''
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { notes: rawBrief }
  }
}

// ── Push buyer into CRM pipeline ──
async function pushToCRM(args: {
  bundle: FulfillmentBundle
  buyerName?: string
  buyerEmail?: string
  gigId: GigId
  orderId: string
  monetaryValue?: number
}): Promise<{ contactId?: string; opportunityId?: string }> {
  const CRM_BASE = 'https://services.leadconnectorhq.com'
  const PIT = process.env.CRM_PIT_RAW || process.env.CRM_PIT_ROCKETOPP
  const LOCATION = process.env.CRM_LOCATION_ID || 'nphConTwfHcVE1oA0uep'
  const PIPELINE = process.env.CRM_PIPELINE_ID || 'SYeVtvnuMIUhn3LtS23q'
  const STAGE_NEW = process.env.CRM_STAGE_FREE || '9fe04f16-4fce-4eea-84a7-6ee58083091e'

  if (!PIT) {
    console.warn('[freelancer] No CRM PIT token — skipping CRM push')
    return {}
  }

  const headers = {
    Authorization: `Bearer ${PIT}`,
    'Content-Type': 'application/json',
    Version: '2021-07-28',
  }

  try {
    // Create contact
    const contactRes = await fetch(`${CRM_BASE}/contacts/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        locationId: LOCATION,
        firstName: args.buyerName?.split(' ')[0] || 'Fiverr',
        lastName: args.buyerName?.split(' ').slice(1).join(' ') || 'Buyer',
        email: args.buyerEmail || undefined,
        source: 'Fiverr',
        tags: args.bundle.crmTags,
      }),
    })

    const contactData = await contactRes.json()
    const contactId = contactData?.contact?.id

    if (!contactId) {
      console.warn('[freelancer] CRM contact creation returned no ID')
      return {}
    }

    // Create opportunity
    const oppRes = await fetch(`${CRM_BASE}/opportunities/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        locationId: LOCATION,
        pipelineId: PIPELINE,
        pipelineStageId: STAGE_NEW,
        name: `Fiverr: ${args.gigId} — ${args.orderId.slice(0, 8)}`,
        contactId,
        monetaryValue: args.monetaryValue || 0,
        status: 'open',
      }),
    })

    const oppData = await oppRes.json()

    return {
      contactId,
      opportunityId: oppData?.opportunity?.id || oppData?.id,
    }
  } catch (err) {
    console.error('[freelancer] CRM push error:', err)
    return {}
  }
}

// ── End-to-end order processing ──
export async function processOrder(orderId: string): Promise<{
  bundle: FulfillmentBundle
  contactId?: string
  opportunityId?: string
}> {
  const supabase = getSupabase()

  const { data: order, error } = await supabase
    .from('freelancer_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error(`Order ${orderId} not found`)

  // Mark as parsing
  await supabase.from('freelancer_orders').update({ status: 'parsing' }).eq('id', orderId)

  // Parse brief
  const parsed = await parseBrief(order.gig_id as GigId, order.buyer_brief_raw)

  await supabase
    .from('freelancer_orders')
    .update({ parsed_requirements: parsed, status: 'fulfilling' })
    .eq('id', orderId)

  // Run template
  const tpl = getTemplate(order.gig_id as GigId)
  if (!tpl) throw new Error(`No template for gig "${order.gig_id}"`)

  const ctx: OrderContext = {
    orderId: order.id,
    userId: order.user_id,
    gigId: order.gig_id as GigId,
    rawBrief: order.buyer_brief_raw,
    parsed,
  }

  const bundle = await tpl.fulfill(ctx)

  // Save delivery
  await supabase.from('freelancer_deliveries').insert({
    order_id: orderId,
    files: bundle.files.map(f => ({ path: f.path, size: f.content.length })),
    loom_script: bundle.loomScript,
    delivery_message: bundle.deliveryMessage,
    upsell_hint: bundle.upsellHint || null,
    fulfillment_seconds: 0,
  })

  // Push to CRM (best-effort)
  const crmResult = await pushToCRM({
    bundle,
    buyerName: (parsed as { buyer_name?: string }).buyer_name,
    buyerEmail: (parsed as { buyer_email?: string }).buyer_email,
    gigId: order.gig_id as GigId,
    orderId: order.id,
    monetaryValue: 0,
  })

  // Update order with CRM refs
  await supabase
    .from('freelancer_orders')
    .update({
      status: 'ready',
      fulfilled_at: new Date().toISOString(),
      crm_contact_id: crmResult.contactId || null,
      crm_opportunity_id: crmResult.opportunityId || null,
    })
    .eq('id', orderId)

  return {
    bundle,
    contactId: crmResult.contactId,
    opportunityId: crmResult.opportunityId,
  }
}

// ── Get bundle for a ready order ──
export async function getOrderBundle(orderId: string): Promise<FulfillmentBundle | null> {
  const supabase = getSupabase()

  const { data: order } = await supabase
    .from('freelancer_orders')
    .select('gig_id, parsed_requirements, buyer_brief_raw, user_id')
    .eq('id', orderId)
    .single()

  if (!order) return null

  const { data: delivery } = await supabase
    .from('freelancer_deliveries')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (!delivery) return null

  return {
    files: (delivery.files as Array<{ path: string; size: number }>).map(f => ({
      path: f.path,
      content: '', // files stored by reference, full content regenerated on download
    })),
    loomScript: delivery.loom_script || '',
    deliveryMessage: delivery.delivery_message || '',
    crmTags: [],
    upsellHint: delivery.upsell_hint || undefined,
  }
}
