/**
 * GET  /api/admin/truth   — full audit, returns per-add-on status + reasons
 * POST /api/admin/truth   — writes a fresh truth_audit row per add-on
 *
 * Auth: admin only (verifyAdmin).
 *
 * Logic mirrors scripts/truth-lint.mjs but adds runtime data checks:
 *   - file-level: required imports, prohibited imports, required calls
 *   - data-level: outcomes_24h, outcomes_7d, success_rate from brain_outcomes
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/admin-gate'
import { BRAIN_REGISTRY, type RegistryEntry } from '@/lib/brain/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AuditResult extends RegistryEntry {
  status: 'green' | 'yellow' | 'red'
  brain_wired: boolean
  groq_only: boolean
  has_outcomes: boolean
  outcomes_24h: number
  outcomes_7d: number
  success_rate: number
  reasons: string[]
  checked_at: string
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function fileCheck(entry: RegistryEntry): { reasons: string[]; brain_wired: boolean; groq_only: boolean } {
  const reasons: string[] = []
  let brain_wired = false
  let groq_only = true

  if (entry.category !== 'ai') {
    return { reasons, brain_wired: true, groq_only: true }
  }

  const root = process.cwd()
  const handler_paths = entry.handler_paths ?? []

  if (!handler_paths.length) {
    reasons.push('category=ai but no handler_paths declared')
    return { reasons, brain_wired: false, groq_only: false }
  }

  let allHavePath = true
  let allHaveBrain = true

  for (const path of handler_paths) {
    const abs = join(root, path)
    if (!existsSync(abs)) {
      reasons.push(`handler missing: ${path}`)
      allHavePath = false
      allHaveBrain = false
      continue
    }
    const src = readFileSync(abs, 'utf8')

    let hasBrainImport = false
    for (const imp of entry.required_imports ?? []) {
      if (src.includes(`from '${imp}'`) || src.includes(`from "${imp}"`)) {
        if (imp.includes('lib/brain')) hasBrainImport = true
      } else {
        reasons.push(`${path}: missing required import "${imp}"`)
        allHaveBrain = false
      }
    }
    if (!hasBrainImport) allHaveBrain = false

    for (const imp of entry.prohibited_imports ?? []) {
      if (src.includes(`from '${imp}'`) || src.includes(`from "${imp}"`)) {
        reasons.push(`${path}: contains prohibited import "${imp}" (Groq-only rule)`)
        groq_only = false
      }
    }

    for (const call of entry.required_calls ?? []) {
      if (!src.includes(call)) {
        reasons.push(`${path}: missing required call "${call}"`)
        allHaveBrain = false
      }
    }
  }

  brain_wired = allHavePath && allHaveBrain
  return { reasons, brain_wired, groq_only }
}

async function dataCheck(slug: string): Promise<{ has_outcomes: boolean; outcomes_24h: number; outcomes_7d: number; success_rate: number }> {
  const sb = admin()
  const day = new Date(Date.now() - 86400_000).toISOString()
  const week = new Date(Date.now() - 7 * 86400_000).toISOString()

  const [{ count: c24 }, { count: c7 }, { data: rows }] = await Promise.all([
    sb.from('brain_outcomes').select('*', { count: 'exact', head: true }).eq('app_slug', slug).gte('created_at', day),
    sb.from('brain_outcomes').select('*', { count: 'exact', head: true }).eq('app_slug', slug).gte('created_at', week),
    sb.from('brain_outcomes').select('success').eq('app_slug', slug).gte('created_at', week),
  ])

  const outcomes_24h = c24 ?? 0
  const outcomes_7d = c7 ?? 0
  const successes = (rows ?? []).filter((r: { success: boolean }) => r.success).length
  const total = rows?.length ?? 0
  const success_rate = total > 0 ? Math.round((successes / total) * 100) : 0

  return { has_outcomes: outcomes_7d > 0, outcomes_24h, outcomes_7d, success_rate }
}

function statusOf(brain_wired: boolean, groq_only: boolean, has_outcomes: boolean, category: string): 'green' | 'yellow' | 'red' {
  if (category !== 'ai') return 'green'
  if (!brain_wired || !groq_only) return 'red'
  if (!has_outcomes) return 'yellow'
  return 'green'
}

async function audit(): Promise<AuditResult[]> {
  const out: AuditResult[] = []
  for (const entry of BRAIN_REGISTRY) {
    const file = fileCheck(entry)
    const data = entry.category === 'ai'
      ? await dataCheck(entry.slug)
      : { has_outcomes: true, outcomes_24h: 0, outcomes_7d: 0, success_rate: 0 }
    const status = statusOf(file.brain_wired, file.groq_only, data.has_outcomes, entry.category)
    out.push({
      ...entry,
      status,
      brain_wired: file.brain_wired,
      groq_only: file.groq_only,
      has_outcomes: data.has_outcomes,
      outcomes_24h: data.outcomes_24h,
      outcomes_7d: data.outcomes_7d,
      success_rate: data.success_rate,
      reasons: file.reasons,
      checked_at: new Date().toISOString(),
    })
  }
  return out
}

export async function GET() {
  const gate = await verifyAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error ?? 'Forbidden' }, { status: 403 })

  const results = await audit()

  // Lightweight summary numbers for the dashboard hero card
  const ai = results.filter((r) => r.category === 'ai')
  const summary = {
    total: BRAIN_REGISTRY.length,
    ai_count: ai.length,
    green: ai.filter((r) => r.status === 'green').length,
    yellow: ai.filter((r) => r.status === 'yellow').length,
    red: ai.filter((r) => r.status === 'red').length,
    truth_score: ai.length > 0
      ? Math.round((ai.filter((r) => r.status === 'green').length / ai.length) * 100)
      : 100,
  }

  return NextResponse.json({ summary, results })
}

export async function POST(_req: NextRequest) {
  const gate = await verifyAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error ?? 'Forbidden' }, { status: 403 })

  const results = await audit()

  // Persist a fresh audit row per add-on for historical tracking
  const sb = admin()
  const rows = results.map((r) => ({
    app_slug: r.slug,
    status: r.status,
    category: r.category,
    brain_wired: r.brain_wired,
    groq_only: r.groq_only,
    has_outcomes: r.has_outcomes,
    outcomes_24h: r.outcomes_24h,
    outcomes_7d: r.outcomes_7d,
    success_rate: r.success_rate,
    reasons: r.reasons,
    handler_paths: r.handler_paths ?? [],
  }))
  if (rows.length) await sb.from('truth_audit').insert(rows)

  const ai = results.filter((r) => r.category === 'ai')
  return NextResponse.json({
    ok: true,
    persisted: rows.length,
    summary: {
      total: BRAIN_REGISTRY.length,
      ai_count: ai.length,
      green: ai.filter((r) => r.status === 'green').length,
      yellow: ai.filter((r) => r.status === 'yellow').length,
      red: ai.filter((r) => r.status === 'red').length,
    },
  })
}
