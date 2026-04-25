/**
 * Server-side auth + location resolver.
 *
 * EVERY API route that needs a user or location should call this.
 * It resolves the user from the Supabase session and their CRM location
 * from the profiles table. One function, never loses context.
 *
 * Usage in any API route:
 *   const ctx = await getAuthContext()
 *   if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   // ctx.userId, ctx.locationId, ctx.email, ctx.tierLevel are all available
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface AuthContext {
  userId: string
  email: string
  locationId: string
  tierLevel: number
  businessName: string
  fullName: string
  hasLocation: boolean
}

/**
 * Get authenticated user + their CRM location from session.
 * Returns null if not authenticated.
 *
 * Location resolution order:
 * 1. x-location-id header (client explicitly sends it)
 * 2. profiles.crm_location_id (stored on the user's profile)
 *
 * This ensures the location is NEVER lost, regardless of how the page calls the API.
 */
export async function getAuthContext(request?: Request): Promise<AuthContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await admin
    .from('profiles')
    .select('crm_location_id, tier_level, business_name, full_name, email')
    .eq('id', user.id)
    .single()

  // Location: header override > profile > empty
  const headerLocation = request?.headers?.get('x-location-id') || ''
  const resolvedLocation = headerLocation || profile?.crm_location_id || ''

  return {
    userId: user.id,
    email: profile?.email || user.email || '',
    locationId: resolvedLocation,
    tierLevel: profile?.tier_level || 0,
    businessName: profile?.business_name || '',
    fullName: profile?.full_name || '',
    hasLocation: !!resolvedLocation,
  }
}

/**
 * Get auth context OR return an unauthorized response.
 * Shorthand for the most common pattern in API routes.
 */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) throw new AuthError('Unauthorized', 401)
  return ctx
}

/**
 * Get auth context with CRM location required.
 * Returns helpful error message if location is missing.
 */
export async function requireLocation(): Promise<AuthContext> {
  const ctx = await requireAuth()
  if (!ctx.hasLocation) {
    throw new AuthError('CRM not connected. Go to Settings to connect your CRM location.', 400)
  }
  return ctx
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
