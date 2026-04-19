/**
 * 0nAI Engine Settings — GET/PUT user engine preferences.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const VALID_SECURITY_LEVELS = ['low', 'default', 'strict']
const VALID_PERSONAS = ['engine', 'writer', 'sales', 'social', 'support', 'custom']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdminClient()
  const { data } = await admin
    .from('engine_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  // Return defaults if no settings exist
  return NextResponse.json({
    security_level: data?.security_level || 'default',
    default_persona: data?.default_persona || 'engine',
    voice_enabled: data?.voice_enabled || false,
    auto_execute: data?.auto_execute || false,
  })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.security_level && VALID_SECURITY_LEVELS.includes(body.security_level)) {
    updates.security_level = body.security_level
  }
  if (body.default_persona && VALID_PERSONAS.includes(body.default_persona)) {
    updates.default_persona = body.default_persona
  }
  if (typeof body.voice_enabled === 'boolean') {
    updates.voice_enabled = body.voice_enabled
  }
  if (typeof body.auto_execute === 'boolean') {
    updates.auto_execute = body.auto_execute
  }

  const admin = getAdminClient()

  // Upsert
  const { error } = await admin
    .from('engine_settings')
    .upsert({
      user_id: user.id,
      ...updates,
    }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, ...updates })
}
