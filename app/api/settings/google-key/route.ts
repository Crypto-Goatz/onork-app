import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_sa_key')
    .eq('id', user.id)
    .single()

  const key = profile?.google_sa_key
  if (key && typeof key === 'object' && 'client_email' in key) {
    return NextResponse.json({ connected: true, email: (key as Record<string, string>).client_email })
  }

  return NextResponse.json({ connected: false })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { key } = body

    if (!key || typeof key !== 'object') {
      return NextResponse.json({ error: 'Invalid key format' }, { status: 400 })
    }

    // Validate required fields
    const required = ['client_email', 'private_key', 'project_id']
    for (const field of required) {
      if (!key[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Validate it looks like a real SA key
    if (!key.client_email.includes('@') || !key.private_key.includes('BEGIN')) {
      return NextResponse.json({ error: 'Key does not appear to be a valid Google service account key' }, { status: 400 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ google_sa_key: key })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, email: key.client_email })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Save failed' }, { status: 500 })
  }
}
