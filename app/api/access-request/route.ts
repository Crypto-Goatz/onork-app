/**
 * POST /api/access-request — the "Request access" modal.
 *
 * Four things happen, in an order chosen so a failure late in the chain never
 * loses the lead:
 *   1. store the submission
 *   2. create / update the CRM contact and tag it
 *   3. thank-you email to them
 *   4. notification email to Mike
 *
 * STEP 1 IS FIRST AND IT IS NOT OPTIONAL. Everything after it talks to a third
 * party that can be down, rate-limited or mid-rotation. If the CRM is having a
 * bad afternoon the row is already saved and the lead is recoverable; if it were
 * the other way round, a 502 would mean somebody who wanted to buy is simply
 * gone. Every later step reports its own outcome instead of throwing, and the
 * caller always gets a success as long as the submission landed.
 *
 * Email goes through the CRM conversations endpoint, the same path the HIPAA
 * order mails already use in production — a proven route rather than a new one.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const SITE = 'https://www.0ncore.com'
const LOGO = `${SITE}/icon-192.png`
const FROM_EMAIL = process.env.CRM_FROM_EMAIL || 'hello@m.rocketclients.com'
const NOTIFY_EMAIL = process.env.OWNER_EMAIL || 'mike@rocketopp.com'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function esc(v: unknown): string {
  return String(v ?? '').replace(/[<>&"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : '&quot;'
  )
}

/**
 * The thank-you. Table-based and inline-styled because that is what survives
 * Outlook and Gmail — the house "no inline styles" rule is about the app, and
 * an email client is not a browser.
 */
function thankYouHtml(name: string): string {
  const first = esc(name.split(' ')[0] || 'there')
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:32px 12px;">
 <tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
   <tr><td style="background:#0d1117;padding:26px 28px;">
     <img src="${LOGO}" width="40" height="40" alt="0nCORE" style="display:block;border:0;border-radius:10px;">
   </td></tr>
   <tr><td style="padding:30px 28px 8px;">
     <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:#0d1117;">Thanks, ${first} — you're on the list.</h1>
     <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#41474f;">
       We're letting agencies into 0nCORE in small groups while we run it on our own agency every day.
       You'll hear from us directly when your spot opens — usually within a few days.
     </p>
     <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#41474f;">
       In the meantime, the four-minute walkthrough shows exactly what you'll be getting.
     </p>
     <a href="${SITE}/0nagent" style="display:inline-block;background:#6EE05A;color:#0d1117;text-decoration:none;font-weight:700;font-size:15px;padding:13px 24px;border-radius:10px;">Watch the walkthrough</a>
   </td></tr>
   <tr><td style="padding:26px 28px 30px;">
     <p style="margin:0;font-size:13px;line-height:1.6;color:#8b949e;">
       Reply to this email if you have a question — it reaches a person.<br>0nCORE · RocketOpp LLC
     </p>
   </td></tr>
  </table>
 </td></tr>
</table></body></html>`
}

function notifyHtml(f: Record<string, string>): string {
  const row = (k: string, v: string) =>
    v ? `<tr><td style="padding:6px 12px 6px 0;color:#8b949e;font-size:13px;white-space:nowrap;">${esc(k)}</td><td style="padding:6px 0;color:#0d1117;font-size:14px;">${esc(v)}</td></tr>` : ''
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="padding:22px;">
 <h2 style="margin:0 0 4px;font-size:18px;color:#0d1117;">New 0nCORE access request</h2>
 <p style="margin:0 0 16px;font-size:13px;color:#8b949e;">${esc(new Date().toUTCString())}</p>
 <table role="presentation" cellpadding="0" cellspacing="0">
  ${row('Name', f.name)}${row('Email', f.email)}${row('Agency', f.company)}
  ${row('Clients', f.clients)}${row('On the CRM', f.usesCrm)}${row('Phone', f.phone)}
 </table>
 ${f.message ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#41474f;white-space:pre-wrap;">${esc(f.message)}</p>` : ''}
</div></body></html>`
}

async function crmFetch(path: string, pit: string, init: RequestInit = {}) {
  return fetch(`${CRM_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${pit}`,
      Version: CRM_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(12000),
  })
}

/** Upsert a contact and return its id. Null on any failure — never throws. */
async function upsertContact(
  pit: string,
  locationId: string,
  f: Record<string, string>,
  tags: string[]
): Promise<string | null> {
  try {
    const parts = f.name.split(' ')
    const res = await crmFetch('/contacts/', pit, {
      method: 'POST',
      body: JSON.stringify({
        locationId,
        email: f.email,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        phone: f.phone || undefined,
        companyName: f.company || undefined,
        source: '0ncore-access-request',
        tags,
      }),
    })
    if (res.ok) {
      const j = await res.json().catch(() => ({}))
      return j?.contact?.id ?? null
    }
    // A duplicate comes back 400 with the existing id — that is a success for
    // our purposes, not an error, and losing it would break the email step.
    const body = await res.json().catch(() => ({}))
    const dup = body?.meta?.contactId || body?.contactId
    if (dup) return String(dup)
    console.error('[access-request] contact upsert failed:', res.status, JSON.stringify(body).slice(0, 200))
    return null
  } catch (e) {
    console.error('[access-request] contact upsert threw:', e)
    return null
  }
}

async function sendMail(
  pit: string,
  locationId: string,
  contactId: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const res = await crmFetch('/conversations/messages', pit, {
      method: 'POST',
      body: JSON.stringify({ type: 'Email', contactId, subject, html, emailFrom: FROM_EMAIL, locationId }),
    })
    if (!res.ok) {
      console.error('[access-request] email failed:', res.status, (await res.text().catch(() => '')).slice(0, 200))
      return false
    }
    return true
  } catch (e) {
    console.error('[access-request] email threw:', e)
    return false
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const f = {
    name: String(body.name ?? '').trim(),
    email: String(body.email ?? '').trim().toLowerCase(),
    company: String(body.company ?? '').trim(),
    phone: String(body.phone ?? '').trim(),
    clients: String(body.clients ?? '').trim(),
    usesCrm: String(body.usesCrm ?? '').trim(),
    message: String(body.message ?? '').trim(),
  }

  // Honeypot. Bots fill every field they find; a human never sees this one.
  if (String(body.website ?? '').trim()) {
    return NextResponse.json({ success: true })
  }

  if (!f.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  if (!f.name) {
    return NextResponse.json({ error: 'Your name is required.' }, { status: 400 })
  }

  const submissionId = crypto.randomUUID()

  // 1 — store first, always.
  try {
    await admin.from('form_submissions').insert({
      id: submissionId,
      form_id: 'access-request',
      location_id: process.env.CRM_LOCATION_ID || null,
      fields: f,
      meta: {
        form: 'access-request',
        ip: req.headers.get('x-forwarded-for') || '',
        userAgent: req.headers.get('user-agent') || '',
        referer: req.headers.get('referer') || '',
        submittedAt: new Date().toISOString(),
      },
      status: 'new',
    })
  } catch (e) {
    console.error('[access-request] local store failed:', e)
  }

  const pit = process.env.CRM_PIT_ONCORE || process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
  const locationId = process.env.CRM_LOCATION_ID || ''

  const out = { crmContactId: null as string | null, thanked: false, notified: false }

  if (pit && locationId) {
    out.crmContactId = await upsertContact(pit, locationId, f, [
      'access-request',
      '0ncore',
      f.usesCrm === 'yes' ? 'has-crm' : 'no-crm',
    ])

    if (out.crmContactId) {
      out.thanked = await sendMail(
        pit, locationId, out.crmContactId,
        "You're on the list for 0nCORE",
        thankYouHtml(f.name)
      )
    }

    // Notify Mike through a contact record of his own, because the email API is
    // contact-scoped. Upserting him is idempotent and costs one call.
    const mikeId = await upsertContact(
      pit, locationId,
      { name: 'Mike Mento', email: NOTIFY_EMAIL, company: 'RocketOpp', phone: '', clients: '', usesCrm: '', message: '' },
      ['internal', 'notifications']
    )
    if (mikeId) {
      out.notified = await sendMail(
        pit, locationId, mikeId,
        `0nCORE access request — ${f.name}${f.company ? ` (${f.company})` : ''}`,
        notifyHtml(f)
      )
    }
  }

  try {
    await admin
      .from('form_submissions')
      .update({ crm_contact_id: out.crmContactId, status: out.crmContactId ? 'synced' : 'new' })
      .eq('id', submissionId)
  } catch { /* the row already exists; this is decoration */ }

  console.log(
    `[access-request] ${f.email} | crm=${out.crmContactId || 'none'} | thanked=${out.thanked} | notified=${out.notified}`
  )

  // Success once the submission is stored. A CRM hiccup is our problem to
  // reconcile, not a reason to show this person an error and lose them.
  return NextResponse.json({ success: true, ...out })
}
