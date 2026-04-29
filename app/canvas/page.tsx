/**
 * /canvas — the free user's home. Tldraw + Jaxx chat + block library.
 * No dashboard chrome. White theme. Full bleed.
 */

import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import CanvasShell from '@/components/canvas/CanvasShell'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function CanvasPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/canvas')

  // Find the user's most recent canvas, or seed one from the starter template
  const sb = admin()
  let { data: flow } = await sb
    .from('canvas_flows')
    .select('id, name')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!flow) {
    const { data: tpl } = await sb
      .from('canvas_templates')
      .select('name, blocks, edges')
      .eq('slug', 'starter')
      .maybeSingle()
    const { data: created, error } = await sb
      .from('canvas_flows')
      .insert({
        user_id: user.id,
        name: tpl?.name ?? 'My first canvas',
        blocks: tpl?.blocks ?? [],
        edges: tpl?.edges ?? [],
      })
      .select('id, name')
      .single()
    if (error) throw new Error(`failed to create canvas: ${error.message}`)
    flow = created
  }

  return <CanvasShell flowId={flow.id} initialName={flow.name} />
}
