import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readMemberSession, EDITABLE_FIELDS } from '@/lib/member/token'
import { crmGet, crmPut } from '@/lib/crm'
import { fireTrigger } from '@/lib/crm/triggers'

/**
 * The member's own record. GET reads it, PUT changes it.
 *
 * THE CONTACT ID COMES FROM THE SIGNED SESSION, NEVER THE REQUEST. That single
 * rule is what makes this safe: there is no parameter a caller can set to
 * address someone else's profile, so the usual failure of a portal — walk the
 * ids, read the members — has nowhere to happen.
 *
 * WRITES ARE ALLOWLISTED. Only the fields in EDITABLE_FIELDS reach the CRM, so
 * a crafted body cannot set tags, owner, pipeline stage or anything else the
 * agency uses to decide what this person is entitled to.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS' }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

const session = (req: NextRequest) =>
  readMemberSession(req.headers.get('x-member-session') || req.nextUrl.searchParams.get('s'))

export async function GET(req: NextRequest) {
  const m = session(req)
  if (!m) return NextResponse.json({ ok: false, error: 'Please open your portal link again.' }, { status: 401, headers: CORS })

  const res = await crmGet(`/contacts/${m.contactId}`, m.locationId)
  if (!res.ok) return NextResponse.json({ ok: false, error: 'Could not load your details.' }, { status: 502, headers: CORS })
  const j = (await res.json().catch(() => ({}))) as { contact?: Record<string, unknown> }
  const c = j.contact ?? {}

  // Only what the member should see about themselves. Returning the whole
  // record would hand over internal tags, scores and owner notes.
  const profile: Record<string, string> = {}
  for (const f of EDITABLE_FIELDS) profile[f] = (c[f] as string) ?? ''

  return NextResponse.json({
    ok: true,
    profile,
    name: [(c.firstName as string) ?? '', (c.lastName as string) ?? ''].join(' ').trim() || 'there',
    fields: EDITABLE_FIELDS,
  }, { headers: CORS })
}

export async function PUT(req: NextRequest) {
  const m = session(req)
  if (!m) return NextResponse.json({ ok: false, error: 'Please open your portal link again.' }, { status: 401, headers: CORS })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const patch: Record<string, string> = {}
  for (const f of EDITABLE_FIELDS) {
    const v = body[f]
    if (typeof v === 'string') patch[f] = v.trim().slice(0, 200)
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: 'Nothing to save.' }, { status: 400, headers: CORS })
  }

  const res = await crmPut(`/contacts/${m.contactId}`, m.locationId, patch)
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    console.error(`[member/profile] update ${res.status}: ${t.slice(0, 180)}`)
    return NextResponse.json({ ok: false, error: 'Could not save your changes.' }, { status: 502, headers: CORS })
  }

  // Let the agency's own automation react — a profile change is exactly the
  // kind of event they want to follow up on.
  void fireTrigger({
    trigger: 'oncore_member_updated',
    locationId: m.locationId,
    contactId: m.contactId,
    data: { fields: Object.keys(patch).join(',') },
  })

  // Recorded so the agency can see the portal is being used, and so a support
  // question has an answer.
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    await sb.from('widget_leads').insert({
      location_id: m.locationId, widget_key: 'oncore_member_edit',
      payload: { contactId: m.contactId, changed: Object.keys(patch) },
      crm_contact_id: m.contactId, status: 'delivered',
    })
  } catch { /* a missing log line must never fail the member's save */ }

  return NextResponse.json({ ok: true }, { headers: CORS })
}
