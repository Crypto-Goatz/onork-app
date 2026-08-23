/**
 * GET /api/connections/groq/status
 *
 * Returns the user's Groq key state: whether they have their own key, or
 * are running on the platform key with a monthly quota. Shape feeds the
 * site-wide GroqBanner + the Groq panel on the vault door (/vault).
 */
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getGroqKeyStatus } from '@/lib/groq/router'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return NextResponse.json(
      { authenticated: false, hasOwnKey: false, source: 'platform', exhausted: false },
      { status: 200 },
    )
  }
  const status = await getGroqKeyStatus(user.id)
  return NextResponse.json({ authenticated: true, ...status })
}
