/**
 * HIPAA order email helpers.
 *
 * Both emails go through the CRM conversations/messages endpoint (same
 * pattern as lib/workflows/blog-to-social.ts::sendEmailCRM).
 */

import { crmPost } from '@/lib/crm'

const ROCKETOPP_LOCATION = '6MSqx0trfxgLxeHBJE1k'
const FROM_EMAIL = process.env.CRM_FROM_EMAIL || 'noreply@rocketopp.com'
const MIKE_EMAIL = 'mike@rocketopp.com'

interface CustomerEmailInput {
  to: string
  toName?: string | null
  companyName: string
  orderId: string
  pdfUrl: string
  currentGrade: string
  currentRuleScore: number
  criticalFindings: number
  highFindings: number
  creditHidden?: boolean
}

/**
 * Send the customer the purchase-confirmation + initial findings PDF.
 * Promises the full report within 60 minutes.
 */
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
          <div style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">HIPAA Readiness Report</div>
        </td></tr>
        <tr><td style="padding:28px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a;">
          <div style="font-size:22px;font-weight:700;line-height:1.2;margin-bottom:8px;">We have your order${input.toName ? ', ' + input.toName : ''}.</div>
          <div style="font-size:14px;color:#4b5563;line-height:1.55;">
            The full HIPAA readiness report for <strong>${escapeHtml(input.companyName)}</strong> is being generated.
            You&rsquo;ll receive it at this email address <strong>within the next 60 minutes</strong>.
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:8px 0;">
            <tr>
              <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px;width:50%;">
                <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Current score</div>
                <div style="font-size:22px;font-weight:800;color:#0a0a0a;margin-top:4px;">${input.currentRuleScore}<span style="color:#9ca3af;font-size:14px;"> / 100 · ${input.currentGrade}</span></div>
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
            <strong>Your initial findings PDF is attached below.</strong> It explains — in plain English — each top gap and why HIPAA would flag it. Use it to brief your team while you wait for the full report.
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px 24px 32px;text-align:center;">
          <a href="${input.pdfUrl}" style="display:inline-block;background:#ff6b35;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:700;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Download the initial findings PDF &rarr;</a>
        </td></tr>

        <tr><td style="padding:0 32px 28px 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#4b5563;font-size:13px;line-height:1.6;">
          <strong style="color:#0a0a0a;">What&rsquo;s in the full report?</strong><br/>
          • Every control we tested (not just the top 5)<br/>
          • Prioritised remediation plan with time + cost estimates<br/>
          • State-specific overlay with the laws that stack on top of HIPAA<br/>
          • 2026 NPRM delta — what&rsquo;s changing and what you need to fix first<br/><br/>
          Reply to this email with any questions. We read every message.<br/>
          <span style="color:#9ca3af;">Order reference: ${input.orderId}</span>
        </td></tr>

        ${credit}
      </table>
    </td></tr>
  </table>
</body></html>`

  await crmPost('/conversations/messages', ROCKETOPP_LOCATION, {
    type: 'Email',
    contactId: '__set__', // filled by caller if needed, else CRM resolves by email
    emailTo: input.to,
    emailFrom: FROM_EMAIL,
    subject,
    html,
  })
}

/**
 * Notify Mike that a new order landed.
 */
export async function sendMikeNotification(order: {
  orderId: string
  customerEmail: string
  customerName?: string | null
  companyName: string
  sourceSite?: string | null
  currentGrade: string
  criticalFindings: number
  highFindings: number
}): Promise<void> {
  const subject = `💥 New HIPAA report order — ${order.companyName} (${order.currentGrade})`
  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0a0a0a;color:#f0f4f8;margin:0;padding:24px;">
  <div style="max-width:560px;margin:auto;background:#111827;border:1px solid #1f2937;border-radius:10px;padding:24px;">
    <div style="font-size:11px;color:#7ed957;letter-spacing:2px;text-transform:uppercase;font-weight:700;">New HIPAA order</div>
    <div style="font-size:20px;font-weight:700;margin-top:8px;">${escapeHtml(order.companyName)}</div>
    <div style="color:#9ca3af;margin-top:4px;font-size:13px;">${escapeHtml(order.customerEmail)}${order.customerName ? ' · ' + escapeHtml(order.customerName) : ''}</div>
    <hr style="border:none;border-top:1px solid #1f2937;margin:18px 0;">
    <div style="font-size:13px;line-height:1.8;">
      <strong>Grade:</strong> ${order.currentGrade}<br/>
      <strong>Critical:</strong> ${order.criticalFindings} · <strong>High:</strong> ${order.highFindings}<br/>
      <strong>Source:</strong> ${order.sourceSite || 'direct'}<br/>
      <strong>Order ID:</strong> <code>${order.orderId}</code>
    </div>
    <hr style="border:none;border-top:1px solid #1f2937;margin:18px 0;">
    <a href="https://0ncore.com/dashboard/hipaa" style="display:inline-block;background:#ff6b35;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:700;font-size:13px;">Open in dashboard &rarr;</a>
  </div>
</body></html>`

  await crmPost('/conversations/messages', ROCKETOPP_LOCATION, {
    type: 'Email',
    emailTo: MIKE_EMAIL,
    emailFrom: FROM_EMAIL,
    subject,
    html,
  })
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
