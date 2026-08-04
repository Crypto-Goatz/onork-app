import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TRIGGERS, type TriggerKey } from '@/lib/crm/triggers'

/**
 * POST /api/crm/trigger/:triggerKey/subscribe
 *
 * The platform calls this when someone adds our trigger to a workflow, and
 * hands us the URL to call when the event happens. That is the real mechanism —
 * better than the inbound-webhook bridge it replaces, because the agency does
 * not have to copy a URL anywhere: dropping the trigger into a workflow wires
 * it.
 *
 * DELETE unsubscribes. A workflow that is deleted or has the trigger removed
 * must stop being called, and marking it inactive rather than deleting the row
 * keeps the history of what was once wired.
 *
 * IDEMPOTENT. Re-subscribing updates the target URL instead of inserting a
 * duplicate — two rows for one workflow would fire it twice per event, which
 * looks exactly like a bug in the agency's automation and would be blamed there.
 *
 * PAYLOAD SHAPE IS DEFENSIVE. The exact field names are only fully revealed by
 * a live subscribe call, so every known alias is accepted and whatever arrives
 * is kept in `meta`. Refusing a subscription because a field was named
 * differently would silently break the feature at the moment of adoption.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KEYS = new Set(TRIGGERS.map((t) => t.key as string))

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

const pick = (o: Record<string, unknown>, ...names: string[]): string => {
  for (const n of names) {
    const v = o[n]
    if (typeof v === 'string' && v) return v
  }
  return ''
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ triggerKey: string }> }) {
  const { triggerKey } = await ctx.params
  if (!KEYS.has(triggerKey)) {
    return NextResponse.json({ success: false, error: 'Unknown trigger.' }, { status: 404 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  const locationId = pick(body, 'locationId', 'location_id', 'locationID')
  const targetUrl = pick(body, 'targetUrl', 'target_url', 'webhookUrl', 'url', 'callbackUrl')
  const workflowId = pick(body, 'workflowId', 'workflow_id', 'id') || 'default'
  const companyId = pick(body, 'companyId', 'company_id')

  if (!locationId || !targetUrl) {
    console.error(`[trigger/subscribe] ${triggerKey} missing fields; body keys: ${Object.keys(body).join(',')}`)
    return NextResponse.json(
      { success: false, error: 'Missing location or target URL.' },
      { status: 400 },
    )
  }

  const { error } = await admin().from('trigger_subscriptions').upsert({
    trigger_key: triggerKey,
    location_id: locationId,
    company_id: companyId || null,
    workflow_id: workflowId,
    target_url: targetUrl,
    active: true,
    // Keep everything they sent. The next unfamiliar field is documentation.
    meta: body as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'trigger_key,location_id,workflow_id' })

  if (error) {
    console.error('[trigger/subscribe]', error)
    return NextResponse.json({ success: false, error: 'Could not save the subscription.' }, { status: 500 })
  }

  console.log(`[trigger/subscribe] ${triggerKey} <- ${locationId} (${workflowId})`)
  return NextResponse.json({ success: true })
}

/** Unsubscribe — the workflow no longer wants this trigger. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ triggerKey: string }> }) {
  const { triggerKey } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const locationId = pick(body, 'locationId', 'location_id')
  const workflowId = pick(body, 'workflowId', 'workflow_id', 'id') || 'default'
  if (!locationId) return NextResponse.json({ success: false }, { status: 400 })

  await admin().from('trigger_subscriptions')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('trigger_key', triggerKey)
    .eq('location_id', locationId)
    .eq('workflow_id', workflowId)

  return NextResponse.json({ success: true })
}
