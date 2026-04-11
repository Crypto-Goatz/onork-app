/**
 * 0nStack Domain Cache
 * Read/write detection results from Supabase stack_domain_cache table.
 * 30-day TTL — stale entries are ignored on read.
 */

import { createClient } from '@supabase/supabase-js'
import type { DetectionResult } from './detection-engine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheRow {
  domain: string
  result: Record<string, unknown> // JSONB
  scanned_at: string
  expires_at: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Supabase client (service-role for server-side cache operations)
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

function getClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABLE = 'stack_domain_cache'
const TTL_DAYS = 30
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check the cache for a domain. Returns the cached DetectionResult
 * if found and not expired, otherwise null.
 */
export async function checkCache(
  domain: string
): Promise<DetectionResult | null> {
  const supabase = getClient()
  const cleanDomain = domain.toLowerCase().trim()

  const { data, error } = await supabase
    .from(TABLE)
    .select('domain, result, scanned_at, expires_at')
    .eq('domain', cleanDomain)
    .single()

  if (error || !data) {
    return null
  }

  const row = data as CacheRow

  // Check TTL
  const expiresAt = new Date(row.expires_at).getTime()
  if (Date.now() > expiresAt) {
    // Stale — delete in background, return null
    supabase.from(TABLE).delete().eq('domain', cleanDomain).then(() => {
      // fire-and-forget cleanup
    })
    return null
  }

  // Reconstruct DetectionResult from JSONB
  return row.result as unknown as DetectionResult
}

/**
 * Write a detection result to the cache. Upserts on domain.
 */
export async function writeCache(
  domain: string,
  result: DetectionResult
): Promise<void> {
  const supabase = getClient()
  const cleanDomain = domain.toLowerCase().trim()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + TTL_MS)

  // Strip rawHTML before caching (too large for JSONB)
  const cacheable: Omit<DetectionResult, 'rawHTML'> & { rawHTML?: undefined } = {
    ...result,
    rawHTML: undefined,
  }

  const { error } = await supabase.from(TABLE).upsert(
    {
      domain: cleanDomain,
      result: cacheable as unknown as Record<string, unknown>,
      scanned_at: result.scannedAt,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
    },
    { onConflict: 'domain' }
  )

  if (error) {
    console.error(`[0nStack cache] Failed to write cache for ${cleanDomain}:`, error.message)
  }
}

/**
 * Batch check multiple domains. Returns a map of domain -> DetectionResult
 * for all cache hits.
 */
export async function checkCacheBatch(
  domains: string[]
): Promise<Map<string, DetectionResult>> {
  const supabase = getClient()
  const cleanDomains = domains.map((d) => d.toLowerCase().trim())
  const results = new Map<string, DetectionResult>()

  if (cleanDomains.length === 0) return results

  const { data, error } = await supabase
    .from(TABLE)
    .select('domain, result, expires_at')
    .in('domain', cleanDomains)

  if (error || !data) return results

  const now = Date.now()
  for (const row of data as CacheRow[]) {
    const expiresAt = new Date(row.expires_at).getTime()
    if (now <= expiresAt) {
      results.set(row.domain, row.result as unknown as DetectionResult)
    }
  }

  return results
}

/**
 * Purge expired entries from the cache. Call periodically or via cron.
 */
export async function purgeExpired(): Promise<number> {
  const supabase = getClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .lt('expires_at', now)
    .select('domain')

  if (error) {
    console.error('[0nStack cache] Purge failed:', error.message)
    return 0
  }

  return data?.length ?? 0
}
