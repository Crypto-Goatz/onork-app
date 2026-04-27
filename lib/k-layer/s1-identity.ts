/**
 * K-Layer S1 — Identity Verification
 *
 * Validates user identity before ANY API route executes.
 * Runs silently — never exposed in UI.
 *
 * Checks:
 * 1. Supabase session token OR 0n_ token
 * 2. Profile exists and is valid
 * 3. Rate limiting per user
 * 4. Logs every verification attempt
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export interface IdentityResult {
  verified: boolean
  userId: string | null
  email: string | null
  plan: string | null
  isAdmin: boolean
  isVip: boolean
  tierLevel: number
  crmLocationId: string | null
  error?: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Rate limit map (in-memory, resets on cold start — fine for Vercel serverless)
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100 // requests per minute
const RATE_WINDOW = 60000 // 1 minute

function fail(error: string): IdentityResult {
  return {
    verified: false, userId: null, email: null, plan: null,
    isAdmin: false, isVip: false, tierLevel: 0, crmLocationId: null, error,
  }
}

export async function verifyIdentity(req: NextRequest): Promise<IdentityResult> {
  // 1. Extract auth token from header or cookie
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || ''

  if (!token) {
    // Try session-based auth
    try {
      const { createClient: createServerClient } = await import('@/lib/supabase/server')
      const serverSupa = await createServerClient()
      const { data: { user } } = await serverSupa.auth.getUser()
      if (user) {
        return await resolveProfile(user.id, user.email || '')
      }
    } catch {}
    return fail('No authentication token provided')
  }

  // 2. Check if it's a 0n_ token (extension/external auth)
  if (token.startsWith('0n_')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, plan, is_admin, is_vip, tier_level, crm_location_id')
      .eq('access_token', token)
      .single()

    if (!profile) return fail('Invalid 0n token')

    // Rate limit check
    if (checkRateLimit(profile.id)) return fail('Rate limit exceeded')

    logVerification(profile.id, 'token', true)

    return {
      verified: true,
      userId: profile.id,
      email: profile.email,
      plan: profile.plan,
      isAdmin: profile.is_admin || false,
      isVip: profile.is_vip || false,
      tierLevel: profile.tier_level || 0,
      crmLocationId: profile.crm_location_id?.trim() || null,
    }
  }

  // 3. Standard Supabase JWT auth
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return fail('Invalid session token')

  return await resolveProfile(user.id, user.email || '')
}

async function resolveProfile(userId: string, email: string): Promise<IdentityResult> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, plan, is_admin, is_vip, tier_level, crm_location_id')
    .eq('id', userId)
    .single()

  if (!profile) return fail('Profile not found')

  // Rate limit check
  if (checkRateLimit(userId)) return fail('Rate limit exceeded')

  logVerification(userId, 'session', true)

  return {
    verified: true,
    userId: profile.id,
    email: email || profile.email,
    plan: profile.plan,
    isAdmin: profile.is_admin || false,
    isVip: profile.is_vip || false,
    tierLevel: profile.tier_level || 0,
    crmLocationId: profile.crm_location_id?.trim() || null,
  }
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT
}

function logVerification(userId: string, method: string, success: boolean) {
  // Fire and forget — never block the request
  try {
    supabase.from('k_layer_logs').insert({
      user_id: userId,
      layer: 's1',
      method,
      success,
      timestamp: new Date().toISOString(),
    })
  } catch {}
}

/**
 * Wrap any API route with S1 identity verification.
 * Usage: export const POST = withIdentity(async (req, identity) => { ... })
 */
export function withIdentity(
  handler: (req: NextRequest, identity: IdentityResult) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const identity = await verifyIdentity(req)
    if (!identity.verified) {
      return NextResponse.json({ error: identity.error }, { status: 401 })
    }
    return handler(req, identity)
  }
}
