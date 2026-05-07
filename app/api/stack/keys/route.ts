import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Supabase admin client
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// Auth (session only — API keys cannot manage API keys)
// ---------------------------------------------------------------------------

async function resolveUser(): Promise<{ userId: string } | null> {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return null
  return { userId: user.id }
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

function generateApiKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `sk_${hex}`
}

async function hashKey(rawKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey))
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ---------------------------------------------------------------------------
// GET /api/stack/keys — List user's API keys
// ---------------------------------------------------------------------------

export async function GET() {
  const auth = await resolveUser()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = adminClient()
  const { data: keys, error } = await db
    .from('stack_api_keys')
    .select('id, key_prefix, label, tier, calls_today, calls_total, last_used_at, active, created_at')
    .eq('onmcp_user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch keys', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ keys: keys || [] })
}

// ---------------------------------------------------------------------------
// POST /api/stack/keys — Create a new API key
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const auth = await resolveUser()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let label = 'Default'
  try {
    const body = await req.json()
    if (body.label && typeof body.label === 'string') {
      label = body.label.slice(0, 100)
    }
  } catch {
    // No body or invalid JSON — use defaults
  }

  const db = adminClient()

  // Limit to 5 active keys per user
  const { count } = await db
    .from('stack_api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('onmcp_user_id', auth.userId)
    .eq('active', true)

  if ((count || 0) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 active API keys allowed' }, { status: 400 })
  }

  const rawKey = generateApiKey()
  const keyHash = await hashKey(rawKey)
  const keyPrefix = rawKey.slice(0, 10) + '...'

  const { data: inserted, error } = await db
    .from('stack_api_keys')
    .insert({
      onmcp_user_id: auth.userId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      label,
      tier: 'free',
      calls_today: 0,
      calls_total: 0,
      active: true,
    })
    .select('id, key_prefix, label, tier, created_at')
    .single()

  if (error || !inserted) {
    return NextResponse.json({ error: 'Failed to create key', detail: error?.message }, { status: 500 })
  }

  return NextResponse.json({
    key: rawKey, // Only shown once — never stored in plaintext
    id: inserted.id,
    prefix: inserted.key_prefix,
    label: inserted.label,
    tier: inserted.tier,
    createdAt: inserted.created_at,
    warning: 'Save this key now — it will not be shown again.',
  })
}
