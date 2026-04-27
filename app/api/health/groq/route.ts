export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY || ''}` },
    })
    const latency = Date.now() - start

    if (!res.ok) {
      return Response.json({ ok: false, error: `Groq returned ${res.status}`, latency_ms: latency })
    }

    const body = await res.json()
    const models = Array.isArray(body.data) ? body.data.length : 0

    return Response.json({ ok: true, models, latency_ms: latency })
  } catch (err) {
    return Response.json({ ok: false, error: 'Groq connection failed', latency_ms: Date.now() - start })
  }
}
