import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Fetch User Info endpoint for CRM External Auth
 * CRM calls this after OAuth to get the authenticated user's details.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // In production, validate the access token
  // For now, return the authenticated user's info
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null

  return NextResponse.json({
    id: user?.id || 'oncore-user',
    email: user?.email || 'user@0ncore.com',
    name: user?.user_metadata?.full_name || user?.user_metadata?.business_name || '0nCore User',
    avatar: null,
  })
}
