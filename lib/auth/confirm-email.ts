/**
 * Email confirmation for 0nCore sign-up — sent THROUGH THE CRM.
 *
 * Mike, 2026-09-13: sign-up requires a confirmed address, and the email comes
 * from the CRM (the contact created at sign-up is the recipient), so the CRM
 * and the database stay in two-way sync: the contact exists before the first
 * email, and the click is written back to the contact as a tag.
 *
 * Supabase mints the one-shot link (admin.generateLink type=magiclink — a
 * magic-link verification confirms the address); Supabase's own mailer is
 * never used. Provisioning (the billed CRM sub-account) waits for the click:
 * see app/auth/callback/route.ts, token_hash branch.
 */
import { createClient } from '@supabase/supabase-js'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'
const PIT = process.env.CRM_PIT_RAW || ''
export const CONFIRMED_TAG = '0ncore-email-confirmed'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function crm(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: any }> {
  const r = await fetch(`${CRM_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${PIT}`, Version: CRM_VERSION, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data }
}

/** The link the email carries. Lands on /auth/callback, which verifies and provisions. */
export async function mintConfirmLink(email: string, origin: string, next = '/welcome'): Promise<string> {
  const { data, error } = await admin().auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: `${origin}/auth/callback` } })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) throw new Error(error?.message || 'could not mint the confirmation link')
  return `${origin}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent(next)}`
}

function confirmHtml(firstName: string, link: string): string {
  const hi = firstName ? `Hi ${firstName},` : 'Hi,'
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 0"><tr><td align="center">
<table role="presentation" width="520" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;padding:36px 40px">
<tr><td style="font-size:22px;font-weight:800;letter-spacing:-0.01em">Confirm your 0nCore email</td></tr>
<tr><td style="padding-top:14px;font-size:15px;line-height:1.6">${hi}<br><br>One click and your account is live. This link works once and expires in an hour.</td></tr>
<tr><td style="padding-top:22px"><a href="${link}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:10px">Confirm my email</a></td></tr>
<tr><td style="padding-top:22px;font-size:13px;line-height:1.6;color:#52525b">If the button does not work, paste this into your browser:<br><span style="word-break:break-all">${link}</span></td></tr>
<tr><td style="padding-top:22px;font-size:12px;color:#a1a1aa">You are getting this because someone signed up for 0nCore with this address. If it was not you, ignore it — nothing is created until the link is clicked.</td></tr>
</table></td></tr></table></body></html>`
}

/**
 * Send the confirmation through the CRM to the contact created at sign-up.
 * Throws with the CRM's own words on failure so the caller can say so.
 */
export async function sendConfirmEmail(args: { contactId: string; firstName: string; link: string }): Promise<void> {
  if (!PIT) throw new Error('CRM_PIT_RAW is not set — the confirmation email lane is down')
  const r = await crm('POST', '/conversations/messages', {
    type: 'Email',
    contactId: args.contactId,
    subject: 'Confirm your 0nCore email',
    html: confirmHtml(args.firstName, args.link),
    message: `Confirm your 0nCore email: ${args.link}`,
    // The same verified sender the HIPAA lane uses (lib/hipaa/email.ts); an
    // unverified From is silently dropped by the CRM.
    emailFrom: process.env.CONFIRM_EMAIL_FROM || process.env.CRM_FROM_EMAIL || 'hello@m.rocketclients.com',
  })
  if (!r.ok) throw new Error(r.data?.message || r.data?.error || `CRM ${r.status}`)
}

/** Write the click back to the contact — the CRM side of the two-way sync. */
export async function tagConfirmed(contactId: string): Promise<void> {
  if (!PIT || !contactId) return
  await crm('POST', `/contacts/${contactId}/tags`, { tags: [CONFIRMED_TAG] }).catch(() => undefined)
}
