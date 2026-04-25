/**
 * CRM SDK Wrapper — uses @gohighlevel/api-client for reliable API access.
 *
 * This replaces raw fetch() calls with the official SDK.
 * The SDK handles:
 * - Token management (PIT + OAuth)
 * - Auto-refresh on expiry
 * - Rate limiting
 * - Proper error handling
 * - Type safety
 *
 * Usage:
 *   const client = await getCrmClient(locationId)
 *   const contacts = await client.contacts.search({ locationId, query: 'Sarah' })
 */

import { HighLevel, MemorySessionStorage } from '@gohighlevel/api-client'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// PIT token resolution (same logic as before)
function getPitForLocation(locationId: string): string {
  const onCorePit = process.env.CRM_PIT_ONCORE || process.env.CRM_PIT_RAW
  const pits: Record<string, string | undefined> = {
    '6MSqx0trfxgLxeHBJE1k': process.env.CRM_PIT_ROCKETOPP,
    'nphConTwfHcVE1oA0uep': onCorePit,
    'AZLSL7r6X2tDV1A48Yrb': process.env.CRM_PIT_FAIRICE || process.env.CRM_AGENCY_PIT_NEW,
  }
  return pits[locationId] || process.env.CRM_AGENCY_PIT_NEW || onCorePit || process.env.CRM_PIT_ROCKETOPP || process.env.CRM_PIT || ''
}

// Cache clients per location to avoid re-init
const clientCache = new Map<string, { client: HighLevel; createdAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get a configured CRM SDK client for a location.
 * Tries OAuth install first, falls back to PIT.
 */
export async function getCrmClient(locationId: string): Promise<HighLevel> {
  // Check cache
  const cached = clientCache.get(locationId)
  if (cached && Date.now() - cached.createdAt < CACHE_TTL) {
    return cached.client
  }

  const clientId = process.env.CRM_MARKETPLACE_APP_CLIENT_ID || process.env.CRM_MARKETPLACE_CLIENT_ID || ''
  const clientSecret = process.env.CRM_MARKETPLACE_CLIENT_SECRET || ''

  const client = new HighLevel({
    clientId,
    clientSecret,
    apiVersion: '2021-07-28',
    sessionStorage: new MemorySessionStorage(),
  })

  // Try OAuth install first
  const admin = getAdmin()
  const { data: install } = await admin
    .from('crm_installations')
    .select('access_token, refresh_token, expires_at')
    .eq('location_id', locationId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (install?.access_token) {
    // Set OAuth token
    try {
      await client.setPrivateIntegrationToken(install.access_token)
    } catch {
      // Fallback to PIT if SDK method fails
      const pit = getPitForLocation(locationId)
      if (pit) await client.setPrivateIntegrationToken(pit)
    }
  } else {
    // Use PIT
    const pit = getPitForLocation(locationId)
    if (pit) {
      await client.setPrivateIntegrationToken(pit)
    }
  }

  clientCache.set(locationId, { client, createdAt: Date.now() })
  return client
}

/**
 * Get the CRM client for a user (resolves their location automatically).
 */
export async function getCrmClientForUser(userId: string): Promise<{ client: HighLevel; locationId: string } | null> {
  const admin = getAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('crm_location_id')
    .eq('id', userId)
    .single()

  if (!profile?.crm_location_id) return null

  const client = await getCrmClient(profile.crm_location_id)
  return { client, locationId: profile.crm_location_id }
}

/**
 * Quick helper — get contacts for a location.
 */
export async function searchContacts(locationId: string, query?: string, limit = 20) {
  const client = await getCrmClient(locationId)
  try {
    const res = await client.contacts.search({
      locationId,
      query: query || '',
      limit,
    } as Record<string, unknown>)
    return res
  } catch (err) {
    console.error('[crm-sdk] searchContacts error:', err)
    throw err
  }
}

/**
 * Quick helper — get pipelines for a location.
 */
export async function getPipelines(locationId: string) {
  const client = await getCrmClient(locationId)
  try {
    const res = await client.opportunities.pipelines({ locationId } as Record<string, unknown>)
    return res
  } catch (err) {
    console.error('[crm-sdk] getPipelines error:', err)
    throw err
  }
}

/**
 * Quick helper — get conversations.
 */
export async function getConversations(locationId: string, limit = 20) {
  const client = await getCrmClient(locationId)
  try {
    const res = await client.conversations.search({ locationId, limit } as Record<string, unknown>)
    return res
  } catch (err) {
    console.error('[crm-sdk] getConversations error:', err)
    throw err
  }
}
