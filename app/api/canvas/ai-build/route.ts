/**
 * POST /api/canvas/ai-build
 *
 * Body: { prompt: string }
 *
 * Groq decides which blocks to materialize on the canvas. Returns:
 *   { message, flow: { blocks: [...], edges: [...] } }
 *
 * Each block has a stable id Groq assigns. Edges reference blocks by id
 * so the canvas can draw tldraw arrows between them.
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

interface BlockSpec { id: string; type: BlockType; label: string; x: number; y: number }
interface EdgeSpec  { id: string; source: string; target: string }
interface Plan      { message: string; blocks: BlockSpec[]; edges?: EdgeSpec[] }

const SYSTEM = `You are Jaxx, the canvas builder. Given a user request, output a flow of blocks linked by edges that materializes on a 2D canvas.

Available block types: ${KNOWN_BLOCKS.join(', ')}.

Layout rules:
- 1-5 blocks per response. Keep it tight.
- Position blocks left to right with x increasing by 280, starting at x=200, y=240.
- Same row unless a clear branch.
- Each block has a short, human label (≤32 chars) describing its job in this flow.
- Each block needs a unique id like "n1", "n2", "n3".
- Edges connect blocks by their ids — almost always n1 → n2 → n3 in sequence.

Output ONLY valid JSON:
{
  "message": "<one sentence to the user>",
  "blocks": [{ "id": "n1", "type": "<one of the known blocks>", "label": "<≤32 chars>", "x": 200, "y": 240 }, ...],
  "edges":  [{ "id": "e1", "source": "n1", "target": "n2" }, ...]
}`

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
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

  // Sanitize: drop any unknown block types Groq invented + ensure each block has an id
  const blocks = (plan.blocks ?? [])
    .filter((b) => KNOWN_BLOCKS.includes(b.type))
    .slice(0, 8)
    .map((b, i) => ({ ...b, id: b.id ?? `n${i + 1}` }))

  // Keep only edges whose source AND target reference a known block id
  const validIds = new Set(blocks.map((b) => b.id))
  const edges = (plan.edges ?? [])
    .filter((e) => validIds.has(e.source) && validIds.has(e.target) && e.source !== e.target)
    .slice(0, 16)
    .map((e, i) => ({ ...e, id: e.id ?? `e${i + 1}` }))

  // Fallback: if Groq forgot edges entirely, link blocks left-to-right in order
  const finalEdges = edges.length > 0
    ? edges
    : blocks.slice(1).map((b, i) => ({
        id: `e${i + 1}`,
        source: blocks[i].id,
        target: b.id,
      }))

  return NextResponse.json({
    message: plan.message ?? 'Here you go.',
    flow: { blocks, edges: finalEdges },
  })
}
