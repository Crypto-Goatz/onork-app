/**
 * Detect & Refine — server-only Supabase admin client.
 *
 * Used by every /api/dr/* route to read and write the dr_domains, dr_events,
 * and dr_daily_stats tables. Service-role only — never import from a client
 * component.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

export function drAdmin(): SupabaseClient {
  if (cached) return cached
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  return cached
}

export type DrDomain = {
  id: string
  location_id: string
  domain: string
  site_id: string
  script_key: string
  is_active: boolean
  created_at: string
}

export type DrEventInsert = {
  site_id: string
  session_id: string
  event_type: string
  grade?: string | null
  score?: number | null
  url?: string | null
  referrer?: string | null
  ad_platform?: string | null
  click_id?: string | null
  behavioral_signals?: Record<string, unknown> | null
  user_agent?: string | null
}

/**
 * Build the install snippet for a registered site. This is what shows up in
 * the dashboard "Install Script" modal — the customer pastes it into their
 * site head.
 */
export function buildScriptTag(siteId: string, origin?: string): string {
  const base = origin ?? 'https://www.0ncore.com'
  return `<script async src="${base}/api/dr/script/${siteId}.js"></script>`
}

/**
 * site_id format: dr_<location-slug>_<6 hex>. Lowercase, alphanumeric +
 * underscores. The location prefix makes it human-recognizable in scripts.
 */
export function generateSiteId(domain: string): string {
  const slug = domain
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
  const rand = Math.random().toString(36).slice(2, 8)
  return `dr_${slug}_${rand}`
}

export function generateScriptKey(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

export function normalizeDomain(input: string): string | null {
  const trimmed = (input || '').trim().toLowerCase()
  if (!trimmed) return null
  const stripped = trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0]
  if (!DOMAIN_RE.test(stripped)) return null
  return stripped
}
