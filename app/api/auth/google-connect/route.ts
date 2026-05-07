import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceAuthUrl } from '@/lib/google/workspace'

// GET /api/auth/google-connect — Start OAuth flow
export async function GET() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString('base64url')
  const url = getWorkspaceAuthUrl(state)

  return NextResponse.json({ url })
}
