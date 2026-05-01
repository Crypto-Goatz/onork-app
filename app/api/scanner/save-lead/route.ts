/**
 * POST /api/scanner/save-lead
 *
 * Real CRM upsert. Mirrors the working sxowebsite scan-lead pattern:
 *   1. Direct REST POST to /contacts/ with location-scoped PIT (via getPitForLocation)
 *   2. 422 / duplicate → search by email + PUT update with merged tags
 *   3. Patch stack_scans.saved_lead_contact_id with the real CRM id
 *
 * Email is collected client-side (extension prompts before invoking).
 * If omitted, falls back to a derived placeholder so the save still works
 * for one-click "save as lead" with no email — but that path produces
 * placeholder contacts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken } from '@/lib/0n-token'
import { getPitForLocation } from '@/lib/crm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CRM_BASE = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

interface ScanRow {
  id: string
  hostname: string
  url: string
  gaps: string[]
  stack_gap_score: number
  user_id: string
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const auth = req.headers.get('authorization') || ''
  const tokenMatch = auth.match(/^Bearer\s+(0n_\S+)/)
  const ctx = tokenMatch ? await validateToken(tokenMatch[1]) : null
  if (!ctx?.userId) {
    return NextResponse.json(
      { ok: false, error: 'auth required — extension must include Bearer 0n_ token' },
      { status: 401 },
    )
  }

  // 2. Body
  let body: { scanId?: string; location_id?: string; email?: string; phone?: string; name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }
  if (!body.scanId) {
    return NextResponse.json({ ok: false, error: 'scanId required' }, { status: 400 })
  }

  // 3. Load scan + ownership check
  const sb = admin()
  const { data: scan } = await sb
    .from('stack_scans')
    .select('id, hostname, url, gaps, stack_gap_score, user_id')
    .eq('id', body.scanId)
    .maybeSingle<ScanRow>()
  if (!scan) {
    return NextResponse.json({ ok: false, error: 'scan not found' }, { status: 404 })
  }
  if (scan.user_id !== ctx.userId) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  // 4. Resolve location: caller-provided > profile.crm_location_id
  let locationId = body.location_id || ''
  if (!locationId) {
    const { data: profile } = await sb
      .from('profiles')
      .select('crm_location_id')
      .eq('id', ctx.userId)
      .single()
    locationId = profile?.crm_location_id || ''
  }
  if (!locationId) {
    return NextResponse.json(
      { ok: false, error: 'no CRM location — connect a sub-account first' },
      { status: 400 },
    )
  }

  const pit = getPitForLocation(locationId)
  if (!pit) {
    return NextResponse.json(
      { ok: false, error: `no PIT configured for location ${locationId}` },
      { status: 500 },
    )
  }

  // 5. Build payload — derive email if not provided (placeholder path)
  const safeHost = (scan.hostname || 'unknown').replace(/[^a-z0-9.-]/gi, '')
  const email = body.email?.trim() || `lead+${safeHost}@onork.io`
  const tags = [
    'stack-scan',
    `gap-score-${Math.round(scan.stack_gap_score / 10) * 10}`,
    ...scan.gaps.map((g) => `gap:${g}`),
  ]
  const customFields = [
    { key: 'stack_gap_score', value: String(scan.stack_gap_score) },
    { key: 'scan_hostname', value: scan.hostname },
    { key: 'scan_id', value: scan.id },
    { key: 'last_on_action', value: 'stack-scan-saved' },
  ]
  const contactBody = {
    locationId,
    email,
    phone: body.phone || undefined,
    name: body.name || undefined,
    website: scan.url || `https://${scan.hostname}`,
    source: 'Stack Scan',
    tags,
    customFields,
  }

  const headers = {
    Authorization: `Bearer ${pit}`,
    Version: CRM_VERSION,
    'Content-Type': 'application/json',
  }

  // 6. Create contact
  let contactId: string | null = null
  let upsertPath: 'created' | 'updated' = 'created'
  let crmRawError: string | null = null

  try {
    const createRes = await fetch(`${CRM_BASE}/contacts/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(contactBody),
    })

    if (createRes.ok) {
      const data = await createRes.json()
      contactId = data.contact?.id ?? data.id ?? null
    } else {
      const errText = await createRes.text()
      crmRawError = `${createRes.status}: ${errText.slice(0, 300)}`
      // 422 / duplicate path → search + PUT update
      if (createRes.status === 422 || /duplicate/i.test(errText)) {
        const searchRes = await fetch(
          `${CRM_BASE}/contacts/search?locationId=${locationId}&query=${encodeURIComponent(email)}`,
          { headers },
        )
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          const existing = searchData.contacts?.[0]
          if (existing?.id) {
            const merged = Array.from(new Set([...(existing.tags || []), ...tags]))
            const putRes = await fetch(`${CRM_BASE}/contacts/${existing.id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({ tags: merged, customFields, source: 'Stack Scan' }),
            })
            if (putRes.ok) {
              contactId = existing.id
              upsertPath = 'updated'
              crmRawError = null
            }
          }
        }
      }
    }
  } catch (err) {
    crmRawError = err instanceof Error ? err.message : String(err)
  }

  if (!contactId) {
    return NextResponse.json(
      { ok: false, error: 'CRM contact creation failed', crmRawError },
      { status: 502 },
    )
  }

  // 7. Patch stack_scans with real CRM id
  await sb
    .from('stack_scans')
    .update({ saved_lead_contact_id: contactId })
    .eq('id', scan.id)

  return NextResponse.json({
    ok: true,
    contactId,
    scanId: scan.id,
    locationId,
    email,
    upsertPath,
    tags,
  })
}
