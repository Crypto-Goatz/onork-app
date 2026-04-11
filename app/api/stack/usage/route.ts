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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id }
}

// ---------------------------------------------------------------------------
// GET /api/stack/usage — Current month usage
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const auth = await resolveUser(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = adminClient()
  const periodStart = new Date().toISOString().slice(0, 7) + '-01' // YYYY-MM-01

  const { data: usage } = await db
    .from('stack_usage')
    .select('contacts_used, contacts_limit, tier, period_start')
    .eq('onmcp_user_id', auth.userId)
    .eq('period_start', periodStart)
    .single()

  // Get total jobs and contacts enriched all-time
  const { count: totalJobs } = await db
    .from('stack_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('onmcp_user_id', auth.userId)

  const { count: totalContacts } = await db
    .from('stack_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('onmcp_user_id', auth.userId)
    .eq('status', 'done')

  const tierLimits: Record<string, number> = {
    free: 100,
    starter: 1000,
    pro: 10000,
    enterprise: 100000,
  }

  const tier = usage?.tier || 'free'
  const contactsUsed = usage?.contacts_used || 0
  const contactsLimit = usage?.contacts_limit || tierLimits[tier] || 100

  return NextResponse.json({
    period: periodStart,
    tier,
    contactsUsed,
    contactsLimit,
    contactsRemaining: Math.max(0, contactsLimit - contactsUsed),
    percentUsed: contactsLimit > 0 ? Math.round((contactsUsed / contactsLimit) * 100) : 0,
    allTime: {
      totalJobs: totalJobs || 0,
      totalContactsEnriched: totalContacts || 0,
    },
  })
}
