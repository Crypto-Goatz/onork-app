/**
 * Jaxx Security Primitives
 *
 * - verifyMarketplaceHmac: constant-time HMAC verify against
 *   CRM_MARKETPLACE_SHARED_SECRET on every webhook.
 *
 * - resolveIdentities: splits actor (the location owner whose perms drive
 *   action authorization) from subject (the contact who sent the message).
 *   A contact NEVER inherits actor permissions just by messaging.
 *
 * - checkRateLimit: per-location daily cap + per-contact hourly cap.
 *   Atomic increment via upsert.
 */

import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─────────────────────────────────────────────────────────────────────────
// HMAC verification
// ─────────────────────────────────────────────────────────────────────────

export interface HmacVerifyArgs {
  rawBody: string
  signature: string | null
  secret?: string // override; defaults to env
}

export function verifyMarketplaceHmac({ rawBody, signature, secret }: HmacVerifyArgs): boolean {
  const sharedSecret = secret || process.env.CRM_MARKETPLACE_SHARED_SECRET || ''
  if (!sharedSecret || !signature) return false

  const expected = crypto.createHmac('sha256', sharedSecret).update(rawBody).digest('hex')

  // Strip common prefixes some senders add ("sha256=...")
  const provided = signature.replace(/^sha256=/, '').trim().toLowerCase()
  const expectedHex = expected.toLowerCase()

  if (provided.length !== expectedHex.length) return false

  try {
    return crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expectedHex, 'hex'))
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Identity resolution
// ─────────────────────────────────────────────────────────────────────────

export interface ResolvedIdentities {
  // Subject — who Jaxx is talking to (the messager)
  subject: {
    contactId: string | null
    name: string | null
    email: string | null
    tags: string[]
    linkedUserId: string | null // if this contact is also a 0nCore user
  }
  // Actor — whose permissions Jaxx operates under
  actor: {
    userId: string | null
    locationId: string
    plan: string | null
  }
  // Crucial: when subject !== actor, Jaxx is in low-trust mode.
  // A contact never escalates to actor unless IKY explicitly verifies.
  isLowTrust: boolean
  // Source of truth for routing — caller passed locationId, we hydrated everything from it.
  locationId: string
}

export interface ResolveArgs {
  locationId: string
  contactId?: string | null
  contactSnapshot?: { name?: string; email?: string; tags?: string[] } | null
}

export async function resolveIdentities({
  locationId,
  contactId,
  contactSnapshot,
}: ResolveArgs): Promise<ResolvedIdentities> {
  const sb = admin()

  // Find the actor (the 0nCore user who owns this location)
  let actorUserId: string | null = null
  let actorPlan: string | null = null
  {
    const { data: profile } = await sb
      .from('profiles')
      .select('id, plan')
      .eq('crm_location_id', locationId)
      .maybeSingle()
    if (profile) {
      actorUserId = profile.id
      actorPlan = (profile as { plan?: string }).plan ?? null
    }
  }

  // Try to link the contact to a 0nCore user (only if contact email matches a registered user)
  let linkedUserId: string | null = null
  let resolvedName: string | null = contactSnapshot?.name ?? null
  let resolvedEmail: string | null = contactSnapshot?.email ?? null
  const tags: string[] = contactSnapshot?.tags ?? []

  if (resolvedEmail) {
    const { data: linked } = await sb
      .from('profiles')
      .select('id')
      .eq('email', resolvedEmail)
      .maybeSingle()
    if (linked) linkedUserId = linked.id
  }

  // Low-trust if contact is not the actor (i.e., subject is some other contact in the CRM)
  const isLowTrust = !linkedUserId || linkedUserId !== actorUserId

  return {
    subject: {
      contactId: contactId ?? null,
      name: resolvedName,
      email: resolvedEmail,
      tags,
      linkedUserId,
    },
    actor: {
      userId: actorUserId,
      locationId,
      plan: actorPlan,
    },
    isLowTrust,
    locationId,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Rate limits
// ─────────────────────────────────────────────────────────────────────────

export interface RateLimitArgs {
  locationId: string
  contactId?: string | null
  dailyCap?: number
  hourlyCap?: number
}

export interface RateLimitResult {
  allowed: boolean
  reason?: 'location_daily' | 'contact_hourly'
  counts: { locationDaily: number; contactHourly: number }
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD UTC
}

function hourKey(d = new Date()): string {
  return d.toISOString().slice(0, 13) // YYYY-MM-DDTHH UTC
}

async function bumpBucket(
  locationId: string,
  contactId: string | null,
  bucket: 'location_daily' | 'contact_hourly',
  bucketKey: string
): Promise<number> {
  const sb = admin()

  // Read current
  const { data: existing } = await sb
    .from('jaxx_rate_limits')
    .select('count')
    .eq('location_id', locationId)
    .eq('contact_id', contactId ?? null)
    .eq('bucket', bucket)
    .eq('bucket_key', bucketKey)
    .maybeSingle()

  const next = (existing?.count ?? 0) + 1

  await sb.from('jaxx_rate_limits').upsert(
    {
      location_id: locationId,
      contact_id: contactId,
      bucket,
      bucket_key: bucketKey,
      count: next,
    },
    { onConflict: 'location_id,contact_id,bucket,bucket_key' }
  )

  return next
}

export async function checkRateLimit({
  locationId,
  contactId,
  dailyCap = 500,
  hourlyCap = 30,
}: RateLimitArgs): Promise<RateLimitResult> {
  const dailyCount = await bumpBucket(locationId, null, 'location_daily', dayKey())

  if (dailyCount > dailyCap) {
    return {
      allowed: false,
      reason: 'location_daily',
      counts: { locationDaily: dailyCount, contactHourly: 0 },
    }
  }

  let hourlyCount = 0
  if (contactId) {
    hourlyCount = await bumpBucket(locationId, contactId, 'contact_hourly', hourKey())
    if (hourlyCount > hourlyCap) {
      return {
        allowed: false,
        reason: 'contact_hourly',
        counts: { locationDaily: dailyCount, contactHourly: hourlyCount },
      }
    }
  }

  return {
    allowed: true,
    counts: { locationDaily: dailyCount, contactHourly: hourlyCount },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Config loader (with sane defaults if no row yet)
// ─────────────────────────────────────────────────────────────────────────

export interface JaxxConfig {
  enabled: boolean
  allowed_actions: string[]
  automation_can_generate: boolean
  automation_can_test: boolean
  automation_can_activate: boolean
  automation_can_run: boolean
  auto_execute: boolean
  business_hours_only: boolean
  business_hours_start: string
  business_hours_end: string
  business_hours_tz: string
  excluded_tags: string[]
  max_actions_per_conversation: number
  daily_message_cap: number
  per_contact_hourly_cap: number
  system_prompt_override: string | null
}

const DEFAULT_CONFIG: JaxxConfig = {
  enabled: true,
  allowed_actions: ['knowledge'],
  automation_can_generate: false,
  automation_can_test: false,
  automation_can_activate: false,
  automation_can_run: false,
  auto_execute: false,
  business_hours_only: false,
  business_hours_start: '08:00',
  business_hours_end: '20:00',
  business_hours_tz: 'America/New_York',
  excluded_tags: [],
  max_actions_per_conversation: 10,
  daily_message_cap: 500,
  per_contact_hourly_cap: 30,
  system_prompt_override: null,
}

export async function loadConfig(locationId: string): Promise<JaxxConfig> {
  const { data } = await admin()
    .from('conversation_ai_config')
    .select('*')
    .eq('location_id', locationId)
    .maybeSingle()

  if (!data) return DEFAULT_CONFIG

  return {
    enabled: data.enabled ?? true,
    allowed_actions: data.allowed_actions ?? ['knowledge'],
    automation_can_generate: data.automation_can_generate ?? false,
    automation_can_test: data.automation_can_test ?? false,
    automation_can_activate: data.automation_can_activate ?? false,
    automation_can_run: data.automation_can_run ?? false,
    auto_execute: data.auto_execute ?? false,
    business_hours_only: data.business_hours_only ?? false,
    business_hours_start: data.business_hours_start ?? '08:00',
    business_hours_end: data.business_hours_end ?? '20:00',
    business_hours_tz: data.business_hours_tz ?? 'America/New_York',
    excluded_tags: data.excluded_tags ?? [],
    max_actions_per_conversation: data.max_actions_per_conversation ?? 10,
    daily_message_cap: data.daily_message_cap ?? 500,
    per_contact_hourly_cap: data.per_contact_hourly_cap ?? 30,
    system_prompt_override: data.system_prompt_override ?? null,
  }
}
