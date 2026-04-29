/**
 * 0nExec — brain entry. handleThink owns the think + record loop.
 */

import { NextRequest } from 'next/server'
import { handleThink } from '@/lib/brain/think-route'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SLUG = '0nexec'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  return handleThink(req, {
    slug: SLUG,
    async execute(decision, _body, userId) {
      const tool = decision.tool
      const sb = admin()
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (process.env.INTERNAL_DISPATCH_SECRET) headers['x-internal-secret'] = process.env.INTERNAL_DISPATCH_SECRET

      if (tool === 'create_formula') {
        const { data, error } = await sb.from('exec_formulas').insert({
          onmcp_user_id: userId,
          name: decision.params.name ?? 'Untitled formula',
          description: decision.params.description ?? '',
          category: decision.params.category ?? 'custom',
          icon: '⬡',
          formula_json: {
            numerator: decision.params.numerator ?? [],
            denominator: decision.params.denominator ?? [],
            normalize: true, clamp_min: 1, clamp_max: 100,
          },
        }).select('id, name').single()
        if (error) return { output: { error: error.message }, success: false }
        return { output: { formula: data }, success: true }
      }

      if (tool === 'create_orbit') {
        const { data, error } = await sb.from('exec_orbits').insert({
          onmcp_user_id: userId,
          name: decision.params.name ?? 'New orbit',
          formula_id: decision.params.formula_id,
        }).select('id, name').single()
        if (error) return { output: { error: error.message }, success: false }
        return { output: { orbit: data }, success: true }
      }

      if (tool === 'score_contacts') {
        const r = await fetch(`${baseUrl}/api/exec/score`, {
          method: 'POST', headers,
          body: JSON.stringify({ orbitId: decision.params.orbit_id }),
        })
        return { output: await r.json().catch(() => ({})), success: r.ok }
      }

      if (tool === 'detect_patterns') {
        const r = await fetch(`${baseUrl}/api/exec/learn`, {
          method: 'POST', headers,
          body: JSON.stringify({
            formulaId: decision.params.formula_id,
            orbitId: decision.params.orbit_id,
          }),
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
