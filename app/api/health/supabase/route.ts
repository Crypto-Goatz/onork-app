import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    )
    const { data, error } = await supabase.from('profiles').select('id').limit(1)
    const latency = Date.now() - start

    if (error) {
      return Response.json({ ok: false, error: error.message, latency_ms: latency })
    }

    return Response.json({ ok: true, rows: data?.length ?? 0, latency_ms: latency })
  } catch (err) {
    return Response.json({ ok: false, error: 'Supabase connection failed', latency_ms: Date.now() - start })
  }
}
