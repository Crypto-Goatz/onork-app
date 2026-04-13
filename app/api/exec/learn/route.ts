import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runLearner } from '@/lib/exec/ai-learner'

export async function POST(req: NextRequest) {
  const { formulaId, orbitId } = await req.json()
  if (!formulaId) return NextResponse.json({ error: 'formulaId required' }, { status: 400 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: outcomes } = await db.from('exec_contacts').select('*').eq('orbit_id', orbitId).not('outcome', 'is', null)
  if (!outcomes?.length) return NextResponse.json({ patterns: 0, message: 'No outcomes recorded yet' })

  const { data: formula } = await db.from('exec_formulas').select('*').eq('id', formulaId).single()
  if (!formula) return NextResponse.json({ error: 'Formula not found' }, { status: 404 })

  const fJson = formula.formula_json as { numerator?: { variable_key: string; weight: number }[]; denominator?: { variable_key: string; weight: number }[] }
  const weights: Record<string, number> = {}
  for (const v of [...(fJson.numerator || []), ...(fJson.denominator || [])]) {
    weights[v.variable_key] = v.weight
  }

  await runLearner({
    formulaId, userId: formula.onmcp_user_id || '', orbitId,
    contactCount: outcomes.length,
    outcomes: outcomes.map(c => ({
      contact_id: c.id, outcome: c.outcome,
      final_score: c.current_score,
      variable_values: c.variable_values || {},
      days_in_orbit: Math.round((Date.now() - new Date(c.created_at).getTime()) / 86400000),
    })),
    currentWeights: weights,
  })

  return NextResponse.json({ success: true })
}
