/**
 * Form Builder API
 * POST /api/forms/create — create a new form
 * GET  /api/forms/create — list user's forms with submission counts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: forms, error } = await admin
    .from('forms')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ forms: forms || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's CRM location
  const { data: profile } = await admin.from('profiles').select('crm_location_id').eq('id', user.id).single()
  const locationId = profile?.crm_location_id || ''

  const body = await req.json()
  const { name, fields, settings } = body

  if (!name || !fields || !Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: 'name and fields[] required' }, { status: 400 })
  }

  const formId = crypto.randomUUID()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'

  const { data: form, error } = await admin.from('forms').insert({
    id: formId,
    user_id: user.id,
    location_id: locationId,
    name,
    fields,
    settings: settings || {},
    submission_count: 0,
    status: 'active',
    embed_url: `${baseUrl}/api/forms/${formId}/embed`,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate embed script
  const embedScript = `<script src="${baseUrl}/embed/form-widget.js" data-form-id="${formId}" async></script>`

  return NextResponse.json({
    form,
    embedScript,
    embedUrl: `${baseUrl}/api/forms/${formId}/embed`,
    submissionUrl: `${baseUrl}/api/forms/submit`,
  })
}
