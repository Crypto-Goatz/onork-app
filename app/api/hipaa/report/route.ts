/**
 * HIPAA 2026 Readiness Assessment — Report API
 * GET ?assessmentId= — returns stored assessment result
 * PRIVATE: admin only
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(req: NextRequest) {
  const assessmentId = req.nextUrl.searchParams.get('assessmentId')
  if (!assessmentId) {
    return NextResponse.json({ error: 'assessmentId is required' }, { status: 400 })
  }

  // Auth
  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdmin()
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('hipaa_assessments')
    .select('*')
    .eq('id', assessmentId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  return NextResponse.json({ assessment: data })
}
