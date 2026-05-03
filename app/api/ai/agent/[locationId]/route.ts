/**
 * /api/ai/agent/[locationId] — agent CRUD.
 *
 *   GET    → returns the agent profile (creates an empty row on first read).
 *   PATCH  → upserts the K-Layer fields (brand, services, FAQ, etc.).
 *
 * Spec: docs/0ncore-ai-agent-architecture.md
 */

import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getOrCreateAgent, upsertAgent, type AgentPatch } from '@/lib/ai/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STRING_FIELDS = [
  'agent_name',
  'brand_tone',
  'business_name',
  'business_address',
  'business_phone',
  'business_website',
  'business_hours',
  'booking_url',
] as const

const JSONB_FIELDS = [
  'brand_phrases',
  'brand_avoid',
  'services',
  'pricing',
  'faq',
  'competitors',
] as const

type StringField = typeof STRING_FIELDS[number]
type JsonField = typeof JSONB_FIELDS[number]

function pickPatch(input: Record<string, unknown>): AgentPatch {
  const patch: Record<string, unknown> = {}
  for (const field of STRING_FIELDS) {
    if (field in input) {
      const v = input[field]
      if (v === null || typeof v === 'string') patch[field as StringField] = v
    }
  }
  for (const field of JSONB_FIELDS) {
    if (field in input) {
      const v = input[field]
      if (Array.isArray(v) || (v && typeof v === 'object')) patch[field as JsonField] = v
    }
  }
  if ('onboarding_completed' in input && typeof input.onboarding_completed === 'boolean') {
    patch.onboarding_completed = input.onboarding_completed
  }
  return patch as AgentPatch
}

export async function GET(_req: Request, ctx: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await ctx.params
  if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agent = await getOrCreateAgent(locationId)
  return NextResponse.json({ agent })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await ctx.params
  if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const patch = pickPatch(body)
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no recognized fields in patch' }, { status: 400 })
  }

  const agent = await upsertAgent(locationId, patch)
  return NextResponse.json({ agent })
}
