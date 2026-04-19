import { NextRequest, NextResponse } from 'next/server'

/**
 * Quora Conversion API
 * POST /api/integrations/quora — fire a conversion event
 *
 * Quora Ads conversion tracking via their server-side API.
 * Token is a public conversion token (not a secret).
 */

const QUORA_TOKEN = 'ec66803919f947b8368908ed792c882b'
const QUORA_API = 'https://quora.com/qpixel'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventType, email, revenue, conversionId } = body

    if (!eventType) {
      return NextResponse.json({ error: 'eventType required' }, { status: 400 })
    }

    // Build Quora conversion payload
    const payload: Record<string, unknown> = {
      token: QUORA_TOKEN,
      event_type: eventType, // e.g. 'Generic', 'Purchase', 'GenerateLead', 'CompleteRegistration', 'AddToCart'
    }
    if (email) payload.email = email
    if (revenue !== undefined) payload.revenue = revenue
    if (conversionId) payload.conversion_id = conversionId

    // Fire the server-side conversion
    const res = await fetch(`${QUORA_API}?${new URLSearchParams({
      token: QUORA_TOKEN,
      event_type: eventType,
      ...(email ? { email } : {}),
      ...(revenue !== undefined ? { revenue: String(revenue) } : {}),
      ...(conversionId ? { conversion_id: conversionId } : {}),
    }).toString()}`, {
      method: 'GET',
      cache: 'no-store',
    })

    return NextResponse.json({
      success: true,
      eventType,
      quoraStatus: res.status,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Quora conversion failed',
    }, { status: 502 })
  }
}
