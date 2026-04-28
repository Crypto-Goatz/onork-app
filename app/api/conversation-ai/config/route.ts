/**
 * /api/conversation-ai/config — read + update Jaxx config for the user's location.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function resolveContext(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .maybeSingle()

  const locationId = req.nextUrl.searchParams.get('locationId') || profile?.crm_location_id || null
  if (!locationId) return null

  return { user, locationId }
}

export async function GET(req: NextRequest) {
  const ctx = await resolveContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized or no location' }, { status: 401 })

  const { data } = await admin()
    .from('conversation_ai_config')
    .select('*')
    .eq('location_id', ctx.locationId)
    .maybeSingle()

  if (!data) {
    // Return defaults (knowledge-only, automation off)
    return NextResponse.json({
      locationId: ctx.locationId,
      enabled: true,
      allowed_actions: ['knowledge'],
      bot_name: 'Jaxx',
      bot_variant: 'command',
      bot_tone: 'casual',
      automation_can_generate: false,
      automation_can_test: false,
      automation_can_activate: false,
      automation_can_run: false,
      commerce_can_browse: false,
      commerce_can_checkout: false,
      commerce_can_download: false,
      auto_execute: false,
      business_hours_only: false,
      business_hours_start: '08:00',
      business_hours_end: '20:00',
      excluded_tags: [],
      max_actions_per_conversation: 10,
      daily_message_cap: 500,
      per_contact_hourly_cap: 30,
      system_prompt_override: null,
    })
  }

  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const ctx = await resolveContext(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized or no location' }, { status: 401 })

  const body = await req.json()

  const allowedFields = new Set([
    'enabled',
    'allowed_actions',
    'bot_name',
    'bot_variant',
    'bot_tone',
    'automation_can_generate',
    'automation_can_test',
    'automation_can_activate',
    'automation_can_run',
    'commerce_can_browse',
    'commerce_can_checkout',
    'commerce_can_download',
    'auto_execute',
    'business_hours_only',
    'business_hours_start',
    'business_hours_end',
    'excluded_tags',
    'max_actions_per_conversation',
    'daily_message_cap',
    'per_contact_hourly_cap',
    'system_prompt_override',
  ])

  const update: Record<string, unknown> = { user_id: ctx.user.id, location_id: ctx.locationId }
  for (const k of Object.keys(body)) {
    if (allowedFields.has(k)) update[k] = body[k]
  }
  update.updated_at = new Date().toISOString()

  const { data, error } = await admin()
    .from('conversation_ai_config')
    .upsert(update, { onConflict: 'location_id' })
    .select()
    .single()

  if (error) {
    console.error('[conversation-ai/config] upsert failed:', error)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }

  return NextResponse.json(data)
}
