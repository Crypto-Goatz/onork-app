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
// GET /api/stack/contacts — Paginated contacts with filters
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const auth = await resolveUser(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  const filter = searchParams.get('filter') // segment name or status
  const search = searchParams.get('search') // email/domain search
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

  const db = adminClient()

  // Build query
  let query = db
    .from('stack_contacts')
    .select('id, job_id, original_email, resolved_domain, domain_source, skip_reason, is_valid, detected_crm, detected_automation, detected_email_esp, detected_reviews, detected_chat, detected_scheduling, detected_payments, detected_analytics, detected_ads, detection_confidence, segment, opportunity_type, opportunity_score, status, created_at, detected_at', { count: 'exact' })
    .eq('onmcp_user_id', auth.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (jobId) {
    query = query.eq('job_id', jobId)
  }

  if (filter) {
    // Check if filter is a segment name or a status
    const statuses = ['pending', 'done', 'skipped', 'error']
    if (statuses.includes(filter)) {
      query = query.eq('status', filter)
    } else {
      query = query.eq('segment', filter)
    }
  }

  if (search) {
    query = query.or(`original_email.ilike.%${search}%,resolved_domain.ilike.%${search}%`)
  }

  const { data: contacts, error, count } = await query

  if (error) {
    return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({
    contacts: contacts || [],
    count: count || 0,
    offset,
    limit,
    hasMore: (count || 0) > offset + limit,
  })
}
