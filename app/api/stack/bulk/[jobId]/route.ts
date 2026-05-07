import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Supabase admin client
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function resolveUser(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get('authorization') || ''

  if (authHeader.startsWith('Bearer sk_')) {
    const rawKey = authHeader.slice(7)
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey))
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const db = adminClient()
    const { data: keyRow } = await db
      .from('stack_api_keys')
      .select('onmcp_user_id, active')
      .eq('key_hash', keyHash)
      .single()

    if (!keyRow || !keyRow.active) return null
    return { userId: keyRow.onmcp_user_id }
  }

  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return null
  return { userId: user.id }
}

// ---------------------------------------------------------------------------
// GET /api/stack/bulk/[jobId] — Job status + progress
// ---------------------------------------------------------------------------

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await resolveUser(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = await params
  const db = adminClient()

  // Fetch job
  const { data: job, error: jobError } = await db
    .from('stack_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('onmcp_user_id', auth.userId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Get segment breakdown
  const { data: segments } = await db
    .from('stack_contacts')
    .select('segment, status')
    .eq('job_id', jobId)

  const segmentBreakdown: Record<string, number> = {}
  let doneCount = 0
  let pendingCount = 0
  let errorCount = 0
  let skippedCount = 0

  for (const row of segments || []) {
    if (row.status === 'done') {
      doneCount++
      const seg = row.segment || 'unknown'
      segmentBreakdown[seg] = (segmentBreakdown[seg] || 0) + 1
    } else if (row.status === 'pending') {
      pendingCount++
    } else if (row.status === 'skipped') {
      skippedCount++
    } else if (row.status === 'error') {
      errorCount++
    }
  }

  const totalContacts = job.total_contacts || 0
  const processable = totalContacts - skippedCount
  const progress = processable > 0 ? Math.round((doneCount / processable) * 100) : 0

  return NextResponse.json({
    job: {
      id: job.id,
      status: job.status,
      jobType: job.job_type,
      sourceFilename: job.source_filename,
      totalContacts: totalContacts,
      processed: doneCount,
      skipped: skippedCount,
      failed: errorCount,
      pending: pendingCount,
      noCrmCount: job.no_crm_count,
      tier: job.tier,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      errorMessage: job.error_message,
    },
    progress,
    segmentBreakdown,
    exportUrl: doneCount > 0 ? `/api/stack/bulk/${jobId}/export` : null,
  })
}
