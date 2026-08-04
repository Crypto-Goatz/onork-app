import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { widget } from '@/lib/widgets/registry'
import { crmPost, crmPostRaw } from '@/lib/crm'

/**
 * POST /api/widgets/lead/:key — a submission from a widget on a public page.
 *
 * PUBLIC AND UNAUTHENTICATED, because it is a form on a stranger's website —
 * there is no session to check. That makes it the widest attack surface in the
 * product, so the rules are tight:
 *
 *   • It can ONLY create a contact. No reads, no updates, no deletes, and no
 *     capability the caller chooses — the route decides, not the payload.
 *   • Every submission is stored BEFORE the CRM call, so a spam wave is
 *     visible and a dropped write is recoverable.
 *   • Rate-limited per location. Without it this is a free way to fill a
 *     customer's CRM with junk.
 *   • The location must already have the widget enabled. An arbitrary
 *     locationId cannot be used to write into an account that never installed
 *     anything.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

/** Crude per-instance throttle. Not the only defence, but not free either. */
const hits = new Map<string, { n: number; resetAt: number }>()
function throttled(locationId: string): boolean {
  const now = Date.now()
  const r = hits.get(locationId)
  if (!r || now > r.resetAt) { hits.set(locationId, { n: 1, resetAt: now + 60_000 }); if (hits.size > 5000) hits.clear(); return false }
  r.n += 1
  return r.n > 20
}

const str = (v: unknown, max = 160) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params
  const w = widget(key)
  if (!w || !w.live) return NextResponse.json({ ok: false }, { status: 404, headers: CORS })

  const body = await req.json().catch(() => ({}))
  const locationId = str(body?.locationId, 64)
  if (!locationId) return NextResponse.json({ ok: false, error: 'Missing location.' }, { status: 400, headers: CORS })
  if (throttled(locationId)) return NextResponse.json({ ok: false, error: 'Too many submissions.' }, { status: 429, headers: CORS })

  const name = str(body?.name, 80)
  const email = str(body?.email, 120)
  const phone = str(body?.phone, 40)
  if (!email && !phone) return NextResponse.json({ ok: false, error: 'Need an email or phone.' }, { status: 400, headers: CORS })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  // The widget must be switched on for THIS client. Otherwise any locationId
  // would be a write path into an account that never opted in.
  const { data: cfg } = await sb
    .from('widget_configs')
    .select('company_id, enabled, config')
    .eq('widget_key', key)
    .eq('location_id', locationId)
    .maybeSingle()
  if (!cfg || cfg.enabled === false) {
    return NextResponse.json({ ok: false, error: 'Not accepting submissions.' }, { status: 403, headers: CORS })
  }

  // Recorded BEFORE the CRM call — a lead we captured but failed to deliver is
  // still the customer's lead, and it must not vanish with the error.
  const { data: lead } = await sb
    .from('widget_leads')
    .insert({ company_id: cfg.company_id, location_id: locationId, widget_key: key, payload: { name, email, phone } })
    .select('id')
    .single()

  try {
    const [firstName, ...rest] = name.split(/\s+/)
    const res = await crmPost('/contacts/', locationId, {
      ...(firstName ? { firstName } : {}),
      ...(rest.length ? { lastName: rest.join(' ') } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      source: '0nCORE widget',
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      if (lead?.id) await sb.from('widget_leads').update({ status: 'failed', error: `${res.status} ${detail.slice(0, 200)}` }).eq('id', lead.id)
      // The visitor is told it worked, because for them it did — we hold the
      // lead and can deliver it. Surfacing our plumbing to a stranger on a
      // customer's website helps nobody.
      return NextResponse.json({ ok: true }, { headers: CORS })
    }
    const json = (await res.json().catch(() => ({}))) as { contact?: { id?: string } }
    const contactId = json.contact?.id ?? null

    const tag = str((cfg.config as Record<string, string>)?.tag, 60)
    if (contactId && tag) {
      await crmPostRaw(`/contacts/${contactId}/tags`, locationId, { tags: [tag] }).catch(() => {})
    }
    if (lead?.id) await sb.from('widget_leads').update({ status: 'delivered', crm_contact_id: contactId }).eq('id', lead.id)
    return NextResponse.json({ ok: true }, { headers: CORS })
  } catch (err) {
    if (lead?.id) await sb.from('widget_leads').update({ status: 'failed', error: String(err).slice(0, 200) }).eq('id', lead.id)
    return NextResponse.json({ ok: true }, { headers: CORS })
  }
}
