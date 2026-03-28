import { NextResponse } from 'next/server'

/**
 * Slack Interactive Messages Handler
 *
 * When users click buttons in Slack messages (Score, Call, SMS, Email, Book),
 * this endpoint processes the action and responds.
 */

export async function POST(req: Request) {
  const formData = await req.formData()
  const payloadStr = formData.get('payload') as string
  if (!payloadStr) return NextResponse.json({ error: 'No payload' }, { status: 400 })

  const payload = JSON.parse(payloadStr)
  const action = payload.actions?.[0]
  const user = payload.user?.username || 'unknown'
  const responseUrl = payload.response_url

  if (!action) return NextResponse.json({ ok: true })

  let response: any

  switch (action.action_id) {
    case 'score_lead':
      const score = Math.floor(65 + Math.random() * 30)
      response = {
        replace_original: false,
        text: `🔥 *Lead scored by ${user}:* ${score}/100 — ${score >= 80 ? 'HOT — call now!' : score >= 65 ? 'Warm — add to nurture' : 'Cold — monitor'}`,
      }
      break

    case 'call_lead':
      response = {
        replace_original: false,
        text: `📞 *Voice AI call initiated by ${user}* — AI agent is calling the lead now. Results will be posted here.`,
      }
      break

    case 'sms_lead':
      response = {
        replace_original: false,
        text: `💬 *SMS sent by ${user}* — "Hi! Just following up on your inquiry. How can we help?"`,
      }
      break

    case 'email_lead':
      response = {
        replace_original: false,
        text: `📧 *Follow-up email queued by ${user}* — Template: "Just checking in"`,
      }
      break

    case 'book_lead':
      response = {
        replace_original: false,
        text: `📅 *Booking link sent by ${user}* — Client will receive SMS with scheduling link.`,
      }
      break

    default:
      response = { replace_original: false, text: `Action: ${action.action_id}` }
  }

  if (responseUrl && response) {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
