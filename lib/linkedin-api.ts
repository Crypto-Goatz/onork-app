/**
 * LinkedIn API — Post and engage using the user's own OAuth token.
 *
 * Users connect LinkedIn via /api/auth/connect/linkedin
 * Token stored in user_connections table
 * This module reads that token and posts on their behalf
 *
 * LinkedIn API v2:
 * - POST /ugcPosts — create a post (deprecated but still works)
 * - POST /posts — new Posts API (v2, recommended)
 * - GET /me — get user profile
 * - GET /socialActions — get engagement metrics
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const LI_API = 'https://api.linkedin.com/v2'
const LI_REST = 'https://api.linkedin.com/rest'

interface LinkedInConnection {
  access_token: string
  provider_account_id: string
  provider_name: string | null
  metadata: Record<string, unknown> | null
}

/**
 * Get user's LinkedIn connection from user_connections table.
 */
export async function getLinkedInConnection(userId: string): Promise<LinkedInConnection | null> {
  const { data } = await supabase
    .from('user_connections')
    .select('access_token, provider_account_id, provider_name, metadata')
    .eq('user_id', userId)
    .eq('provider', 'linkedin')
    .eq('status', 'active')
    .single()

  return data as LinkedInConnection | null
}

/**
 * Get the user's LinkedIn person URN (needed for posting).
 */
export async function getLinkedInUrn(userId: string): Promise<string | null> {
  const conn = await getLinkedInConnection(userId)
  if (!conn) return null

  // If we already have the URN stored in metadata
  if (conn.metadata?.linkedin_urn) return conn.metadata.linkedin_urn as string

  // Fetch from LinkedIn API
  try {
    const res = await fetch(`${LI_API}/userinfo`, {
      headers: { Authorization: `Bearer ${conn.access_token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const sub = data.sub // LinkedIn user ID

    if (sub) {
      const urn = `urn:li:person:${sub}`
      // Cache the URN in metadata
      await supabase
        .from('user_connections')
        .update({ metadata: { ...(conn.metadata || {}), linkedin_urn: urn, linkedin_sub: sub } })
        .eq('user_id', userId)
        .eq('provider', 'linkedin')

      return urn
    }
  } catch (err) {
    console.error('[linkedin-api] Failed to get URN:', err)
  }

  return null
}

/**
 * Post to LinkedIn using the user's OAuth token.
 * Uses the LinkedIn Posts API (v2).
 */
export async function postToLinkedIn(
  userId: string,
  text: string,
  options?: { visibility?: 'PUBLIC' | 'CONNECTIONS'; mediaUrl?: string },
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const conn = await getLinkedInConnection(userId)
  if (!conn) return { success: false, error: 'LinkedIn not connected. Go to Settings → Connected Accounts.' }

  const urn = await getLinkedInUrn(userId)
  if (!urn) return { success: false, error: 'Could not resolve LinkedIn profile. Try reconnecting.' }

  try {
    // LinkedIn Posts API (REST v2)
    const postBody: Record<string, unknown> = {
      author: urn,
      commentary: text,
      visibility: options?.visibility || 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }

    const res = await fetch(`${LI_REST}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401',
      },
      body: JSON.stringify(postBody),
    })

    if (res.ok || res.status === 201) {
      // LinkedIn returns the post ID in the x-restli-id header
      const postId = res.headers.get('x-restli-id') || res.headers.get('x-linkedin-id') || ''
      return { success: true, postId }
    }

    const errBody = await res.text()
    console.error(`[linkedin-api] Post failed: ${res.status}`, errBody)

    // If 401, mark connection as expired
    if (res.status === 401) {
      await supabase
        .from('user_connections')
        .update({ status: 'expired', health_status: 'unhealthy', last_error: 'Token expired' })
        .eq('user_id', userId)
        .eq('provider', 'linkedin')
      return { success: false, error: 'LinkedIn token expired. Please reconnect in Settings.' }
    }

    return { success: false, error: `LinkedIn API error: ${res.status} — ${errBody.slice(0, 200)}` }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * Check if user has LinkedIn connected and ready to post.
 */
export async function isLinkedInReady(userId: string): Promise<{
  connected: boolean
  name: string | null
  error?: string
}> {
  const conn = await getLinkedInConnection(userId)
  if (!conn) return { connected: false, name: null, error: 'Not connected' }
  return { connected: true, name: conn.provider_name }
}
