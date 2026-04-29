/**
 * POST /api/canvas/ai-build
 *
 * Body: { prompt: string }
 *
 * Groq decides which blocks to materialize on the canvas. Returns:
 *   { message: string, flow: { blocks: Array<{ type, label, x, y }> } }
 *
 * Auth: Supabase session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { groqJSON } from '@/lib/service-packager/groq'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const KNOWN_BLOCKS = [
  'contacts','pipeline','calendar','invoices',
  'send_email','post_linkedin',
  'ai_compose','ai_summarize',
  'filter','stat_card','note',
] as const

type BlockType = typeof KNOWN_BLOCKS[number]

interface BlockSpec { type: BlockType; label: string; x: number; y: number }
interface Plan      { message: string; blocks: BlockSpec[] }

const SYSTEM = `You are Jaxx, the canvas builder. Given a user request, output a small flow of blocks that materializes on a 2D canvas.

Available block types: ${KNOWN_BLOCKS.join(', ')}.

Layout rules:
- 1-5 blocks per response. Keep it tight.
- Position blocks left to right with x increasing by 280, starting at 200.
- All on the same row (y = 240) unless a clear branch.
- Each block has a short, human label (≤32 chars) describing its job in this flow.

Output ONLY valid JSON: { "message": "<one sentence to the user>", "blocks": [{ "type": "<one of the known blocks>", "label": "<≤32 chars>", "x": <number>, "y": <number> }] }`

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { prompt?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }
  const prompt = body.prompt?.trim()
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  let plan: Plan
  try {
    plan = await groqJSON<Plan>(SYSTEM, prompt, { temperature: 0.4, maxTokens: 800 })
  } catch (err) {
    return NextResponse.json(
      { error: `build failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }

  // Sanitize: drop any unknown block types Groq invented
  const blocks = (plan.blocks ?? [])
    .filter((b) => KNOWN_BLOCKS.includes(b.type))
    .slice(0, 8)

  return NextResponse.json({
    message: plan.message ?? 'Here you go.',
    flow: { blocks },
  })
}
