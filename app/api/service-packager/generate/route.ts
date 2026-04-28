/**
 * POST /api/service-packager/generate
 *
 * Body: { mode: 'url'|'prompt'|'mcp_registry', url?, prompt?, mcp_server?, outputs? }
 * Returns: ServicePackage with all generated outputs.
 *
 * Auth: Supabase session required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { packageService } from '@/lib/service-packager/packager'
import type { OutputKey } from '@/lib/service-packager/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 90 // Groq calls in parallel can take ~60s

interface Body {
  mode: 'url' | 'prompt' | 'mcp_registry'
  url?: string
  prompt?: string
  mcp_server?: string
  outputs?: OutputKey[]
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!['url', 'prompt', 'mcp_registry'].includes(body.mode)) {
    return NextResponse.json({ error: 'mode must be url|prompt|mcp_registry' }, { status: 400 })
  }

  try {
    const pkg = await packageService({
      mode: body.mode,
      url: body.url,
      prompt: body.prompt,
      mcp_server: body.mcp_server,
      user_id: user.id,
      outputs: body.outputs,
    })
    return NextResponse.json({ package: pkg })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
