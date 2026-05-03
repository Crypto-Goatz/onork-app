import { NextRequest, NextResponse } from 'next/server'
import { drAdmin, type DrEventInsert } from '@/lib/dr/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Permissive CORS — the script is served on customer domains and posts back
// to /api/dr/events from any origin. Beacon requests don't honor CORS for
// the response, but explicit headers help fetch fallback work.
const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

const GRADE_COLUMN: Record<string, string> = {
  'A+': 'grade_a',
  'A': 'grade_a',
  'B': 'grade_b',
  'C': 'grade_c',
  'D': 'grade_d',
  'F': 'grade_f',
  'X': 'grade_x',
}

function ack(status = 204) {
  return new NextResponse(null, { status, headers: CORS_HEADERS })
}

function clean(v: unknown, max = 2048): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max) : t
}

export async function POST(req: NextRequest) {
  // sendBeacon delivers a Blob with content-type application/json, but some
  // browsers downgrade to text/plain. Read as text and parse.
  const raw = await req.text().catch(() => '')
  if (!raw) return ack()
  let body: Record<string, unknown> | null = null
  try { body = JSON.parse(raw) as Record<string, unknown> } catch { return ack() }
  if (!body) return ack()

  const siteId = clean(body.site_id, 128)
  const sessionId = clean(body.session_id, 128)
  const eventType = clean(body.event_type, 32)
  if (!siteId || !sessionId || !eventType) return ack()

  const supabase = drAdmin()

  // Validate the site_id exists and is active. Cache via a small read on each
  // request — Supabase serves these from RAM at our volume.
  const { data: site } = await supabase
    .from('dr_domains')
    .select('site_id, is_active')
    .eq('site_id', siteId)
    .maybeSingle()

  if (!site || !site.is_active) return ack()

  const grade = clean(body.grade, 4)
  const scoreRaw = body.score
  const score = typeof scoreRaw === 'number' && isFinite(scoreRaw)
    ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
    : null

  const insert: DrEventInsert = {
    site_id: siteId,
    session_id: sessionId,
    event_type: eventType,
    grade,
    score,
    url: clean(body.url, 2048),
    referrer: clean(body.referrer, 2048),
    ad_platform: clean(body.ad_platform, 32),
    click_id: clean(body.click_id, 256),
    behavioral_signals: (body.behavioral_signals && typeof body.behavioral_signals === 'object'
      ? body.behavioral_signals as Record<string, unknown>
      : null),
    user_agent: clean(req.headers.get('user-agent') || (body.user_agent as string | undefined) || '', 512),
  }

  await supabase.from('dr_events').insert(insert)

  // Aggregate grade events into the daily rollup. We do this synchronously
  // on grade events only — page_view/click/exit don't need per-day buckets.
  if (eventType === 'grade' && grade) {
    await rollup(supabase, siteId, grade, score, insert.referrer ?? null, insert.ad_platform ?? null)
  }

  return ack()
}

async function rollup(
  supabase: ReturnType<typeof drAdmin>,
  siteId: string,
  grade: string,
  score: number | null,
  referrer: string | null,
  adPlatform: string | null,
) {
  const today = new Date().toISOString().slice(0, 10)
  const gradeCol = GRADE_COLUMN[grade]
  if (!gradeCol) return

  const { data: existing } = await supabase
    .from('dr_daily_stats')
    .select('*')
    .eq('site_id', siteId)
    .eq('date', today)
    .maybeSingle()

  if (!existing) {
    await supabase.from('dr_daily_stats').insert({
      site_id: siteId,
      date: today,
      total_sessions: 1,
      grade_a: gradeCol === 'grade_a' ? 1 : 0,
      grade_b: gradeCol === 'grade_b' ? 1 : 0,
      grade_c: gradeCol === 'grade_c' ? 1 : 0,
      grade_d: gradeCol === 'grade_d' ? 1 : 0,
      grade_f: gradeCol === 'grade_f' ? 1 : 0,
      grade_x: gradeCol === 'grade_x' ? 1 : 0,
      avg_score: score ?? null,
      top_referrer: referrer,
      top_ad_platform: adPlatform,
    })
    return
  }

  const row = existing as Record<string, number | string | null>
  const prevSessions = Number(row.total_sessions ?? 0)
  const prevAvg = row.avg_score == null ? null : Number(row.avg_score)
  const newSessions = prevSessions + 1
  const newAvg = score == null
    ? prevAvg
    : prevAvg == null
      ? score
      : Math.round(((prevAvg * prevSessions + score) / newSessions) * 100) / 100

  const update: Record<string, number | string | null> = {
    total_sessions: newSessions,
    [gradeCol]: Number(row[gradeCol] ?? 0) + 1,
    avg_score: newAvg,
  }
  // Most-recent referrer / platform wins until we have time to compute mode.
  if (referrer) update.top_referrer = referrer
  if (adPlatform) update.top_ad_platform = adPlatform

  await supabase
    .from('dr_daily_stats')
    .update(update)
    .eq('site_id', siteId)
    .eq('date', today)
}
