/**
 * Dispatch — Layer 3 runtime client.
 *
 * Reads from the `dispatch_*` tables in pwujhhmlrtxjmjzyttwn (RLS public-read on
 * content tables) and falls back to raw github.com markdown if Supabase is
 * unreachable. Edge-cached for 60s, stale-while-revalidate 600s.
 *
 * Imported by:
 *   app/api/dispatch/*       — Layer 3 API routes
 *   app/.well-known/*        — public key serving
 *   any internal tool that wants the canonical state at runtime
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://pwujhhmlrtxjmjzyttwn.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const GITHUB_RAW =
  'https://raw.githubusercontent.com/Crypto-Goatz/0n-dispatch/main'

/**
 * Cache-control headers for every Layer 3 GET response.
 *
 *   s-maxage=60               — edge caches for 60s
 *   stale-while-revalidate    — serve stale up to 10min while refreshing
 */
/**
 * DISPATCH IS DEMOTED — historical, not canonical. Ruled 2026-08-19.
 *
 * The writeback that fed these tables last ran on 2026-06-17. Every endpoint
 * below kept answering HTTP 200 with confident, current-looking JSON for the
 * two months after that, which is precisely why it was dangerous: a stale
 * source that errors gets noticed, a stale source that succeeds gets believed.
 * rocketopp.com published "Last shipped 62d ago" under a pulsing "Ecosystem
 * Live" badge on ten public pages before anyone caught it.
 *
 * These routes stay up so existing readers do not hard-fail, but they now
 * declare themselves. Every response carries Deprecation/Sunset/Warning
 * headers and an `_meta` block naming the freeze date and the live source.
 *
 * Do NOT add new readers, and do NOT resume the writeback to "fix" this:
 * that would maintain a third operating record beside BRIDGE.md and 0nTask.
 * The live source of truth is 0nTask. If dispatch is ever revived, it revives
 * WITH its writeback or not at all.
 */
export const DISPATCH_FROZEN_AT = '2026-06-17'
export const DISPATCH_SUCCESSOR = 'https://app.0ntask.com'

export const DISPATCH_CACHE_HEADERS = {
  'cache-control': 's-maxage=60, stale-while-revalidate=600',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  // Machine-readable staleness. RFC 8594 / RFC 9745.
  deprecation: 'true',
  sunset: 'Wed, 17 Jun 2026 08:10:35 GMT',
  link: `<${DISPATCH_SUCCESSOR}>; rel="successor-version"`,
  warning: `299 - "Dispatch is historical. Data frozen at ${DISPATCH_FROZEN_AT}; do not treat as current. Live source: ${DISPATCH_SUCCESSOR}"`,
}

/**
 * Stamp a payload with its own staleness, so a reader that only ever looks at
 * the JSON body (never the headers) still cannot mistake this for live data.
 */
export function withDispatchMeta<T>(payload: T): T & { _meta: Record<string, string> } {
  return {
    ...(payload as object),
    _meta: {
      status: 'historical',
      deprecated: 'true',
      frozen_at: DISPATCH_FROZEN_AT,
      note: 'Dispatch was demoted 2026-08-19. This data stopped being written on 2026-06-17 and is NOT current.',
      live_source: DISPATCH_SUCCESSOR,
    },
  } as T & { _meta: Record<string, string> }
}

let _readClient: SupabaseClient | null = null
function readClient(): SupabaseClient {
  if (_readClient) return _readClient
  _readClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _readClient
}

let _writeClient: SupabaseClient | null = null
export function writeClient(): SupabaseClient {
  if (_writeClient) return _writeClient
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for dispatch writes')
  }
  _writeClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _writeClient
}

/** Try Supabase first; on failure fall back to fetching raw markdown from GitHub. */
async function fallback<T>(
  supabaseFn: () => Promise<T>,
  githubPath: string,
  parser: (md: string) => T,
): Promise<T> {
  try {
    return await supabaseFn()
  } catch (e) {
    console.warn('[dispatch] supabase unreachable, falling back to github', e)
    const r = await fetch(`${GITHUB_RAW}/${githubPath}`, {
      next: { revalidate: 60 },
    })
    if (!r.ok) throw new Error(`github fallback failed: ${r.status}`)
    return parser(await r.text())
  }
}

// ─────────────────────────────────────────────────────────
// READ helpers (used by /api/dispatch/* routes)
// ─────────────────────────────────────────────────────────

export async function getState(section?: string) {
  const sb = readClient()
  if (section) {
    const { data, error } = await sb
      .from('dispatch_state')
      .select('section, title, content_md, source_sha, updated_at')
      .eq('section', section)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const { data, error } = await sb
    .from('dispatch_state')
    .select('section, title, content_md, source_sha, updated_at')
    .order('section')
  if (error) throw error
  return data ?? []
}

export async function getRules(category?: string) {
  const sb = readClient()
  let q = sb
    .from('dispatch_rules')
    .select('number, category, short_form, long_form_md, memory_pointer, active, source_sha, updated_at')
    .eq('active', true)
    .order('number')
  if (category) q = q.eq('category', category)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getEcosystem(kind?: string) {
  const sb = readClient()
  let q = sb
    .from('dispatch_ecosystem')
    .select('kind, slug, display_name, meta, used_by, source_sha, updated_at')
    .order('kind')
    .order('slug')
  if (kind) q = q.eq('kind', kind)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getDbByRef(ref: string) {
  const sb = readClient()
  const { data, error } = await sb
    .from('dispatch_ecosystem')
    .select('slug, display_name, meta, used_by')
    .eq('kind', 'supabase_project')
    .eq('slug', ref)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getProducts(slug?: string) {
  const sb = readClient()
  if (slug) {
    const { data, error } = await sb
      .from('dispatch_products')
      .select('slug, display_name, domain, version, is_live, mode, status_md, meta, source_sha, updated_at')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const { data, error } = await sb
    .from('dispatch_products')
    .select('slug, display_name, domain, version, is_live, mode, source_sha, updated_at')
    .order('slug')
  if (error) throw error
  return data ?? []
}

export async function getVersion() {
  const sb = readClient()
  const { data, error } = await sb
    .from('dispatch_commits')
    .select('sha, author_github_user, message, committed_at, pushed_at')
    .order('pushed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Returns env-var INDEX only — paths/types/locations, never values.
 * Per blueprint security policy, this endpoint must never leak secrets.
 */
export async function getCredentialsIndex() {
  // Constructed from dispatch_ecosystem (vercel_project rows carry env metadata
  // in their `meta` jsonb). For v1 we just expose the project list with their
  // domains and meta keys — full env inventory comes in Phase 5 once each
  // product status doc declares its env_vars list.
  const sb = readClient()
  const { data, error } = await sb
    .from('dispatch_ecosystem')
    .select('kind, slug, display_name, meta')
    .in('kind', ['vercel_project', 'supabase_project'])
    .order('kind')
    .order('slug')
  if (error) throw error
  return {
    vercel_projects: (data ?? []).filter((r) => r.kind === 'vercel_project'),
    supabase_projects: (data ?? []).filter((r) => r.kind === 'supabase_project'),
    note: 'Paths only — secret values never returned. See Vercel envs / 1Password / ~/.0n/ for actual values.',
  }
}

export async function getDotOnFile(section: string) {
  const sb = readClient()
  const { data, error } = await sb
    .from('dispatch_dotonfiles')
    .select('section, sha, content, signing_key_id, size_bytes, created_at')
    .eq('section', section)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Public Ed25519 verification key — served at /.well-known/dispatch.pub
 * as a static file (public/.well-known/dispatch.pub) so it's available
 * without a GitHub round-trip. Updated when the signing key rotates.
 */
const DISPATCH_PUB_PEM_INLINE = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA755cNXWuXlaorw1VUdb4tuPPsp5YYSgI5EDKst7Bzv8=
-----END PUBLIC KEY-----
`
export async function getPublicKeyPem(): Promise<string> {
  return DISPATCH_PUB_PEM_INLINE
}

// ─────────────────────────────────────────────────────────
// .0n signature verification (used by /api/dispatch/.0n/import)
// ─────────────────────────────────────────────────────────

export async function verifyDotOn(fileBody: string): Promise<{
  valid: boolean
  reason?: string
  type?: string
  source_sha?: string
}> {
  const { createPublicKey, verify } = await import('node:crypto')
  const sigIdx = fileBody.indexOf('---SIG---')
  if (sigIdx === -1) return { valid: false, reason: 'missing SIG block' }
  const presig = fileBody.slice(0, sigIdx)
  const sigBlock = fileBody.slice(sigIdx)
  const sigMatch = sigBlock.match(/signature:\s*([A-Za-z0-9+/=]+)/)
  if (!sigMatch) return { valid: false, reason: 'malformed signature' }
  const typeMatch = presig.match(/^type:\s*(\S+)/m)
  const shaMatch = presig.match(/^source_sha:\s*(\S+)/m)

  let pubPem: string
  try {
    pubPem = await getPublicKeyPem()
  } catch (e) {
    return { valid: false, reason: `cannot fetch public key: ${(e as Error).message}` }
  }
  try {
    const pub = createPublicKey(pubPem)
    const ok = verify(
      null,
      Buffer.from(presig, 'utf8'),
      pub,
      Buffer.from(sigMatch[1], 'base64'),
    )
    return ok
      ? { valid: true, type: typeMatch?.[1], source_sha: shaMatch?.[1] }
      : { valid: false, reason: 'signature did not verify' }
  } catch (e) {
    return { valid: false, reason: (e as Error).message }
  }
}
