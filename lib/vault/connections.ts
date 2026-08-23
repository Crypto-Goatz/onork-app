/**
 * 0nVault client — the ONE store for a tenant's service credentials.
 *
 * Table `on_connections` lives in the Rocket+ master database, which is NOT
 * the database 0nCore authenticates against. That is deliberate: the vault
 * outlives any single product and is read by 0nMCP (CLI) and the hosted apps
 * alike. It therefore needs its own service-role client, not the app one.
 *
 * Crypto, verified empirically against a live row (the seed script that wrote
 * these is gone, and the surviving note about the format was WRONG — it
 * claimed `iv|tag|ct` pipe-delimited, which no row uses):
 *
 *     secret_ciphertext = base64( iv[12] || authTag[16] || ciphertext )
 *     algorithm         = aes-256-gcm
 *     key               = ON_CONNECT_KEY, 32 bytes as 64 hex chars
 *     plaintext         = the .0n connection document, JSON
 *
 * Of the four (encoding x layout) combinations tried, exactly one decrypted
 * and three threw — that failure is the control, and it is why this is stated
 * as fact rather than as the format we intend to use.
 *
 * TENANCY. `agency_id` has NO default, on purpose. UNIQUE (agency_id, service)
 * means an inherited default would collide across tenants: a write that forgot
 * the tenant would land in the house vault, and the next tenant's upsert would
 * overwrite it, leaving two customers spending on whichever key won. Passing
 * it explicitly is enforced by the database, so forgetting is a loud error
 * rather than a silent cross-tenant mix.
 */

import crypto from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Tenant that owns a credential. See resolveAgencyId(). */
export type AgencyId = string

/** The house tenant: users we auto-provision, where 0nCore itself is the agency. */
export const HOUSE_AGENCY: AgencyId = '0ncore'

export interface VaultConnection {
  service: string
  label: string | null
  kind: string
  status: string
  meta: Record<string, unknown>
  lastVerifiedAt: string | null
}

/** A connection plus its decrypted secret. Never cache, never log. */
export interface VaultSecret extends VaultConnection {
  secret: string
}

function required(name: string): string {
  const v = process.env[name]
  if (!v) {
    // Name the missing variable. A generic "vault unavailable" is how a
    // misconfigured deploy gets mistaken for "the user has no key".
    throw new Error(`0nVault is not configured on this deployment: ${name} is unset.`)
  }
  return v
}

/**
 * Is the vault configured on THIS deployment?
 *
 * This distinction is load-bearing, and getting it wrong is an outage either
 * way:
 *
 *   · env ABSENT  -> no tenant can possibly have a key here, because nothing
 *     could ever have written one. Falling back to the platform key is correct.
 *     It is still OUR misconfiguration, so it is logged loudly rather than
 *     passed over in silence.
 *
 *   · env PRESENT but the read FAILS -> a connected key may well exist, and
 *     using the platform key would bill us for a customer who already paid
 *     Groq, while the UI cheerfully shows "connected". That must throw.
 *
 * Collapsing these two into one behaviour is how a missing variable becomes
 * either a fleet-wide outage or a silent bill.
 */
export function isVaultConfigured(): boolean {
  return Boolean(
    process.env.VAULT_SUPABASE_URL &&
      process.env.VAULT_SUPABASE_SERVICE_ROLE_KEY &&
      process.env.ON_CONNECT_KEY,
  )
}

let cached: SupabaseClient | null = null

function vaultDb(): SupabaseClient {
  if (cached) return cached
  cached = createClient(required('VAULT_SUPABASE_URL'), required('VAULT_SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
    // Next's Data Cache has frozen Supabase reads across redeploys before,
    // serving a revoked answer long after the row changed. Credentials are
    // exactly the wrong thing to serve from a stale cache.
    global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) },
  })
  return cached
}

function masterKey(): Buffer {
  const hex = required('ON_CONNECT_KEY').trim()
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) {
    throw new Error(`ON_CONNECT_KEY must be 32 bytes as 64 hex chars; got ${key.length} bytes.`)
  }
  return key
}

const IV_LEN = 12
const TAG_LEN = 16

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN)
  const c = crypto.createCipheriv('aes-256-gcm', masterKey(), iv)
  const ct = Buffer.concat([c.update(plaintext, 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64')
}

export function decryptSecret(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64')
  const d = crypto.createDecipheriv('aes-256-gcm', masterKey(), buf.subarray(0, IV_LEN))
  d.setAuthTag(buf.subarray(IV_LEN, IV_LEN + TAG_LEN))
  return Buffer.concat([d.update(buf.subarray(IV_LEN + TAG_LEN)), d.final()]).toString('utf8')
}

/**
 * Pull the usable secret out of a decrypted vault document.
 *
 * Rows seeded from `~/.0n/connections/*.0n` hold the whole .0n document, so
 * the secret is nested. Rows written by this app hold the bare secret. Both
 * shapes must work or the seeded rows are unreadable.
 */
export function extractSecret(plaintext: string): string {
  const trimmed = plaintext.trim()
  if (!trimmed.startsWith('{')) return trimmed
  let doc: unknown
  try {
    doc = JSON.parse(trimmed)
  } catch {
    return trimmed
  }
  const seen = new Set<unknown>()
  const KEYS = ['api_key', 'apiKey', 'token', 'access_token', 'accessToken', 'key', 'secret', 'pit']
  const walk = (node: unknown): string | null => {
    if (!node || typeof node !== 'object' || seen.has(node)) return null
    seen.add(node)
    const obj = node as Record<string, unknown>
    for (const k of KEYS) {
      const v = obj[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    for (const v of Object.values(obj)) {
      const found = walk(v)
      if (found) return found
    }
    return null
  }
  return walk(doc) ?? trimmed
}

/**
 * Read one connection's secret. Returns null when the tenant has not connected
 * this service — which is an ordinary state, not an error.
 *
 * Every successful read is audited. `usedBy` says which surface asked, because
 * "who is spending this key" is the first question asked when a bill surprises
 * someone, and it cannot be reconstructed later.
 */
export async function getSecret(
  agencyId: AgencyId,
  service: string,
  usedBy: string,
): Promise<VaultSecret | null> {
  if (!agencyId) throw new Error('getSecret requires an explicit agencyId — there is no default tenant.')

  const { data, error } = await vaultDb()
    .from('on_connections')
    .select('service,label,kind,status,meta,last_verified_at,secret_ciphertext')
    .eq('agency_id', agencyId)
    .eq('service', service)
    .maybeSingle()

  // Surface the platform's own words. A swallowed error here reads downstream
  // as "no key connected", which silently bills us instead of the customer.
  if (error) throw new Error(`0nVault read failed for ${service}: ${error.message}`)
  if (!data?.secret_ciphertext) return null

  const secret = extractSecret(decryptSecret(data.secret_ciphertext))

  await audit(agencyId, service, 'read', usedBy)

  return {
    service: data.service,
    label: data.label,
    kind: data.kind,
    status: data.status,
    meta: (data.meta ?? {}) as Record<string, unknown>,
    lastVerifiedAt: data.last_verified_at,
    secret,
  }
}

/** List a tenant's connections. Never returns ciphertext. */
export async function listConnections(agencyId: AgencyId): Promise<VaultConnection[]> {
  if (!agencyId) throw new Error('listConnections requires an explicit agencyId.')
  const { data, error } = await vaultDb()
    .from('on_connections')
    .select('service,label,kind,status,meta,last_verified_at')
    .eq('agency_id', agencyId)
    .order('service')
  if (error) throw new Error(`0nVault list failed: ${error.message}`)
  return (data ?? []).map((d) => ({
    service: d.service,
    label: d.label,
    kind: d.kind,
    status: d.status,
    meta: (d.meta ?? {}) as Record<string, unknown>,
    lastVerifiedAt: d.last_verified_at,
  }))
}

/**
 * Store a secret. Only ever called AFTER the caller has proved the credential
 * works against the real service — an unverified key stored as `active` is a
 * green light on a broken connection.
 */
export async function putSecret(args: {
  agencyId: AgencyId
  service: string
  secret: string
  label?: string | null
  kind?: string
  meta?: Record<string, unknown>
  verified: boolean
  usedBy: string
}): Promise<void> {
  if (!args.agencyId) throw new Error('putSecret requires an explicit agencyId.')
  if (!args.secret?.trim()) throw new Error('putSecret requires a non-empty secret.')

  const { error } = await vaultDb().from('on_connections').upsert(
    {
      agency_id: args.agencyId,
      service: args.service,
      label: args.label ?? null,
      kind: args.kind ?? 'token',
      secret_ciphertext: encryptSecret(args.secret.trim()),
      meta: args.meta ?? {},
      status: args.verified ? 'active' : 'unverified',
      last_verified_at: args.verified ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'agency_id,service' },
  )
  if (error) throw new Error(`0nVault write failed for ${args.service}: ${error.message}`)
  await audit(args.agencyId, args.service, 'write', args.usedBy)
}

/** Remove a connection. The tenant falls back to whatever the platform provides. */
export async function deleteSecret(agencyId: AgencyId, service: string, usedBy: string): Promise<void> {
  if (!agencyId) throw new Error('deleteSecret requires an explicit agencyId.')
  const { error } = await vaultDb()
    .from('on_connections')
    .delete()
    .eq('agency_id', agencyId)
    .eq('service', service)
  if (error) throw new Error(`0nVault delete failed for ${service}: ${error.message}`)
  await audit(agencyId, service, 'delete', usedBy)
}

/**
 * Audit is best-effort BUT LOUD: a failure to record must never fail the
 * caller's real work, and must never vanish either.
 */
async function audit(agencyId: AgencyId, service: string, action: string, usedBy: string): Promise<void> {
  const { error } = await vaultDb()
    .from('on_connection_audit')
    // Column is `tool`, not `used_by` — verified against the live schema. The
    // first draft wrote `used_by` and would have recorded nothing at all.
    .insert({ agency_id: agencyId, service, action, tool: usedBy })
  if (error) console.error(`[0nVault] audit write FAILED (${action} ${service} by ${usedBy}): ${error.message}`)
}
