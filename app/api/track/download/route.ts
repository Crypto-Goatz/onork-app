import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const { extension, step, source, user_id } = await req.json()
    if (!extension) return NextResponse.json({ error: 'extension required' }, { status: 400 })

    await supabase.from('download_events').insert({
      extension,
      step: step || 'download_start',
      source: source || null,
      user_id: user_id || null,
      metadata: { ua: req.headers.get('user-agent')?.slice(0, 200) },
    })

    return NextResponse.json({ tracked: true })
  } catch {
    return NextResponse.json({ tracked: false })
  }
}
