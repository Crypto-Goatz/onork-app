/**
 * Course Builder — brain entry. handleThink owns the think + record loop.
 */

import { NextRequest } from 'next/server'
import { handleThink } from '@/lib/brain/think-route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 90

const SLUG = 'course_builder'

export async function POST(req: NextRequest) {
  return handleThink(req, {
    slug: SLUG,
    async execute(decision) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (process.env.INTERNAL_DISPATCH_SECRET) headers['x-internal-secret'] = process.env.INTERNAL_DISPATCH_SECRET

      const tool = decision.tool

      if (tool === 'start_course') {
        const r = await fetch(`${baseUrl}/api/course-builder/chat`, {
          method: 'POST', headers,
          body: JSON.stringify({
            action: 'start',
            topic: decision.params.topic,
            audience: decision.params.audience,
            lesson_count: decision.params.lesson_count ?? 8,
            learning_outcome: decision.params.learning_outcome,
          }),
        })
        return { output: await r.json().catch(() => ({})), success: r.ok }
      }

      if (tool === 'continue_chat') {
        const r = await fetch(`${baseUrl}/api/course-builder/chat`, {
          method: 'POST', headers,
          body: JSON.stringify({
            action: 'continue',
            session_id: decision.params.session_id,
            message: decision.params.message,
          }),
        })
        return { output: await r.json().catch(() => ({})), success: r.ok }
      }

      if (tool === 'generate_lessons') {
        const r = await fetch(`${baseUrl}/api/courses/generate`, {
          method: 'POST', headers,
          body: JSON.stringify({ session_id: decision.params.session_id }),
        })
        return { output: await r.json().catch(() => ({})), success: r.ok }
      }

      if (tool === 'publish_course') {
        const r = await fetch(`${baseUrl}/api/courses/${decision.params.session_id}/publish`, {
          method: 'POST', headers,
          body: JSON.stringify({}),
        })
        return { output: await r.json().catch(() => ({})), success: r.ok }
      }

      if (tool === 'ask_clarification') {
        return { output: { question: decision.params.question ?? 'Tell me more.' }, success: true }
      }

      return { output: { error: `unknown tool: ${tool}` }, success: false }
    },
  })
}
