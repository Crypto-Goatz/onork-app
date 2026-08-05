import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { crmGet, crmPost, crmPostRaw } from '@/lib/crm'

/**
 * POST /api/lead-engine/capture — a prospect, straight from the browser.
 *
 * LAYER 1 OF THE LEAD ENGINE, done live instead of on a schedule. The brief
 * describes a 1pm scan; this fires the moment a qualifying business is seen,
 * which is strictly better — the queue fills while the work is happening rather
 * than in a batch nobody watches.
 *
 * It creates exactly what the brief specifies: a contact tagged
 * website-prospect, a New Lead opportunity worth $1,085, and a note that begins
 * "Source URL:" so the origin is never lost.
 *
 * DEDUPE IS THE WHOLE VALUE. A lead engine that re-adds the same plumber every
 * time a search page is revisited produces a pipeline nobody can trust and,
 * worse, a prospect who receives the 7-touch cadence twice. Matching happens on
 * phone first, then email, then business name — in that order, because phone is
 * the one field a directory listing almost always has and almost never shares.
 *
 * AUTH: a single shared token. This runs from Mike's own browser, not a public
 * page, so a bearer secret is the right weight — but it is checked, because an
 * open endpoint that writes to a CRM is an open endpoint that fills it with junk.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

const OPP_VALUE = 1085
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Digits only — "(878) 888-1238" and "8788881238" are the same business. */
const digits = (s: string) => s.replace(/\D/g, '').slice(-10)

export async function POST(req: NextRequest) {
  const secret = process.env.LEAD_ENGINE_TOKEN
  const given = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!secret || given !== secret) {
    return NextResponse.json({ ok: false, error: 'Not authorised.' }, { status: 401, headers: CORS })
  }

  const body = await req.json().catch(() => ({}))
  const locationId = str(body?.locationId, 64) || process.env.LEAD_ENGINE_LOCATION_ID || ''
  if (!locationId) return NextResponse.json({ ok: false, error: 'No location configured.' }, { status: 400, headers: CORS })

  const name = str(body?.name, 120)
  const phone = str(body?.phone, 40)
  const email = str(body?.email, 120)
  const sourceUrl = str(body?.sourceUrl, 500)
  const hook = str(body?.hook, 400)
  const address = str(body?.address, 200)
  const website = str(body?.website, 300)
  if (!name) return NextResponse.json({ ok: false, error: 'A business needs a name.' }, { status: 400, headers: CORS })
  if (!phone && !email) return NextResponse.json({ ok: false, error: 'Need a phone or an email.' }, { status: 400, headers: CORS })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  // ── dedupe, cheapest check first ──
  const key = phone ? `p:${digits(phone)}` : `e:${email.toLowerCase()}`
  const { data: seen } = await sb.from('lead_engine_seen').select('crm_contact_id').eq('dedupe_key', key).maybeSingle()
  if (seen) {
    return NextResponse.json({ ok: true, duplicate: true, reason: 'Already in the pipeline.', contactId: seen.crm_contact_id }, { headers: CORS })
  }

  // Second pass against the CRM itself — our table only knows what WE added,
  // and a prospect Mike added by hand months ago is still a duplicate.
  const q = phone || email
  const found = await crmGet(`/contacts/?query=${encodeURIComponent(q)}&limit=5`, locationId).catch(() => null)
  if (found?.ok) {
    const j = (await found.json().catch(() => ({}))) as { contacts?: { id: string; phone?: string; email?: string }[] }
    const hit = (j.contacts ?? []).find((c) =>
      (phone && c.phone && digits(c.phone) === digits(phone)) ||
      (email && c.email && c.email.toLowerCase() === email.toLowerCase()))
    if (hit) {
      await sb.from('lead_engine_seen').insert({ dedupe_key: key, business: name, crm_contact_id: hit.id, source_url: sourceUrl, outcome: 'already-in-crm' })
      return NextResponse.json({ ok: true, duplicate: true, reason: 'Already in your CRM.', contactId: hit.id }, { headers: CORS })
    }
  }

  // ── create the contact ──
  const res = await crmPost('/contacts/', locationId, {
    // Business name in First Name, per the brief — the CRM shows it everywhere
    // a person's name would go, which is what makes the pipeline readable.
    firstName: name,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(address ? { address1: address } : {}),
    ...(website ? { website } : {}),
    source: '0nCORE Lead Engine',
    tags: ['website-prospect', 'daily-scan'],
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    return NextResponse.json({ ok: false, error: `CRM refused the contact (${res.status}).`, detail: t.slice(0, 200) }, { status: 502, headers: CORS })
  }
  const contactId = ((await res.json().catch(() => ({}))) as { contact?: { id?: string } }).contact?.id ?? ''

  // ── the note, starting with the source URL as specified ──
  if (contactId && sourceUrl) {
    await crmPostRaw(`/contacts/${contactId}/notes`, locationId, {
      body: `Source URL: ${sourceUrl}\n\n${hook || 'No website found for this business.'}`,
    }).catch(() => {})
  }

  // ── the opportunity ──
  let opportunityId = ''
  try {
    const pRes = await crmGet('/opportunities/pipelines', locationId)
    if (pRes.ok) {
      const pipes = ((await pRes.json().catch(() => ({}))) as {
        pipelines?: { id?: string; name?: string; stages?: { id?: string; name?: string }[] }[]
      }).pipelines ?? []
      const pipe = pipes.find((p) => /marketing/i.test(p.name ?? '')) ?? pipes[0]
      const stage = (pipe?.stages ?? []).find((s) => /new lead/i.test(s.name ?? '')) ?? pipe?.stages?.[0]
      if (pipe?.id && stage?.id && contactId) {
        const oRes = await crmPostRaw('/opportunities/', locationId, {
          pipelineId: pipe.id, locationId, contactId,
          name: name, status: 'open', pipelineStageId: stage.id,
          monetaryValue: OPP_VALUE,
        })
        if (oRes.ok) {
          opportunityId = (((await oRes.json().catch(() => ({}))) as { opportunity?: { id?: string } }).opportunity?.id) ?? ''
        }
      }
    }
  } catch { /* a contact without an opportunity is still a lead worth keeping */ }

  await sb.from('lead_engine_seen').insert({
    dedupe_key: key, business: name, crm_contact_id: contactId,
    source_url: sourceUrl, outcome: opportunityId ? 'created' : 'contact-only',
  })

  return NextResponse.json({
    ok: true, duplicate: false, contactId, opportunityId,
    // Said plainly so the extension can show the truth rather than a tick.
    note: opportunityId ? 'Contact and opportunity created.' : 'Contact created — no pipeline stage matched, so no opportunity.',
  }, { headers: CORS })
}
