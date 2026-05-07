/**
 * POST /api/onboarding/crm/test-sync
 *
 * 2-way sync proof of life. Creates a test contact in the user's CRM
 * sub-location, tags it `0n-onboarding-test`, then immediately reads it
 * back. If both writes succeed, the user's CRM is fully connected
 * (write + read).
 *
 * The test contact is harmless: dedicated email, dedicated tag, retained
 * as evidence. Idempotent — calling twice updates the same contact instead
 * of creating duplicates (CRM rejects with 422 → we PUT the existing one).
 */
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthForLocation } from '@/lib/crm'
import { ensureLocationInstall } from '@/lib/crm/location-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = admin()
  const { data: profile } = await sb
    .from('profiles')
    .select('crm_location_id, full_name, email')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || ''
  if (!locationId) {
    return NextResponse.json(
      { ok: false, error: 'No CRM sub-location linked to this profile.' },
      { status: 400 },
    )
  }

  // Auto-mint a fresh location-scoped token before doing the test-sync.
  // This is what guarantees "if no PIT exists, generate and assign" — the
  // marketplace agency app mints a fully-scoped token on demand.
  const minted = await ensureLocationInstall(locationId)
  const auth = await getAuthForLocation(locationId)

  if (!auth.token) {
    return NextResponse.json(
      {
        ok: false,
        error:
          minted.error ||
          `No token for ${locationId}. The agency marketplace app may need to be reinstalled at /api/oauth/install.`,
        mint: minted,
      },
      { status: 500 },
    )
  }

  const headers = {
    Authorization: `Bearer ${auth.token}`,
    Version: CRM_VERSION,
    'Content-Type': 'application/json',
  }
  const testEmail = `0n-onboarding-test+${user.id.slice(0, 8)}@onork.io`
  const tagName = '0n-onboarding-test'

  // 1. WRITE — create the test contact
  let writeResult: { ok: boolean; contactId?: string; status?: number; raw?: string } = { ok: false }
  try {
    const res = await fetch(`${CRM_API}/contacts/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        locationId,
        email: testEmail,
        firstName: '0n',
        lastName: 'Onboarding Test',
        source: '0nCore Onboarding',
        tags: [tagName],
        customFields: [
          { key: 'oncore_user_id', value: user.id },
          { key: 'oncore_signed_in_email', value: profile?.email || user.email || '' },
        ],
      }),
    })
    if (res.ok) {
      const data = await res.json()
      writeResult = { ok: true, contactId: data.contact?.id ?? data.id, status: 201 }
    } else if (res.status === 422) {
      // Already exists — search + PUT-update, treat as success
      const searchRes = await fetch(
        `${CRM_API}/contacts/search?locationId=${locationId}&query=${encodeURIComponent(testEmail)}`,
        { headers: { Authorization: `Bearer ${auth.token}`, Version: CRM_VERSION } },
      )
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        const existing = searchData.contacts?.[0]
        if (existing?.id) {
          const putRes = await fetch(`${CRM_API}/contacts/${existing.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ tags: Array.from(new Set([...(existing.tags || []), tagName])) }),
          })
          writeResult = { ok: putRes.ok, contactId: existing.id, status: putRes.status }
        }
      }
    } else {
      const text = await res.text()
      writeResult = { ok: false, status: res.status, raw: text.slice(0, 220) }
    }
  } catch (err) {
    writeResult = {
      ok: false,
      raw: err instanceof Error ? err.message : 'unknown write error',
    }
  }

  if (!writeResult.ok) {
    return NextResponse.json(
      { ok: false, stage: 'write_failed', writeResult },
      { status: 502 },
    )
  }

  // 2. READ — fetch the contact we just wrote, prove it's there
  let readResult: { ok: boolean; tags?: string[]; raw?: string } = { ok: false }
  try {
    const res = await fetch(`${CRM_API}/contacts/${writeResult.contactId}`, {
      headers: { Authorization: `Bearer ${auth.token}`, Version: CRM_VERSION },
    })
    if (res.ok) {
      const data = await res.json()
      const tags: string[] = data.contact?.tags || data.tags || []
      readResult = { ok: tags.includes(tagName), tags }
    } else {
      const text = await res.text()
      readResult = { ok: false, raw: text.slice(0, 220) }
    }
  } catch (err) {
    readResult = { ok: false, raw: err instanceof Error ? err.message : 'unknown read error' }
  }

  // 3. Mark onboarding step in profile (informational)
  await sb
    .from('profiles')
    .update({ onboarding_step: 4 })
    .eq('id', user.id)

  return NextResponse.json({
    ok: writeResult.ok && readResult.ok,
    locationId,
    contactId: writeResult.contactId,
    testEmail,
    write: writeResult,
    read: readResult,
    message:
      writeResult.ok && readResult.ok
        ? 'Two-way sync verified. Writes are landing in the CRM and we can read them back.'
        : writeResult.ok
          ? 'Write succeeded but readback could not confirm the tag. Check PIT scopes.'
          : 'Write failed — see error above.',
  })
}
