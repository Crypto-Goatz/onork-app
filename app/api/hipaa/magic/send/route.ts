/**
 * POST /api/hipaa/magic/send
 * Body: { email }
 * Sends a magic-link email via CRM /conversations/messages.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { crmPost } from '@/lib/crm'

const ROCKETOPP_LOCATION = '6MSqx0trfxgLxeHBJE1k'
const FROM_EMAIL = process.env.CRM_FROM_EMAIL || 'noreply@rocketopp.com'
const WEBHOOK_SECRET = process.env.HIPAA_WEBHOOK_SECRET || ''

export const runtime = 'nodejs'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const wh = req.headers.get('x-hipaa-webhook-secret') || ''
  if (!WEBHOOK_SECRET || wh !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const email = String(body?.email || '').toLowerCase().trim()
  const returnTo = String(body?.returnTo || 'https://rocketopp.com/dashboard/hipaa')
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'valid_email_required' }, { status: 400 })
  }

  const sb = admin()
  // Only issue magic-links to emails that have actually ordered something
  const { count } = await sb
    .from('hipaa_orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_email', email)
  if (!count) {
    // Silent success to avoid email enumeration
    return NextResponse.json({ ok: true, sent: false })
  }

  const token = randomBytes(32).toString('base64url')
  await sb.from('hipaa_magic_tokens').insert({ token, email })

  const link = `${returnTo}?magic=${encodeURIComponent(token)}`
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;"><tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr><td style="background:#0a0a0a;padding:18px 28px;">
      <div style="height:3px;background:linear-gradient(90deg,#ff6b35,#fb7185);border-radius:2px;margin-bottom:10px;"></div>
      <div style="color:#fff;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">RocketOpp · HIPAA Dashboard</div>
    </td></tr>
    <tr><td style="padding:28px 28px 8px 28px;">
      <div style="font-size:20px;font-weight:700;color:#0a0a0a;margin-bottom:8px;">Your sign-in link</div>
      <div style="font-size:14px;color:#4b5563;line-height:1.5;">Click the button below to access your reports. This link expires in 15 minutes.</div>
    </td></tr>
    <tr><td style="padding:16px 28px 28px 28px;">
      <a href="${link}" style="display:inline-block;background:#ff6b35;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:700;font-size:14px;">Open my dashboard &rarr;</a>
      <div style="font-size:11px;color:#9ca3af;margin-top:16px;word-break:break-all;">Or paste this URL: ${link}</div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`

  try {
    await crmPost('/conversations/messages', ROCKETOPP_LOCATION, {
      type: 'Email',
      emailTo: email,
      emailFrom: FROM_EMAIL,
      subject: 'Your RocketOpp HIPAA dashboard sign-in link',
      html,
    })
  } catch (e) {
    console.error('[HIPAA] magic-link email failed:', e)
    return NextResponse.json({ error: 'email_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sent: true })
}
