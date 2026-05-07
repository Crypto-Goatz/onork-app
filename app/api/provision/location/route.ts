/**
 * POST /api/provision/location — Auto-provision CRM sub-location for current user.
 * Called when onboarding completes.
 * Idempotent — won't create a second location if one exists.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { provisionSubLocation } from '@/lib/provision'

export async function POST() {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await provisionSubLocation(user.id)

  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
