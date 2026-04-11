import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const CRM_API = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

async function crmFetch(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${CRM_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.CRM_PIT_RAW || process.env.CRM_PIT}`,
      'Content-Type': 'application/json',
      Version: CRM_VERSION,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT

  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', user.id)
    .single()

  const locationId = profile?.crm_location_id || process.env.CRM_LOCATION_ID
  if (!pit || !locationId) {
    return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('id')

    if (conversationId) {
      // Fetch messages for a specific conversation
      const res = await crmFetch(`/conversations/${conversationId}/messages`)
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json(
          { error: `CRM API error: ${res.status}`, details: text },
          { status: res.status }
        )
      }
      const data = await res.json()
      return NextResponse.json({ messages: data.messages || [] })
    }

    // Fetch all conversations
    const limit = searchParams.get('limit') || '20'
    const res = await crmFetch(
      `/conversations/search?locationId=${locationId}&limit=${limit}`
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `CRM API error: ${res.status}`, details: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({ conversations: data.conversations || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CRM request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pit = process.env.CRM_PIT_RAW || process.env.CRM_PIT
  if (!pit) {
    return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { contactId, message, subject, type = 'Email' } = body

    if (!contactId || !message) {
      return NextResponse.json({ error: 'contactId and message required' }, { status: 400 })
    }

    const res = await crmFetch('/conversations/messages', 'POST', {
      type,
      contactId,
      message,
      ...(subject ? { subject } : {}),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `CRM API error: ${res.status}`, details: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CRM request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
