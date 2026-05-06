/**
 * GET /api/sxo-aeo/markdown/[scanId] — download stored markdown.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scanId: string }> },
) {
  const { scanId } = await params
  const { data, error } = await admin
    .from('sxo_aeo_scans')
    .select('domain, markdown, created_at')
    .eq('id', scanId)
    .single()

  if (error || !data?.markdown) {
    return new Response('not found', { status: 404 })
  }

  const date = (data.created_at || new Date().toISOString()).slice(0, 10)
  const slug = String(data.domain || 'site').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const filename = `sxo-aeo-${slug}-${date}.md`

  return new Response(data.markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
