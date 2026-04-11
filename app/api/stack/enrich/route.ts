import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { parseContact } from '@/lib/0nstack/domain-parser'
import { detectDomain } from '@/lib/0nstack/detection-engine'
import { classifySegment } from '@/lib/0nstack/segment-classifier'
import { checkCache, writeCache } from '@/lib/0nstack/cache'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ---------------------------------------------------------------------------
// Supabase admin client (bypass RLS for API key lookups + usage tracking)
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// Auth: Bearer API key (sk_*) or Supabase session
// ---------------------------------------------------------------------------

async function resolveUser(req: Request): Promise<{ userId: string; tier: string } | null> {
  const authHeader = req.headers.get('authorization') || ''

  // API key auth
  if (authHeader.startsWith('Bearer sk_')) {
    const rawKey = authHeader.slice(7) // "Bearer " = 7 chars
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey))
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const db = adminClient()
    const { data: keyRow } = await db
      .from('stack_api_keys')
      .select('onmcp_user_id, tier, active')
      .eq('key_hash', keyHash)
      .single()

    if (!keyRow || !keyRow.active) return null

    // Bump usage counters
    await db.from('stack_api_keys')
      .update({
        calls_today: ((keyRow as Record<string, number>).calls_today || 0) + 1,
        calls_total: ((keyRow as Record<string, number>).calls_total || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('key_hash', keyHash)

    return { userId: keyRow.onmcp_user_id, tier: keyRow.tier || 'free' }
  }

  // Session auth
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id, tier: 'free' }
}

// ---------------------------------------------------------------------------
// POST /api/stack/enrich
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const auth = await resolveUser(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Normalize to array
  const contacts: Record<string, string>[] = Array.isArray(body)
    ? body.slice(0, 100) // cap at 100
    : [body as Record<string, string>]

  if (contacts.length === 0) {
    return NextResponse.json({ error: 'No contacts provided' }, { status: 400 })
  }

  const db = adminClient()
  const results: Record<string, unknown>[] = []

  for (const raw of contacts) {
    const email = raw.email || raw.Email || raw.EMAIL || ''
    const domainOverride = raw.domain || raw.Domain || raw.website || ''

    // Parse contact
    const parsed = parseContact(email || `user@${domainOverride}`)
    const domain = domainOverride
      ? domainOverride.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase()
      : parsed.domain

    if (!domain || parsed.isFreeMail) {
      results.push({
        email,
        domain: domain || null,
        skipped: true,
        skipReason: parsed.isFreeMail ? 'freemail' : 'no_domain',
        segment: null,
        detection: null,
      })
      continue
    }

    // Check cache first
    let detection = await checkCache(domain)
    let fromCache = !!detection

    // Detect if not cached
    if (!detection) {
      detection = await detectDomain(domain)
      if (detection.status === 'success') {
        await writeCache(domain, detection)
      }
    }

    // Classify segment
    const segment = classifySegment(detection)

    // Pick top tool per category
    const topTool = (category: string) =>
      detection?.tools
        .filter((t) => t.category === category)
        .sort((a, b) => b.confidence - a.confidence)[0]?.name || null

    // Write to stack_contacts
    await db.from('stack_contacts').insert({
      onmcp_user_id: auth.userId,
      raw_data: raw,
      original_email: email,
      original_domain: parsed.domain,
      resolved_domain: domain,
      domain_source: domainOverride ? 'explicit' : 'email',
      is_valid: true,
      detected_crm: topTool('crm'),
      detected_automation: topTool('automation'),
      detected_email_esp: topTool('email'),
      detected_reviews: topTool('reviews'),
      detected_chat: topTool('chat'),
      detected_scheduling: topTool('scheduling'),
      detected_payments: topTool('payments'),
      detected_analytics: topTool('analytics'),
      detected_ads: topTool('ads'),
      detection_confidence: Math.max(...(detection?.tools.map((t) => t.confidence) || [0])),
      all_tools: detection?.tools || [],
      detection_signals: { hasCRM: detection?.hasCRM, hasAutomation: detection?.hasAutomation, hasReviews: detection?.hasReviews, hasChat: detection?.hasChat, hasScheduling: detection?.hasScheduling, hasEmail: detection?.hasEmail, hasPayments: detection?.hasPayments, hasAnalytics: detection?.hasAnalytics, hasAds: detection?.hasAds },
      segment: segment.segment,
      opportunity_type: segment.suggestedAction,
      opportunity_score: segment.score,
      status: 'done',
      detected_at: new Date().toISOString(),
    })

    // Update usage — upsert then increment
    const periodStart = new Date().toISOString().slice(0, 7) + '-01' // YYYY-MM-01
    const { data: existingUsage } = await db
      .from('stack_usage')
      .select('contacts_used')
      .eq('onmcp_user_id', auth.userId)
      .eq('period_start', periodStart)
      .single()

    if (existingUsage) {
      await db.from('stack_usage')
        .update({ contacts_used: (existingUsage.contacts_used || 0) + 1 })
        .eq('onmcp_user_id', auth.userId)
        .eq('period_start', periodStart)
    } else {
      await db.from('stack_usage').insert({
        onmcp_user_id: auth.userId,
        period_start: periodStart,
        contacts_used: 1,
        tier: auth.tier,
      })
    }

    results.push({
      email,
      domain,
      fromCache,
      segment: segment.segment,
      segmentLabel: segment.label,
      score: segment.score,
      suggestedAction: segment.suggestedAction,
      detected: {
        crm: topTool('crm'),
        automation: topTool('automation'),
        email: topTool('email'),
        reviews: topTool('reviews'),
        chat: topTool('chat'),
        scheduling: topTool('scheduling'),
        payments: topTool('payments'),
        analytics: topTool('analytics'),
        ads: topTool('ads'),
      },
      confidence: Math.max(...(detection?.tools.map((t) => t.confidence) || [0])),
      toolCount: detection?.tools.length || 0,
    })
  }

  return NextResponse.json({
    enriched: results.length,
    results,
  })
}
