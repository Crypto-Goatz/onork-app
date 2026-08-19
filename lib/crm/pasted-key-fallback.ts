/**
 * The pasted-per-location-key fallback — insurance against POST /oauth/locationToken.
 *
 * WHAT THIS IS INSURANCE AGAINST. That endpoint was removed from the platform's
 * documentation on 2026-06-11 with no deprecation period and still answers 201
 * (see lib/crm/deprecations.ts, and the six-hourly probe in
 * location-token-canary.ts). It is position 3 of four in credential resolution,
 * so any location with no pasted key and no live OAuth install reaches it — and
 * on the day it stops answering, those locations lose credential resolution with
 * no code change on our side and no warning from the vendor.
 *
 * The replacement already exists and is position 1: a per-location PIT the
 * agency pastes at /connect. Every active location has one today. This module is
 * what makes that a *fallback* rather than a coincidence — the three things that
 * are otherwise missing on the day it matters:
 *
 *   1. A SWITCH THAT DOES NOT NEED A DEPLOY. `crm_endpoint_state.fallback_armed`
 *      is one UPDATE. On Vercel an env var is snapshotted into the deployment,
 *      so an env-only switch means a rebuild at whatever hour the canary fires;
 *      CRM_REQUIRE_PASTED_KEY is still honoured, as the override for the case
 *      where the database is the unreachable thing.
 *   2. A LEGIBLE FAILURE. Without this, a total resolution miss returns
 *      `{ token: '' }` from getPitForLocation and we send `Bearer ` to the CRM.
 *      The customer sees an opaque 401 and we see a 401 in a log; nothing
 *      anywhere says "paste a key for this account". requirePastedKey() names
 *      the location and the fix.
 *   3. AN EXPOSURE ANSWER THAT COVERS EVERY LOCATION. locationsAtRisk() in
 *      deprecations.ts answers per-agency, over rows that already exist in
 *      location_connections. A location we resolve for but never connected —
 *      provisioned sub-accounts, family-link signups, the scanner — is invisible
 *      to it and is exactly the kind that has no pasted key.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not arm itself on a bad day. A 5xx,
 * a timeout and a 401 are all consistent with a live endpoint, and disabling a
 * working credential path over one of those would be us causing the outage
 * rather than the removal — the same reasoning that made warnMintUsed() a log
 * and not a throw. Only 404 and 410 arm, only when the canary saw them (see
 * `mayArm` on recordMintOutcome — a 404 in real traffic is as likely to mean
 * "no such location" as "no such endpoint"), and a flag we cannot read means
 * allowed: this must never be the reason CRM calls stop.
 */
import { createServiceClient } from '@/lib/connect/service-client'

/** Method + path exactly as it appears in DEPRECATED_ENDPOINTS. */
export const MINT_ENDPOINT = 'POST /oauth/locationToken'

/** Long enough that resolution does not pay for a read, short enough that
 *  arming the flag takes effect inside a cron cycle rather than a deploy. */
const STATE_TTL_MS = 60_000

/** An alive probe rewrites the row at most this often — the mint site calls
 *  recordMintOutcome on every success and none of those are news. */
const ALIVE_WRITE_THROTTLE_MS = 5 * 60_000

export interface EndpointState {
  endpoint: string
  last_status: number | null
  last_checked_at: string | null
  last_alive_at: string | null
  consecutive_failures: number
  last_error: string | null
  fallback_armed: boolean
  armed_at: string | null
  armed_by: string | null
  note: string | null
}

export type MintReason =
  /** The endpoint may be called. */
  | 'ok'
  /** A human (or this process's env) turned it off. */
  | 'armed-by-operator'
  /** The canary saw a 404/410 and armed the row. */
  | 'armed-by-canary'
  /** THIS instance called it and got a 404/410. Trips before any flag read. */
  | 'gone-this-instance'
  /** The flag could not be read. Allowed anyway — see the header. */
  | 'unknown-fail-open'

export interface MintDisposition {
  allowed: boolean
  reason: MintReason
  detail: string
}

/** Per-instance memory of a hard removal. Never cleared: an endpoint that
 *  answered 410 does not come back inside one lambda's lifetime, and calling it
 *  again to find out costs every waiting request a round trip. */
let goneThisInstance: { status: number; at: string } | null = null

let cache: { at: number; state: EndpointState | null } | null = null

function isGone(status: number | null): boolean {
  return status === 404 || status === 410
}

async function readState(force = false): Promise<EndpointState | null> {
  if (!force && cache && Date.now() - cache.at < STATE_TTL_MS) return cache.state
  const db = createServiceClient()
  if (!db) return null
  const { data, error } = await db
    .from('crm_endpoint_state')
    .select('*')
    .eq('endpoint', MINT_ENDPOINT)
    .maybeSingle<EndpointState>()
  if (error) {
    // Not cached — a transient read failure must not pin "unknown" for a minute.
    console.warn('[pasted-key-fallback] could not read crm_endpoint_state:', error.message)
    return null
  }
  cache = { at: Date.now(), state: data ?? null }
  return data ?? null
}

/**
 * May credential resolution call the mint endpoint right now?
 *
 * Checked at the mint site rather than at each caller, so there is exactly one
 * place that can be wrong.
 */
export async function mintDisposition(): Promise<MintDisposition> {
  if (goneThisInstance) {
    return {
      allowed: false,
      reason: 'gone-this-instance',
      detail: `This instance called ${MINT_ENDPOINT} at ${goneThisInstance.at} and got ${goneThisInstance.status}. The endpoint is gone; a pasted per-location key is the only credential left.`,
    }
  }

  // The override that works when the database does not. Deliberately first
  // among the flags: if someone set this, they set it for a reason we cannot
  // see from here.
  const env = process.env.CRM_REQUIRE_PASTED_KEY
  if (env && env !== '0' && env.toLowerCase() !== 'false') {
    return {
      allowed: false,
      reason: 'armed-by-operator',
      detail: `CRM_REQUIRE_PASTED_KEY=${env} — ${MINT_ENDPOINT} is disabled for this deployment. Every location must resolve on a pasted key.`,
    }
  }

  const state = await readState()
  if (!state) {
    return {
      allowed: true,
      reason: 'unknown-fail-open',
      detail: `No readable crm_endpoint_state row for ${MINT_ENDPOINT}. Allowing the mint: an unreadable flag must never be the reason CRM calls stop.`,
    }
  }
  if (state.fallback_armed) {
    const byCanary = (state.armed_by || '').startsWith('canary')
    return {
      allowed: false,
      reason: byCanary ? 'armed-by-canary' : 'armed-by-operator',
      detail:
        `${MINT_ENDPOINT} is armed off (${state.armed_by || 'unknown'}${state.armed_at ? ` at ${state.armed_at}` : ''})` +
        (state.last_status ? `, last observed status ${state.last_status}` : '') +
        '. Resolution requires a pasted per-location key.',
    }
  }
  // last_status and last_alive_at are different facts and must not be read as
  // one sentence: "answered 404 at <the time it last worked>" is a lie assembled
  // from two truths. Report the most recent check, then when it last worked.
  const detail = state.last_checked_at
    ? `${MINT_ENDPOINT} last checked ${state.last_checked_at} → ${state.last_status ?? 'no response'}` +
      (state.last_alive_at
        ? state.last_alive_at === state.last_checked_at
          ? ' (alive).'
          : `; last known alive ${state.last_alive_at}, ${state.consecutive_failures} failure(s) since.`
        : '; never observed alive.')
    : `${MINT_ENDPOINT} not yet observed by the canary.`
  return { allowed: true, reason: 'ok', detail }
}

/**
 * Record what the endpoint just did. Called by the canary and by the mint site,
 * so the row reflects real traffic and not only the six-hourly probe.
 *
 * ARMS ONLY ON 404/410 — see the header. Never throws: this is bookkeeping
 * hanging off a credential path, and a failed write here must not fail a mint
 * that worked.
 */
export async function recordMintOutcome(args: {
  status: number | null
  alive: boolean
  error?: string
  observedBy: string
  /**
   * May a 404/410 from THIS observation arm the fallback?
   *
   * Only the canary may, and the distinction is not fussiness — it is the
   * difference between a monitor and a foot-gun. 404 is ambiguous at the mint
   * site: "this endpoint is gone" and "that locationId does not exist" arrive as
   * the same status, and resolution is called with whatever id a caller had in
   * hand. One request for a stale or mistyped location would otherwise disable
   * the mint for every account at once. The canary probes an id read from our
   * own table, so a 404 there can only be about the endpoint.
   *
   * Real traffic still records: last_status and consecutive_failures move, so a
   * genuine removal is visible in the row within minutes even though the arming
   * decision waits for the next six-hourly probe.
   */
  mayArm: boolean
}): Promise<void> {
  const now = new Date().toISOString()

  if (args.mayArm && isGone(args.status)) {
    goneThisInstance = { status: args.status as number, at: now }
  }

  try {
    const db = createServiceClient()
    if (!db) return

    const prev = await readState(true)

    // An alive probe that says the same thing as the last one is not news.
    // Skipped BEFORE the write so a busy mint path costs one round trip per five
    // minutes rather than one per mint.
    // "The previous observation was ITSELF alive" is `last_alive_at ===
    // last_checked_at`, and nothing weaker will do. consecutive_failures === 0
    // looks like the same test and is not: the counter can be zero while
    // last_status still holds a failure, and in that state this skipped the
    // write and left the row advertising the failure as current. Caught by the
    // drill, which restores the row and then watched a real 201 get throttled
    // away behind a stale 404.
    const prevWasAlive = Boolean(prev?.last_alive_at && prev.last_alive_at === prev.last_checked_at)
    if (
      args.alive &&
      prev &&
      !prev.fallback_armed &&
      prevWasAlive &&
      Date.now() - new Date(prev.last_checked_at as string).getTime() < ALIVE_WRITE_THROTTLE_MS
    ) {
      return
    }

    const gone = args.mayArm && isGone(args.status)
    const failures = args.alive ? 0 : (prev?.consecutive_failures ?? 0) + 1

    const patch: Record<string, unknown> = {
      endpoint: MINT_ENDPOINT,
      last_status: args.status,
      last_checked_at: now,
      consecutive_failures: failures,
      last_error: args.alive ? null : (args.error || `status ${args.status ?? 'none'}`).slice(0, 500),
      updated_at: now,
    }
    if (args.alive) patch.last_alive_at = now

    // Arming is one-way here. Disarming is a human act: if the vendor restores
    // the endpoint, someone should look at why it went and decide, rather than
    // have a probe quietly re-enable a path we already moved off.
    if (gone && !prev?.fallback_armed) {
      patch.fallback_armed = true
      patch.armed_at = now
      patch.armed_by = `canary:${args.status}`
      patch.note = `Armed automatically: ${MINT_ENDPOINT} returned ${args.status} to ${args.observedBy}. Every location now requires a pasted per-location key.`
      console.error(
        `[pasted-key-fallback] ARMED. ${MINT_ENDPOINT} returned ${args.status} to ${args.observedBy}. ` +
        'Credential resolution will no longer call it. Locations without a pasted key are now failing — ' +
        'check /api/admin/deprecation-check and paste keys at /connect.',
      )
    }

    await db.from('crm_endpoint_state').upsert(patch, { onConflict: 'endpoint' })
    cache = null
  } catch (err) {
    console.warn(
      '[pasted-key-fallback] could not record mint outcome:',
      err instanceof Error ? err.message : err,
    )
  }
}

export interface PastedKeyRequirement {
  locationId: string
  /** The mint is unavailable, so a pasted key is the only remaining credential. */
  required: boolean
  /** A pasted key exists for this location. */
  satisfied: boolean
  /** This location can be served right now. */
  ready: boolean
  /** What is actually holding the credential, if anything. */
  resolvesOn: 'pasted-key' | 'oauth-install' | 'mint' | 'nothing'
  /** Always populated when !ready — names the location and the fix. */
  instruction: string
  disposition: MintDisposition
}

/**
 * Can we serve this location, and if not, what does a person do about it?
 *
 * The function lib/crm/deprecations.ts promises in its `replacement` note for
 * POST /oauth/locationToken. Read-only and cheap enough to call on a failure
 * path — two indexed lookups and a cached flag read.
 */
export async function requirePastedKey(locationId: string): Promise<PastedKeyRequirement> {
  const disposition = await mintDisposition()
  const required = !disposition.allowed

  const db = createServiceClient()
  let pasted = false
  let install = false

  if (db && locationId) {
    const { data: conn } = await db
      .from('location_connections')
      .select('location_pit')
      .eq('location_id', locationId)
      .eq('status', 'active')
      .maybeSingle<{ location_pit: string | null }>()
    pasted = Boolean(conn?.location_pit)

    if (!pasted) {
      const { data: row } = await db
        .from('crm_installations')
        .select('id')
        .eq('location_id', locationId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle<{ id: string }>()
      install = Boolean(row)
    }
  }

  const resolvesOn: PastedKeyRequirement['resolvesOn'] = pasted
    ? 'pasted-key'
    : install
      ? 'oauth-install'
      : required
        ? 'nothing'
        : 'mint'

  const ready = pasted || install || !required

  return {
    locationId,
    required,
    satisfied: pasted,
    ready,
    resolvesOn,
    instruction: ready
      ? ''
      : `No credential for location ${locationId}. ${disposition.detail} ` +
        'Paste that account\'s private integration token at /connect (Clients → the account → its key), ' +
        'or reinstall the app on it. Until then every CRM call for this account will fail.',
    disposition,
  }
}

export interface ExposureRow {
  locationId: string
  name: string | null
  companyId: string | null
  /** Where its credential comes from today. */
  resolvesOn: 'pasted-key' | 'oauth-install' | 'mint'
  /**
   * CONNECTED and DORMANT are not the same exposure, and reporting one number
   * for both is how this stops being read.
   *
   * connected — an active row in location_connections. Somebody chose this
   *   account and is billed for it. If it is on the mint, that is a live
   *   customer outage waiting for a vendor decision.
   * dormant — we only know the location because an install for it was archived
   *   (28 such rows, all retired 2026-08-18, every one 'unrecoverable' or
   *   'revoked'). Nothing routine touches these. They matter because resolution
   *   is called with whatever id a caller has in hand, so the day one IS
   *   touched, the mint is the only thing standing between it and a failure —
   *   but an alert that counts them as outages cries wolf 21 times.
   */
  tier: 'connected' | 'dormant'
}

/**
 * Every location we could be asked to resolve for, and what would happen to it
 * if the mint stopped answering right now.
 *
 * WIDER THAN locationsAtRisk(). That one is scoped to a single agency and
 * iterates location_connections, so it can only see accounts somebody
 * deliberately connected. Resolution is called for any location id in hand —
 * a provisioned sub-account, a family-link signup, the scanner — so the set that
 * matters is the union of every location either table knows about.
 */
export async function pastedKeyExposure(): Promise<{
  armed: boolean
  disposition: MintDisposition
  total: number
  onPastedKey: number
  onInstall: number
  /** Everything the mint is carrying, connected and dormant alike. */
  onMint: ExposureRow[]
  /** The subset that is a paying, connected account. THIS is the alarm. */
  connectedOnMint: ExposureRow[]
  /** Known-but-retired locations with no key. A warning, not an outage. */
  dormantOnMint: ExposureRow[]
  rows: ExposureRow[]
}> {
  const disposition = await mintDisposition()
  const db = createServiceClient()
  const empty = {
    armed: !disposition.allowed,
    disposition,
    total: 0,
    onPastedKey: 0,
    onInstall: 0,
    onMint: [] as ExposureRow[],
    connectedOnMint: [] as ExposureRow[],
    dormantOnMint: [] as ExposureRow[],
    rows: [] as ExposureRow[],
  }
  if (!db) return empty

  const { data: conns } = await db
    .from('location_connections')
    .select('location_id, location_name, company_id, location_pit')
    .eq('status', 'active')

  const { data: installs } = await db
    .from('crm_installations')
    .select('location_id, company_id, status, expires_at')
    .neq('location_id', '')

  const known = new Map<string, ExposureRow>()

  for (const c of conns ?? []) {
    const id = c.location_id as string
    if (!id) continue
    known.set(id, {
      locationId: id,
      name: (c.location_name as string) || null,
      companyId: (c.company_id as string) || null,
      resolvesOn: c.location_pit ? 'pasted-key' : 'mint',
      tier: 'connected',
    })
  }

  const liveInstall = new Set(
    (installs ?? [])
      .filter((i) => i.status === 'active' && i.expires_at && new Date(i.expires_at as string).getTime() > Date.now())
      .map((i) => i.location_id as string),
  )

  for (const i of installs ?? []) {
    const id = i.location_id as string
    if (!id) continue
    if (!known.has(id)) {
      known.set(id, {
        locationId: id,
        name: null,
        companyId: (i.company_id as string) || null,
        // An archived or expired install leaves the location known to us and
        // uncredentialled — precisely the shape that falls through to the mint.
        resolvesOn: liveInstall.has(id) ? 'oauth-install' : 'mint',
        tier: 'dormant',
      })
    } else if (known.get(id)!.resolvesOn === 'mint' && liveInstall.has(id)) {
      known.get(id)!.resolvesOn = 'oauth-install'
    }
  }

  const rows = [...known.values()]
  const onMint = rows.filter((r) => r.resolvesOn === 'mint')
  return {
    armed: !disposition.allowed,
    disposition,
    total: rows.length,
    onPastedKey: rows.filter((r) => r.resolvesOn === 'pasted-key').length,
    onInstall: rows.filter((r) => r.resolvesOn === 'oauth-install').length,
    onMint,
    connectedOnMint: onMint.filter((r) => r.tier === 'connected'),
    dormantOnMint: onMint.filter((r) => r.tier === 'dormant'),
    rows,
  }
}

/** Test seam — clears the per-instance flag cache and hard-removal memory. */
export function __resetFallbackCacheForTests(): void {
  cache = null
  goneThisInstance = null
}
