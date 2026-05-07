import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ connected: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_tokens')
    .eq('id', user.id)
    .single()

  const tokens = profile?.google_tokens as Record<string, string> | null
  if (tokens?.access_token || tokens?.refresh_token) {
    return NextResponse.json({
      connected: true,
      email: tokens.email || tokens.connected_email || '',
      connectedAt: tokens.connected_at || null,
    })
  }

  return NextResponse.json({ connected: false })
}
