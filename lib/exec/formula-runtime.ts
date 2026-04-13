import { createClient } from '@supabase/supabase-js'
import { computeScore, type VariableDefinition } from './formula-engine'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function scoreContact(contactId: string): Promise<void> {
  const supabase = db()

  const { data: contact } = await supabase
    .from('exec_contacts')
    .select('*, exec_orbits!inner(*, exec_formulas(*))')
    .eq('id', contactId)
    .single()

  if (!contact) return

  const orbit = (contact as Record<string, unknown>).exec_orbits as Record<string, unknown>
  const formula = orbit?.exec_formulas as Record<string, unknown>
  if (!orbit || !formula?.formula_json) return

  const { data: varDefs } = await supabase
    .from('exec_variables')
    .select('*')
    .or(`is_system.eq.true,onmcp_user_id.eq.${contact.onmcp_user_id}`)

  const varDefMap: Record<string, VariableDefinition> = {}
  for (const v of (varDefs || [])) {
    varDefMap[v.key] = v as VariableDefinition
  }

  const result = computeScore(
    formula.formula_json as Parameters<typeof computeScore>[0],
    contact.variable_values || {},
    varDefMap,
    { critical: formula.threshold_critical as number, review: formula.threshold_review as number, monitor: formula.threshold_monitor as number }
  )

  const previousScore = contact.current_score
  const delta = result.score - previousScore

  await supabase.from('exec_contacts').update({
    current_score: result.score,
    score_band: result.band,
    score_breakdown: result.breakdown,
  }).eq('id', contactId)

  if (delta !== 0) {
    await supabase.from('exec_score_history').insert({
      contact_id: contactId,
      orbit_id: orbit.id as string,
      onmcp_user_id: contact.onmcp_user_id,
      score: result.score,
      score_band: result.band,
      score_delta: delta,
      trigger_event: 'variable_update',
      variable_values: contact.variable_values,
      formula_id: formula.id as string,
    })
  }

  await refreshOrbitStats(orbit.id as string)
  await checkFlags(contact, result, previousScore)
}

async function refreshOrbitStats(orbitId: string) {
  const supabase = db()
  const { data: contacts } = await supabase
    .from('exec_contacts')
    .select('current_score, score_band')
    .eq('orbit_id', orbitId)

  if (!contacts?.length) return
  const avg = Math.round(contacts.reduce((s, c) => s + c.current_score, 0) / contacts.length)
  const critical = contacts.filter(c => c.score_band === 'CRITICAL').length

  await supabase.from('exec_orbits').update({
    contact_count: contacts.length, avg_score: avg, critical_count: critical,
  }).eq('id', orbitId)
}

async function checkFlags(contact: Record<string, unknown>, result: { score: number; band: string }, previousScore: number) {
  const supabase = db()
  let shouldFlag = false
  let flagReason = ''
  let flagSeverity: 'critical' | 'warning' | 'info' = 'info'

  if (result.band === 'CRITICAL') {
    shouldFlag = true
    flagReason = `Score ${result.score} — below critical threshold`
    flagSeverity = 'critical'
  } else if (result.score < previousScore - 10) {
    shouldFlag = true
    flagReason = `Score dropped ${previousScore - result.score} points`
    flagSeverity = 'warning'
  }

  if (shouldFlag !== contact.is_flagged || flagReason !== contact.flag_reason) {
    await supabase.from('exec_contacts').update({
      is_flagged: shouldFlag, flag_reason: flagReason, flag_severity: flagSeverity,
    }).eq('id', contact.id)
  }
}
