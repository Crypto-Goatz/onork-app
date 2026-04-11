import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { buildEnrichedCSV, type EnrichmentData } from '@/lib/0nstack/export-builder'
import type { DetectionResult } from '@/lib/0nstack/detection-engine'
import type { SegmentResult } from '@/lib/0nstack/segment-classifier'
import type { ParsedContact } from '@/lib/0nstack/domain-parser'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id }
}

// ---------------------------------------------------------------------------
// GET /api/stack/bulk/[jobId]/export — Download enriched CSV
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

  // Verify job ownership
  const { data: job } = await db
    .from('stack_jobs')
    .select('id, source_filename, onmcp_user_id')
    .eq('id', jobId)
    .eq('onmcp_user_id', auth.userId)
    .single()

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Fetch all done contacts for the job
  const { data: contacts, error: contactsError } = await db
    .from('stack_contacts')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  if (contactsError || !contacts || contacts.length === 0) {
    return NextResponse.json({ error: 'No contacts to export' }, { status: 404 })
  }

  // Collect all original CSV headers from raw_data
  const headerSet = new Set<string>()
  for (const c of contacts) {
    if (c.raw_data && typeof c.raw_data === 'object') {
      for (const key of Object.keys(c.raw_data)) {
        headerSet.add(key)
      }
    }
  }
  const originalHeaders = Array.from(headerSet)

  // Build EnrichmentData rows
  const enrichedRows: EnrichmentData[] = contacts.map((c) => {
    const rawData = (c.raw_data || {}) as Record<string, string>
    const allTools = (c.all_tools || []) as { category: string; name: string; confidence: number; evidence: string[] }[]
    const signals = (c.detection_signals || {}) as Record<string, boolean>

    const detection: DetectionResult | null = c.status === 'done' ? {
      domain: c.resolved_domain || '',
      scannedAt: c.detected_at || c.created_at,
      status: 'success',
      tools: allTools,
      hasCRM: signals.hasCRM ?? false,
      hasAutomation: signals.hasAutomation ?? false,
      hasReviews: signals.hasReviews ?? false,
      hasChat: signals.hasChat ?? false,
      hasScheduling: signals.hasScheduling ?? false,
      hasEmail: signals.hasEmail ?? false,
      hasPayments: signals.hasPayments ?? false,
      hasAnalytics: signals.hasAnalytics ?? false,
      hasAds: signals.hasAds ?? false,
    } : null

    const segment: SegmentResult | null = c.segment ? {
      segment: c.segment,
      label: c.segment.replace(/_/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase()),
      score: c.opportunity_score || 0,
      reason: '',
      suggestedAction: c.opportunity_type || '',
      detectedCRMs: allTools.filter((t: { category: string }) => t.category === 'crm').map((t: { name: string }) => t.name),
      detectedAutomation: allTools.filter((t: { category: string }) => t.category === 'automation').map((t: { name: string }) => t.name),
    } : null

    const contact: ParsedContact = {
      email: c.original_email || '',
      domain: c.resolved_domain || null,
      isFreeMail: c.skip_reason === 'freemail',
      localPart: (c.original_email || '').split('@')[0] || '',
      provider: null,
    }

    return { originalRow: rawData, contact, detection, segment }
  })

  const csv = buildEnrichedCSV(originalHeaders, enrichedRows)
  const filename = (job.source_filename || 'export').replace(/\.csv$/i, '') + '_0nstack.csv'

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
