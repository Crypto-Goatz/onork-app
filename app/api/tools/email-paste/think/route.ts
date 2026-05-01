/**
 * Email Copy-Paste — brain entry. handleThink owns the loop:
 *   load brief + brain → Groq → execute → record.
 * Public route — anyone can hit it. Free tier rate limits TBD.
 */

import { NextRequest } from 'next/server'
import { handleThink } from '@/lib/brain/think-route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SLUG = 'email_paste'

export async function POST(req: NextRequest) {
  return handleThink(req, {
    slug: SLUG,
    async execute(decision) {
      const tool = decision.tool

      if (tool === 'generate_email') {
        const p = decision.params as { to?: string; cc?: string; bcc?: string; subject?: string; body?: string }
        return {
          output: {
            email: {
              to:      String(p.to ?? ''),
              cc:      String(p.cc ?? ''),
              bcc:     String(p.bcc ?? ''),
              subject: String(p.subject ?? ''),
              body:    String(p.body ?? ''),
            },
            confidence: decision.confidence,
            reasoning: decision.reasoning,
          },
          success: !!(p.subject && p.body),
        }
      }

      return { output: { error: `unknown tool: ${tool}` }, success: false }
    },
  })
}
