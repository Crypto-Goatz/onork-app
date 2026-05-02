/**
 * POST /api/automations/<id>/toggle
 *
 * Flips a workflow between 'active' and 'paused'. When going active, also
 * registers the CRM webhook trigger if not already present. When going
 * paused, the webhook is left in place (CRM events still fire but the
 * /api/webhooks/automation/<id> handler short-circuits if status='paused').
 *
 * Auth: requires Supabase session, and the workflow must belong to the
 * caller.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

const TRIGGER_TO_CRM_EVENT: Record<string, string[]> = {
  trigger_new_lead: ['ContactCreate'],
  trigger_form_submit: ['FormSubmission'],
  trigger_appointment_booked: ['AppointmentCreate'],
  trigger_payment_received: ['InvoicePaymentReceived'],
  trigger_tag_added: ['ContactTagUpdate'],
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdmin()
  const { data: wf, error } = await admin
    .from('user_workflows')
    .select('id, user_id, status, trigger_type, location_id, webhook_id')
    .eq('id', id)
    .single()
  if (error || !wf) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (wf.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const wantState = wf.status === 'active' ? 'paused' : 'active'

  // If activating and no webhook is registered yet, register one.
  let webhookId = wf.webhook_id
  if (wantState === 'active' && !webhookId) {
    const events = TRIGGER_TO_CRM_EVENT[wf.trigger_type as string]
    if (events && events.length > 0) {
      const pit = process.env.CRM_PIT_AGENCY || process.env.CRM_PIT || ''
      if (pit) {
        try {
          const res = await fetch(`${CRM_API}/hooks/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${pit}`,
              'Content-Type': 'application/json',
              Version: CRM_VERSION,
            },
            body: JSON.stringify({
              url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://0ncore.com'}/api/webhooks/automation/${id}`,
              events,
              locationId: wf.location_id,
              name: `0nCore Automation: ${id.slice(0, 8)}`,
            }),
          })
          const data = await res.json()
          webhookId = data.webhook?.id || data.id || null
        } catch {
          // continue — workflow toggles even if webhook register fails
        }
      }
    }
  }

  const { error: upErr } = await admin
    .from('user_workflows')
    .update({ status: wantState, webhook_id: webhookId })
    .eq('id', id)
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    workflow_id: id,
    status: wantState,
    webhook_registered: !!webhookId,
  })
}
