export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  try {
    const pit = process.env.CRM_PIT_ONCORE || process.env.CRM_PIT_RAW || process.env.CRM_PIT || ''
    const locationId = process.env.CRM_LOCATION_ID || 'nphConTwfHcVE1oA0uep'

    if (!pit) {
      return Response.json({ ok: false, error: 'No CRM PIT token configured', latency_ms: 0 })
    }

    const res = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=1`, {
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: '2021-07-28',
        Accept: 'application/json',
      },
    })
    const latency = Date.now() - start

    if (!res.ok) {
      return Response.json({ ok: false, error: `CRM returned ${res.status}`, latency_ms: latency })
    }

    const body = await res.json()
    return Response.json({ ok: true, contacts: body.contacts?.length ?? 0, latency_ms: latency })
  } catch (err) {
    return Response.json({ ok: false, error: 'CRM connection failed', latency_ms: Date.now() - start })
  }
}
