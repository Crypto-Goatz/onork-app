/**
 * POST /api/social0n/score
 * Scores any text using the VPIS engine. Returns full breakdown.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scorePost } from '@/lib/social0n/vpis'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 })

  const score = scorePost(text)

  return NextResponse.json({
    score,
    wordCount: text.split(/\s+/).length,
    charCount: text.length,
  })
}
