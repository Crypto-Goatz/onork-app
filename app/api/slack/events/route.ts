import { NextResponse } from 'next/server'

/**
 * Slack Events + CRM → Slack Bridge
 *
 * Handles:
 * 1. Slack Events API (url_verification, messages)
 * 2. CRM webhook events → formatted Slack messages
 * 3. Stripe events → Slack notifications
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || ''
const SLACK_CHANNEL_LEADS = process.env.SLACK_CHANNEL_LEADS || '#leads'
const SLACK_CHANNEL_SALES = process.env.SLACK_CHANNEL_SALES || '#sales'
const SLACK_CHANNEL_SUPPORT = process.env.SLACK_CHANNEL_SUPPORT || '#support'

export async function POST(req: Request) {
  const body = await req.json()

  // Slack URL verification challenge
  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge })
  }

  // Route by event source
  const source = body.source || body.type || 'unknown'

  switch (source) {
    case 'crm_contact_created':
      await notifySlack(SLACK_CHANNEL_LEADS, {
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '🆕 New Lead' } },
          { type: 'section', text: { type: 'mrkdwn', text: `*${body.contact?.name || 'Unknown'}*\n📧 ${body.contact?.email || '—'}\n📱 ${body.contact?.phone || '—'}\nSource: ${body.contact?.source || 'direct'}` } },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '🔥 Score Lead' }, action_id: 'score_lead', style: 'primary' },
              { type: 'button', text: { type: 'plain_text', text: '📞 Call' }, action_id: 'call_lead' },
              { type: 'button', text: { type: 'plain_text', text: '📧 Email' }, action_id: 'email_lead' },
            ],
          },
        ],
      })
      break

    case 'crm_appointment_booked':
      await notifySlack(SLACK_CHANNEL_LEADS, {
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '📅 Appointment Booked' } },
          { type: 'section', text: { type: 'mrkdwn', text: `*${body.contact?.name || 'Unknown'}*\n📅 ${body.appointment?.date || '—'} at ${body.appointment?.time || '—'}\n📍 ${body.appointment?.calendar || 'Default calendar'}` } },
        ],
      })
      break

    case 'crm_opportunity_stage_changed':
      await notifySlack(SLACK_CHANNEL_SALES, {
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '📊 Deal Moved' } },
          { type: 'section', text: { type: 'mrkdwn', text: `*${body.opportunity?.name || 'Unknown'}*\n${body.opportunity?.fromStage || '?'} → *${body.opportunity?.toStage || '?'}*\n💰 Value: $${body.opportunity?.value || 0}` } },
        ],
      })
      break

    case 'stripe_payment_received':
      await notifySlack(SLACK_CHANNEL_SALES, {
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '💰 Payment Received' } },
          { type: 'section', text: { type: 'mrkdwn', text: `*$${(body.amount || 0) / 100}* from *${body.customer?.name || body.customer?.email || 'Unknown'}*\n${body.description || 'Payment'}` } },
        ],
      })
      break

    case 'stripe_subscription_created':
      await notifySlack(SLACK_CHANNEL_SALES, {
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '🎉 New Subscription' } },
          { type: 'section', text: { type: 'mrkdwn', text: `*${body.customer?.name || body.customer?.email || 'Unknown'}*\nPlan: ${body.plan || '—'}\nMRR: +$${(body.amount || 0) / 100}/mo` } },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '🏠 Open 0nCore' }, url: 'https://0ncore.com/dashboard', action_id: 'open_oncore' },
            ],
          },
        ],
      })
      break

    case 'crm_form_submitted':
      await notifySlack(SLACK_CHANNEL_LEADS, {
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '📝 Form Submission' } },
          { type: 'section', text: { type: 'mrkdwn', text: `*${body.contact?.name || 'Unknown'}*\nForm: ${body.form?.name || '—'}\n📧 ${body.contact?.email || '—'}` } },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { type: 'plain_text', text: '🔥 Score' }, action_id: 'score_lead', style: 'primary' },
              { type: 'button', text: { type: 'plain_text', text: '💬 SMS' }, action_id: 'sms_lead' },
            ],
          },
        ],
      })
      break

    case 'crm_task_completed':
      await notifySlack(SLACK_CHANNEL_SUPPORT, {
        text: `✅ Task completed: *${body.task?.name || 'Unknown'}* by ${body.user?.name || 'system'}`,
      })
      break

    case 'crm_review_received':
      await notifySlack(SLACK_CHANNEL_SUPPORT, {
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: `⭐ New ${body.rating || 5}-Star Review` } },
          { type: 'section', text: { type: 'mrkdwn', text: `"${body.review?.text || 'Great experience!'}" — *${body.reviewer?.name || 'Anonymous'}*` } },
        ],
      })
      break

    case '0nai_automation_completed':
      await notifySlack(SLACK_CHANNEL_SUPPORT, {
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '🤖 Automation Complete' } },
          { type: 'section', text: { type: 'mrkdwn', text: `*${body.automation?.name || 'Workflow'}*\nSteps: ${body.automation?.steps || 0}\nDuration: ${body.automation?.duration || '—'}\nResult: ${body.automation?.result || 'success'}` } },
        ],
      })
      break
  }

  return NextResponse.json({ ok: true })
}

async function notifySlack(channel: string, message: any) {
  if (!SLACK_WEBHOOK_URL) return

  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, ...message }),
  }).catch(() => {})
}
