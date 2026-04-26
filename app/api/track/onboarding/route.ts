import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const { step, metadata, user_id, session_id } = await req.json()
    if (!step) return NextResponse.json({ error: 'step required' }, { status: 400 })

    await supabase.from('onboarding_events').insert({
      step,
      user_id: user_id || null,
      session_id: session_id || null,
      metadata: metadata || null,
    })

    return NextResponse.json({ tracked: true })
  } catch {
    return NextResponse.json({ tracked: false })
  }
}
