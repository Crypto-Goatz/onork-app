/**
 * POST /api/course-builder/demo-outline
 *
 * Public, rate-limited preview that returns a real Groq-generated outline
 * for the marketplace demo page. Does NOT persist anything, does NOT touch
 * the CRM. Same `generateOutline()` function the production webhook uses,
 * so the demo reflects exactly what the app produces.
 *
 * Body: { topic, audience, lessonCount, includeQuizzes, learningOutcome, tone }
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateOutline } from '@/lib/course-builder/generator'
import type { CourseConfig } from '@/lib/course-builder/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RATE_BUCKET: { ts: number; count: number; ip: string }[] = []
const PER_IP_PER_HOUR = 6

function rateOk(ip: string): boolean {
  const now = Date.now()
  const cutoff = now - 60 * 60 * 1000
  while (RATE_BUCKET.length && RATE_BUCKET[0].ts < cutoff) RATE_BUCKET.shift()
  const recent = RATE_BUCKET.filter((r) => r.ip === ip).length
  if (recent >= PER_IP_PER_HOUR) return false
  RATE_BUCKET.push({ ts: now, count: 1, ip })
  return true
}

const TONES = ['professional', 'casual', 'technical', 'motivational']

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'anon'

  if (!rateOk(ip)) {
    return NextResponse.json(
      { ok: false, error: { code: 'rate_limited', message: 'Try again in a few minutes.' } },
      { status: 429 },
    )
  }

  let body: Partial<CourseConfig>
  try {
    body = (await req.json()) as Partial<CourseConfig>
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'bad_json' } }, { status: 400 })
  }

  const topic = String(body.topic || '').slice(0, 200).trim()
  const audience = String(body.audience || '').slice(0, 200).trim()
  const lessonCount = Math.max(3, Math.min(10, Number(body.lessonCount) || 5))
  const includeQuizzes = body.includeQuizzes !== false
  const learningOutcome = String(body.learningOutcome || '').slice(0, 300).trim()
  const tone = TONES.includes(String(body.tone)) ? String(body.tone) : 'professional'

  if (!topic || !audience || !learningOutcome) {
    return NextResponse.json(
      { ok: false, error: { code: 'missing_fields' } },
      { status: 400 },
    )
  }

  try {
    const outline = await generateOutline({
      topic,
      audience,
      lessonCount,
      includeQuizzes,
      learningOutcome,
      tone,
    })

    return NextResponse.json({ ok: true, outline })
  } catch (e) {
    console.error('[course-builder/demo-outline] error', e)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'generation_failed',
          message: 'Outline generation failed. The full app retries with a stricter prompt — please try again.',
        },
      },
      { status: 500 },
    )
  }
}
