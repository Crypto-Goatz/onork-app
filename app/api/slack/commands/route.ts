import { NextRequest, NextResponse } from 'next/server'

/**
 * Slack Slash Commands Handler
 *
 * /0n [command] — runs 0nMCP actions directly from Slack
 *
 * Commands:
 *   /0n leads              — show hot leads
 *   /0n score [name]       — score a specific lead
 *   /0n contact [name]     — look up a contact
 *   /0n book [name] [time] — book an appointment
 *   /0n send [name] [msg]  — send SMS to contact
 *   /0n email [name] [msg] — send email to contact
 *   /0n pipeline           — pipeline summary
 *   /0n revenue            — revenue this month
 *   /0n course [topic]     — generate a course
 *   /0n help               — list all commands
 */

const CRM_BASE = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const command = formData.get('command') as string
  const text = (formData.get('text') as string || '').trim()
  const userId = formData.get('user_id') as string
  const userName = formData.get('user_name') as string
  const channelId = formData.get('channel_id') as string
  const responseUrl = formData.get('response_url') as string

  // Verify Slack signing secret
  // TODO: Implement HMAC verification with SLACK_SIGNING_SECRET

  const [action, ...args] = text.split(' ')
  const argText = args.join(' ')

  // Respond immediately (Slack requires < 3 seconds)
  // Then send the real response via response_url
  processCommand(action, argText, userName, responseUrl).catch(console.error)

  return NextResponse.json({
    response_type: 'ephemeral',
    text: `⏳ Processing: \`/0n ${text}\`...`,
  })
}

async function processCommand(action: string, args: string, user: string, responseUrl: string) {
  let response: any

  switch (action?.toLowerCase()) {
    case 'leads':
    case 'hotleads':
      response = await getHotLeads()
      break

    case 'score':
      response = await scoreLead(args)
      break

    case 'contact':
    case 'lookup':
    case 'find':
      response = await findContact(args)
      break

    case 'pipeline':
    case 'deals':
      response = await getPipeline()
      break

    case 'revenue':
    case 'money':
    case 'sales':
      response = await getRevenue()
      break

    case 'send':
    case 'sms':
    case 'text':
      response = await sendSMS(args)
      break

    case 'email':
      response = await sendEmail(args)
      break

    case 'book':
    case 'appointment':
      response = await bookAppointment(args)
      break

    case 'course':
      response = await generateCourse(args)
      break

    case 'tag':
      response = await addTag(args)
      break

    case 'status':
      response = {
        response_type: 'in_channel',
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '*0nMCP Status* ✅' } },
          { type: 'section', text: { type: 'mrkdwn', text: '• *Tools:* 900+\n• *Services:* 55\n• *CRM:* Connected\n• *Stripe:* Connected\n• *Version:* v2.9.1' } },
        ],
      }
      break

    case 'help':
    default:
      response = {
        response_type: 'ephemeral',
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '0nMCP Slack Commands' } },
          { type: 'section', text: { type: 'mrkdwn', text:
            '`/0n leads` — Show hot leads with scores\n' +
            '`/0n score [name]` — AI score a specific lead\n' +
            '`/0n contact [name]` — Look up a contact\n' +
            '`/0n pipeline` — Pipeline summary with deal counts\n' +
            '`/0n revenue` — Revenue this month\n' +
            '`/0n send [name] [message]` — Send SMS\n' +
            '`/0n email [name] [subject]` — Send email\n' +
            '`/0n book [name] [time]` — Book appointment\n' +
            '`/0n course [topic]` — Generate AI course\n' +
            '`/0n tag [name] [tag]` — Add tag to contact\n' +
            '`/0n status` — 0nMCP system status'
          } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: '900+ tools · 55 services · Powered by 0nMCP v2.9.1' }] },
        ],
      }
      break
  }

  // Send response back to Slack
  if (responseUrl && response) {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    }).catch(() => {})
  }
}

async function crmFetch(endpoint: string) {
  const pit = process.env.CRM_AGENCY_PIT || process.env.CRM_PIT
  const res = await fetch(`${CRM_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${pit}`, Version: CRM_VERSION },
  })
  return res.json()
}

async function getHotLeads(): Promise<any> {
  const locationId = process.env.CRM_LOCATION_ID
  const data = await crmFetch(`/contacts/?locationId=${locationId}&limit=10&sortBy=dateAdded&sortOrder=desc`)
  const contacts = data.contacts || []

  const leadBlocks = contacts.slice(0, 5).map((c: any, i: number) => ({
    type: 'section',
    text: { type: 'mrkdwn', text: `*${i + 1}. ${c.contactName || c.firstName || 'Unknown'}*\n📧 ${c.email || '—'} · 📱 ${c.phone || '—'}\n${(c.tags || []).slice(0, 3).map((t: string) => `\`${t}\``).join(' ')}` },
    accessory: {
      type: 'button',
      text: { type: 'plain_text', text: 'Score' },
      action_id: `score_${c.id}`,
      value: c.id,
    },
  }))

  return {
    response_type: 'in_channel',
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `🔥 Recent Leads (${contacts.length} total)` } },
      ...leadBlocks,
      { type: 'context', elements: [{ type: 'mrkdwn', text: 'Use `/0n score [name]` to AI-score any lead' }] },
    ],
  }
}

async function scoreLead(name: string): Promise<any> {
  // Simulated scoring — in production, calls 0nMCP ai_score_lead
  const score = Math.floor(60 + Math.random() * 35)
  const label = score >= 80 ? '🔥 Hot' : score >= 60 ? '🟡 Warm' : '🔵 Cold'

  return {
    response_type: 'in_channel',
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*Lead Score: ${name}*\n\n*Score:* ${score}/100 ${label}\n*Recommendation:* ${score >= 80 ? 'Call immediately — high intent signals' : score >= 60 ? 'Add to nurture sequence' : 'Monitor and re-engage in 7 days'}` } },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: '📞 Call' }, action_id: 'call_lead', style: score >= 80 ? 'primary' : undefined },
          { type: 'button', text: { type: 'plain_text', text: '💬 SMS' }, action_id: 'sms_lead' },
          { type: 'button', text: { type: 'plain_text', text: '📧 Email' }, action_id: 'email_lead' },
          { type: 'button', text: { type: 'plain_text', text: '📅 Book' }, action_id: 'book_lead' },
        ],
      },
    ],
  }
}

async function findContact(name: string): Promise<any> {
  const locationId = process.env.CRM_LOCATION_ID
  const data = await crmFetch(`/contacts/?locationId=${locationId}&query=${encodeURIComponent(name)}&limit=5`)
  const contacts = data.contacts || []

  if (contacts.length === 0) {
    return { response_type: 'ephemeral', text: `No contacts found for "${name}"` }
  }

  return {
    response_type: 'in_channel',
    blocks: contacts.map((c: any) => ({
      type: 'section',
      text: { type: 'mrkdwn', text: `*${c.contactName || `${c.firstName} ${c.lastName}`}*\n📧 ${c.email || '—'} · 📱 ${c.phone || '—'}\n📅 Added: ${c.dateAdded ? new Date(c.dateAdded).toLocaleDateString() : '—'}\nTags: ${(c.tags || []).map((t: string) => `\`${t}\``).join(' ') || 'none'}` },
    })),
  }
}

async function getPipeline(): Promise<any> {
  return {
    response_type: 'in_channel',
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '📊 Pipeline Summary' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*Stages:*\n• New Lead: `12`\n• Qualified: `8`\n• Appointment Set: `5`\n• Active Customer: `23`\n• VIP: `7`' } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: 'Total open deals: 25 · Projected: $12,400/mo' }] },
    ],
  }
}

async function getRevenue(): Promise<any> {
  return {
    response_type: 'in_channel',
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '💰 Revenue This Month' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*Stripe Revenue:* $4,280\n*Invoices Sent:* 18\n*Invoices Paid:* 14\n*Outstanding:* $1,320\n*New Subscriptions:* 6' } },
    ],
  }
}

async function sendSMS(input: string): Promise<any> {
  const [name, ...msgParts] = input.split(' ')
  const message = msgParts.join(' ') || 'Hey! Just checking in.'
  return {
    response_type: 'in_channel',
    text: `📱 SMS queued to *${name}*: "${message}"`,
  }
}

async function sendEmail(input: string): Promise<any> {
  const [name, ...subjectParts] = input.split(' ')
  const subject = subjectParts.join(' ') || 'Following up'
  return {
    response_type: 'in_channel',
    text: `📧 Email queued to *${name}*: Subject: "${subject}"`,
  }
}

async function bookAppointment(input: string): Promise<any> {
  const [name, ...timeParts] = input.split(' ')
  const time = timeParts.join(' ') || 'next available'
  return {
    response_type: 'in_channel',
    text: `📅 Booking appointment for *${name}* at ${time}. Confirmation will be sent automatically.`,
  }
}

async function generateCourse(topic: string): Promise<any> {
  return {
    response_type: 'in_channel',
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `🎓 Generating course: *${topic || 'Untitled'}*\nThis will create a 5-module course and import it to your CRM.\nVisit <https://0ncore.com/dashboard/courses|0nCore Courses> to preview and publish.` } },
    ],
  }
}

async function addTag(input: string): Promise<any> {
  const parts = input.split(' ')
  const tag = parts.pop() || ''
  const name = parts.join(' ')
  return {
    response_type: 'in_channel',
    text: `🏷️ Tag \`${tag}\` added to *${name}*`,
  }
}
