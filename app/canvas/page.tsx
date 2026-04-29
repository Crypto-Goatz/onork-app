/**
 * /canvas — the free user's home. React Flow + Jaxx chat + block library.
 * No dashboard chrome. White theme. Full bleed.
 */

import { redirect } from 'next/navigation'
import type { Edge } from '@xyflow/react'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import CanvasShell from '@/components/canvas/CanvasShell'
import type { BlockNodeType } from '@/components/canvas/BlockNode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface FlowRow {
  id: string
  name: string
  blocks: unknown
  edges: unknown
}

/**
 * Strict shape check — only accept arrays of well-formed React Flow nodes.
 * Older rows persisted from the tldraw build will not match and we'll
 * start the user fresh rather than crash.
 */
function isBlockNode(x: unknown): x is BlockNodeType {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (typeof o.id !== 'string') return false
  if (!o.position || typeof o.position !== 'object') return false
  const p = o.position as Record<string, unknown>
  if (typeof p.x !== 'number' || typeof p.y !== 'number') return false
  if (!o.data || typeof o.data !== 'object') return false
  return true
}

function isEdge(x: unknown): x is Edge {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.source === 'string' && typeof o.target === 'string'
}

export default async function CanvasPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/canvas')

  const sb = admin()
  let { data: flow } = await sb
    .from('canvas_flows')
    .select('id, name, blocks, edges')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<FlowRow>()

  if (!flow) {
    const { data: created, error } = await sb
      .from('canvas_flows')
      .insert({ user_id: user.id, name: 'Welcome to your Canvas', blocks: [], edges: [] })
      .select('id, name, blocks, edges')
      .single<FlowRow>()
    if (error) throw new Error(`failed to create canvas: ${error.message}`)
    flow = created
  }

  const initialNodes = Array.isArray(flow.blocks) ? flow.blocks.filter(isBlockNode) : []
  const initialEdges = Array.isArray(flow.edges)  ? flow.edges.filter(isEdge)       : []

  return (
    <CanvasShell
      flowId={flow.id}
      initialName={flow.name}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
    />
  )
}
