/**
 * /api/admin/jaxx — Groq-backed chat for the /admin Jaxx tab.
 *
 * Body: { messages: ChatMessage[], locationId: string, locationName: string }
 * Returns: { ok: true, message: string }
 *
 * Per CLAUDE.md Critical Rule #6 — Groq only, never Anthropic SDK.
 *
 * ADMIN-GATED as of 2026-08-04. It had no caller check, which made it an open
 * model endpoint billed to us — the cheapest possible thing for someone to
 * abuse, and invisible until the invoice.
 */

import { NextResponse } from 'next/server'
import { getAdminLocation } from '@/lib/admin-locations'
import { verifyAdmin } from '@/lib/admin-gate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface Body {
  messages: ChatMessage[]
  locationId: string
  locationName?: string
}

function buildSystemPrompt(locationName: string, locationId: string): string {
  return `You are Jaxx — the AI inside the RocketOpp admin app. You sit on top of the CRM (services.leadconnectorhq.com) for the active location.

Active location: ${locationName} (id: ${locationId})

You can perform CRM actions by emitting fenced code blocks tagged \`action\`. Each action block must be valid JSON with a "type" field. The harness parses these out and runs them, then shows the result back to the user inline.

Supported action types:
  CREATE_TAGS       { "type": "CREATE_TAGS", "names": ["tag-a", "tag-b"] }
  SEARCH_CONTACTS   { "type": "SEARCH_CONTACTS", "query": "jane@example.com", "limit": 10 }
  CREATE_CONTACT    { "type": "CREATE_CONTACT", "firstName": "Jane", "lastName": "Doe", "email": "jane@x.com", "phone": "+15551234" }
  LIST_WORKFLOWS    { "type": "LIST_WORKFLOWS" }
  CREATE_CUSTOM_FIELD { "type": "CREATE_CUSTOM_FIELD", "name": "Field Name", "dataType": "TEXT" }
  GET_LOCATION_INFO { "type": "GET_LOCATION_INFO" }

Style rules:
  - Be brief. The chat lives on a phone — short paragraphs, no preamble.
  - Lead with the answer. Then offer follow-ups if useful.
  - When you intend to do something on the CRM, emit ONE action block per turn.
  - Never invent CRM IDs you don't have. Search first, then act.
  - No emojis as state/icons. Plain prose.

Examples of an action turn:

User: "Create tags for our Mother's Day campaign — mothers-day-2026, mothers-day-vip"
Assistant:
On it — creating both tags now.
\`\`\`action
{ "type": "CREATE_TAGS", "names": ["mothers-day-2026", "mothers-day-vip"] }
\`\`\`

User: "Find Sarah Johnson"
Assistant:
\`\`\`action
{ "type": "SEARCH_CONTACTS", "query": "Sarah Johnson", "limit": 5 }
\`\`\``
}

export async function POST(req: Request) {
  const gate = await verifyAdmin()
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.userId ? 403 : 401 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const { messages, locationId } = body
  if (!Array.isArray(messages) || !locationId) {
    return NextResponse.json({ ok: false, error: 'missing_messages_or_location' }, { status: 400 })
  }

  const loc = getAdminLocation(locationId)
  const locationName = body.locationName || loc?.name || 'Unknown'

  const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_FALLBACK || ''
  if (!apiKey.startsWith('gsk_')) {
    return NextResponse.json(
      { ok: false, error: 'GROQ_API_KEY env var not set on this deployment' },
      { status: 500 },
    )
  }

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(locationName, locationId) },
    ...messages.filter((m) => m.role !== 'system'),
  ]

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: fullMessages,
        temperature: 0.5,
        max_tokens: 1024,
      }),
      cache: 'no-store',
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.error?.message || `groq_${res.status}` },
        { status: 502 },
      )
    }

    const message: string = data?.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ ok: true, message })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown_error' },
      { status: 500 },
    )
  }
}
