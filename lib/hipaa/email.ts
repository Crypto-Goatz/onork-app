/**
 * HIPAA order email helpers.
 *
 * All three emails go through the CRM conversations/messages endpoint.
 * Requires a real contactId — we upsert the customer in the CRM first so
 * every order creates (or attaches to) a contact record in the RocketOpp
 * location, then tag it for downstream segmentation.
 */

import { crmGet, crmPost } from '@/lib/crm'

const ROCKETOPP_LOCATION = '6MSqx0trfxgLxeHBJE1k'
const FROM_EMAIL = process.env.CRM_FROM_EMAIL || 'hello@m.rocketclients.com'
const MIKE_EMAIL = 'mike@rocketopp.com'

interface CrmContact {
  id: string
  email?: string
  firstName?: string
  lastName?: string
}

/**
 * Find or create a contact in the CRM by email. Returns the contactId so
 * we can post a message to the right conversation. Tags with "hipaa-order"
 * so Mike can segment downstream.
 */
export async function upsertHipaaContact(args: {
  email: string
  name?: string | null
  companyName?: string | null
  orderId?: string
  tier?: number
  sourceSite?: string | null
}): Promise<string | null> {
  const email = args.email.toLowerCase().trim()
  if (!email) return null

  // 1) Try to look up an existing contact by email
  try {
    const res = await crmGet(
      `/contacts/?query=${encodeURIComponent(email)}&limit=5`,
      ROCKETOPP_LOCATION,
    )
    if (res.ok) {
      const data = await res.json()
      const match = (data?.contacts || []).find(
        (c: CrmContact) => (c.email || '').toLowerCase() === email,
      )
      if (match?.id) {
        await tagContact(match.id, args)
        return match.id
      }
    }
  } catch (e) {
    console.warn('[HIPAA] contact lookup failed:', (e as Error).message)
  }

  // 2) Create a new contact
  const [firstName, ...rest] = (args.name || '').trim().split(/\s+/)
  const lastName = rest.join(' ') || undefined
  const tags = buildTags(args)

  try {
    const res = await crmPost('/contacts/', ROCKETOPP_LOCATION, {
      email,
      firstName: firstName || undefined,
      lastName,
      companyName: args.companyName || undefined,
      source: args.sourceSite || 'rocketopp-hipaa',
      tags,
    })
    if (res.ok) {
      const data = await res.json()
      return data?.contact?.id || data?.id || null
    }
    // CRM returns 422 when contact already exists; parse the existing id out.
    if (res.status === 400 || res.status === 422) {
      const body = await res.text()
      const match = body.match(/"id"\s*:\s*"([^"]+)"/)
      if (match) {
        await tagContact(match[1], args)
        return match[1]
      }
    } else {
      console.warn('[HIPAA] contact create failed:', res.status, (await res.text()).slice(0, 200))
    }
  } catch (e) {
    console.warn('[HIPAA] contact create exception:', (e as Error).message)
  }
  return null
}

function buildTags(args: { orderId?: string; tier?: number }): string[] {
  const tags = ['hipaa-order']
  if (args.tier) tags.push(`hipaa-tier-${args.tier}`)
  if (args.orderId) tags.push(`order-${args.orderId.slice(0, 8)}`)
  return tags
}

async function tagContact(contactId: string, args: { orderId?: string; tier?: number }) {
  try {
    await crmPost(`/contacts/${contactId}/tags`, ROCKETOPP_LOCATION, {
      tags: buildTags(args),
    })
  } catch { /* non-fatal */ }
}

/**
 * Send a message via CRM using a resolved contactId. Returns the HTTP
 * status so the caller can log + retry if needed.
 */
async function sendEmail(args: {
  contactId: string
  subject: string
  html: string
}): Promise<{ ok: boolean; status: number; body?: string }> {
  const res = await crmPost('/conversations/messages', ROCKETOPP_LOCATION, {
    type: 'Email',
    contactId: args.contactId,
    subject: args.subject,
    html: args.html,
    emailFrom: FROM_EMAIL,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.warn('[HIPAA] email send failed:', res.status, body.slice(0, 300))
    return { ok: false, status: res.status, body }
  }
  return { ok: true, status: res.status }
}

// ---------------------------------------------------------------------------
// Customer confirmation email — sent immediately after order creation.
// ---------------------------------------------------------------------------

interface CustomerEmailInput {
  contactId: string
  toName?: string | null
  companyName: string
  orderId: string
  pdfUrl: string
  currentGrade: string
  currentRuleScore: number
  criticalFindings: number
  highFindings: number
  creditHidden?: boolean
  tier: number
  tierName?: string
}

export async function sendCustomerConfirmation(input: CustomerEmailInput): Promise<void> {
  const subject = `Your HIPAA Readiness Report is on its way — ${input.companyName}`
  const credit = input.creditHidden ? '' : `
    <tr><td style="padding:24px 32px 8px 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#6b7280;text-align:center;">
      Powered by <a href="https://0ncore.com" style="color:#ff6b35;text-decoration:none;font-weight:600;">0nCore</a>
    </td></tr>`

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f3f4f6;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#0a0a0a;padding:18px 32px;">
          <div style="height:3px;background:linear-gradient(90deg,#ff6b35,#fb7185);border-radius:2px;margin-bottom:10px;"></div>
          <div style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">HIPAA Readiness Report${input.tierName ? ' · ' + escapeHtml(input.tierName) : ''}</div>
        </td></tr>
        <tr><td style="padding:28px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a;">
          <div style="font-size:22px;font-weight:700;line-height:1.2;margin-bottom:8px;">We have your order${input.toName ? ', ' + escapeHtml(input.toName) : ''}.</div>
          <div style="font-size:14px;color:#4b5563;line-height:1.55;">
            The full HIPAA readiness report for <strong>${escapeHtml(input.companyName)}</strong> is being generated right now.
            You&rsquo;ll get a second email with the link <strong>within the next 15 minutes</strong>.
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:8px 0;">
            <tr>
              <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px;width:50%;">
                <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Current score</div>
                <div style="font-size:22px;font-weight:800;color:#0a0a0a;margin-top:4px;">${input.currentRuleScore}<span style="color:#9ca3af;font-size:14px;"> / 100 · ${escapeHtml(input.currentGrade)}</span></div>
              </td>
              <td style="background:#fff1f2;border:1px solid #fecdd3;border-radius:6px;padding:14px;width:50%;">
                <div style="font-size:10px;color:#be123c;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Critical / High findings</div>
                <div style="font-size:22px;font-weight:800;color:#be123c;margin-top:4px;">${input.criticalFindings} <span style="color:#9f1239;font-size:14px;">critical</span> · ${input.highFindings} <span style="color:#9f1239;font-size:14px;">high</span></div>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 32px 4px 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;padding:14px;color:#78350f;font-size:13px;line-height:1.55;">
            <strong>Your initial findings PDF is linked below.</strong> It explains, in plain English, each top gap and why HIPAA would flag it. Use it to brief your team while you wait for the full report.
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px 24px 32px;text-align:center;">
          <a href="${input.pdfUrl}" style="display:inline-block;background:#ff6b35;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:700;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Download the initial findings PDF &rarr;</a>
        </td></tr>

        <tr><td style="padding:0 32px 28px 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4b5563;font-size:13px;line-height:1.6;">
          <strong style="color:#0a0a0a;">What&rsquo;s in the full report?</strong><br/>
          &bull; Every control we tested, with plain-English explanations<br/>
          &bull; Prioritised remediation plan with time + cost estimates<br/>
          &bull; ${input.tier >= 2 ? 'Production-grade developer fix steps with code' : 'Per-finding remediation guidance'}<br/>
          &bull; ${input.tier >= 3 ? '2026 NPRM delta — what&rsquo;s changing and when' : 'Attestation checklist with rule citations'}<br/>
          ${input.tier >= 4 ? '&bull; 60-day free support call with a compliance engineer<br/>' : ''}
          <br/>
          Reply to this email with any questions. We read every message.<br/>
          <span style="color:#9ca3af;">Order reference: ${input.orderId}</span>
        </td></tr>

        ${credit}
      </table>
    </td></tr>
  </table>
</body></html>`

  await sendEmail({ contactId: input.contactId, subject, html })
}

// ---------------------------------------------------------------------------
// Report-ready email — sent after AI generation completes.
// ---------------------------------------------------------------------------

interface ReportReadyInput {
  contactId: string
  toName?: string | null
  companyName: string
  orderId: string
  reportViewUrl: string
  supportCallUrl?: string | null
  supportCallExpiresAt?: string | null
  tier: number
  tierName?: string
  currentGrade: string
  nprmGrade: string
  criticalFindings: number
  findingsCount: number
  creditHidden?: boolean
}

export async function sendReportReady(input: ReportReadyInput): Promise<void> {
  const subject = `Your HIPAA Readiness Report is ready — ${input.companyName}`
  const credit = input.creditHidden ? '' : `
    <tr><td style="padding:24px 32px 8px 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#6b7280;text-align:center;">
      Powered by <a href="https://0ncore.com" style="color:#ff6b35;text-decoration:none;font-weight:600;">0nCore</a>
    </td></tr>`

  const supportCallBlock = input.supportCallUrl ? `
        <tr><td style="padding:8px 32px 4px 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <div style="background:linear-gradient(135deg,#ecfdf5,#ffffff);border:1px solid #10b981;border-radius:8px;padding:18px;">
            <div style="font-size:10px;color:#059669;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:6px;">Tier 4 benefit</div>
            <div style="font-size:16px;font-weight:700;color:#064e3b;margin-bottom:6px;">Your 60-day free support call is waiting</div>
            <div style="font-size:13px;color:#065f46;line-height:1.5;margin-bottom:12px;">Book a live working session with a compliance engineer to walk through your report, prioritize fixes, and plan the rollout.</div>
            <a href="${input.supportCallUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:700;font-size:13px;">Book your support call &rarr;</a>
          </div>
        </td></tr>` : ''

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f3f4f6;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#0a0a0a;padding:18px 32px;">
          <div style="height:3px;background:linear-gradient(90deg,#10b981,#06b6d4,#ff6b35);border-radius:2px;margin-bottom:10px;"></div>
          <div style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">HIPAA Report Ready${input.tierName ? ' · ' + escapeHtml(input.tierName) : ''}</div>
        </td></tr>
        <tr><td style="padding:28px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a;">
          <div style="font-size:22px;font-weight:700;line-height:1.2;margin-bottom:8px;">Your report is ready${input.toName ? ', ' + escapeHtml(input.toName) : ''}.</div>
          <div style="font-size:14px;color:#4b5563;line-height:1.55;">
            The full HIPAA readiness report for <strong>${escapeHtml(input.companyName)}</strong> is live. Click through to read it in your browser, print it, or share it with your team.
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:8px 0;">
            <tr>
              <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px;width:33%;text-align:center;">
                <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Current</div>
                <div style="font-size:22px;font-weight:800;color:#0a0a0a;margin-top:4px;">${escapeHtml(input.currentGrade)}</div>
              </td>
              <td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:14px;width:33%;text-align:center;">
                <div style="font-size:10px;color:#1e40af;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">NPRM 2026</div>
                <div style="font-size:22px;font-weight:800;color:#1e40af;margin-top:4px;">${escapeHtml(input.nprmGrade)}</div>
              </td>
              <td style="background:#fff1f2;border:1px solid #fecdd3;border-radius:6px;padding:14px;width:34%;text-align:center;">
                <div style="font-size:10px;color:#be123c;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Critical</div>
                <div style="font-size:22px;font-weight:800;color:#be123c;margin-top:4px;">${input.criticalFindings}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:16px 32px 24px 32px;text-align:center;">
          <a href="${input.reportViewUrl}" style="display:inline-block;background:#ff6b35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:700;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Open your full report &rarr;</a>
          <div style="margin-top:10px;font-size:11px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${input.findingsCount} findings &middot; plain-English explanations &middot;${input.tier >= 2 ? ' developer fixes with code &middot;' : ''}${input.tier >= 3 ? ' 2026 NPRM delta &middot;' : ''} print-to-PDF ready</div>
        </td></tr>

        ${supportCallBlock}

        <tr><td style="padding:16px 32px 28px 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4b5563;font-size:13px;line-height:1.6;">
          The link above is private to this order. Keep it — you can revisit the report any time.<br/>
          <span style="color:#9ca3af;">Order reference: ${input.orderId}</span>
        </td></tr>

        ${credit}
      </table>
    </td></tr>
  </table>
</body></html>`

  await sendEmail({ contactId: input.contactId, subject, html })
}

// ---------------------------------------------------------------------------
// Mike notification — sent on every order.
// ---------------------------------------------------------------------------

export async function sendMikeNotification(order: {
  orderId: string
  customerEmail: string
  customerName?: string | null
  companyName: string
  sourceSite?: string | null
  currentGrade: string
  criticalFindings: number
  highFindings: number
  tier?: number
  tierName?: string
}): Promise<void> {
  const mikeContactId = await upsertHipaaContact({ email: MIKE_EMAIL, name: 'Mike Mento' })
  if (!mikeContactId) {
    console.warn('[HIPAA] could not resolve Mike contactId — skipping notification')
    return
  }

  const subject = `🚨 New HIPAA order · Tier ${order.tier || 1} · ${order.companyName}`
  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0a0a0a;color:#f0f4f8;margin:0;padding:24px;">
  <div style="max-width:560px;margin:auto;background:#111827;border:1px solid #1f2937;border-radius:10px;padding:24px;">
    <div style="font-size:11px;color:#7ed957;letter-spacing:2px;text-transform:uppercase;font-weight:700;">New HIPAA order · Tier ${order.tier || 1}${order.tierName ? ' · ' + escapeHtml(order.tierName) : ''}</div>
    <div style="font-size:20px;font-weight:700;margin-top:8px;">${escapeHtml(order.companyName)}</div>
    <div style="color:#9ca3af;margin-top:4px;font-size:13px;">${escapeHtml(order.customerEmail)}${order.customerName ? ' · ' + escapeHtml(order.customerName) : ''}</div>
    <hr style="border:none;border-top:1px solid #1f2937;margin:18px 0;">
    <div style="font-size:13px;line-height:1.8;">
      <strong>Grade:</strong> ${escapeHtml(order.currentGrade)}<br/>
      <strong>Critical:</strong> ${order.criticalFindings} &middot; <strong>High:</strong> ${order.highFindings}<br/>
      <strong>Source:</strong> ${escapeHtml(order.sourceSite || 'direct')}<br/>
      <strong>Order ID:</strong> <code>${order.orderId}</code>
    </div>
    <hr style="border:none;border-top:1px solid #1f2937;margin:18px 0;">
    <a href="https://0ncore.com/dashboard/hipaa" style="display:inline-block;background:#ff6b35;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:700;font-size:13px;">Open in dashboard &rarr;</a>
  </div>
</body></html>`

  await sendEmail({ contactId: mikeContactId, subject, html })
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
