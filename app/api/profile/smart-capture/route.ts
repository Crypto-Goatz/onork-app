import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Whitelist of fields that can be updated via smart capture
const ALLOWED_FIELDS = [
  'phone', 'email', 'website', 'company_name',
  'stripe_key', 'stripe_pub_key', 'anthropic_key', 'openai_key',
  'groq_key', 'slack_token', 'github_token', 'crm_pit',
  'webhook_secret', 'supabase_key', 'pricing',
]

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { field, value } = body

    if (!field || !value) {
      return NextResponse.json({ error: 'field and value are required' }, { status: 400 })
    }

    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json({ error: `Field "${field}" is not allowed` }, { status: 400 })
    }

    // Check current value — only update if empty
    const { data: profile } = await supabase
      .from('profiles')
      .select(field)
      .eq('id', user.id)
      .single()

    const currentValue = profile?.[field]
    if (currentValue && currentValue !== '' && currentValue !== null) {
      return NextResponse.json({ error: 'Field already has a value. Use settings to update.', skipped: true }, { status: 409 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, field, saved: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Save failed' }, { status: 500 })
  }
}
