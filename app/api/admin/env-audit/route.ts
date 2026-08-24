/**
 * GET /api/admin/env-audit — is every credential the shape it is supposed to be?
 *
 * WHY THIS EXISTS. Five separate outages in one week, each with a different
 * symptom, all one cause: a secret saved to the host as `encrypted` ended up
 * stored as the host's own encryption envelope, so the running process received
 * `{"v":"v2","c":"…"}` where a key belonged.
 *
 *   CRM_SSO_KEY                 → in-CRM sign-in dead, read as a login bug
 *   CRM_AGENCY_APP_CLIENT_ID    → agency installs failed as "invalid credentials"
 *   CRM_AGENCY_APP_CLIENT_SECRET → same
 *   LINKEDIN_CLIENT_SECRET      → LinkedIn OAuth dead, undiscovered
 *   CRM_MASTER_SNAPSHOT_ID      → every provisioned location got an invalid
 *                                 snapshot id, so none registered as an importer
 *
 * Not one of them threw. Each looked like a different broken feature.
 *
 * IT AUDITS process.env, NOT THE HOST'S API. What the host reports and what the
 * process receives are different questions, and only the second one can break
 * anything. This sees exactly what the code sees.
 *
 * IT NEVER RETURNS A VALUE. Length, prefix and shape are enough to diagnose
 * every failure above; the value itself would turn a diagnostic into a leak.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { createHash } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The envelope's plaintext is base64 of `{"v":"v2","c":"…`. */
const ENVELOPE_PREFIX = 'eyJ2Ijoidj'

interface Expectation {
  /** Matches env var names this rule applies to. */
  pattern: RegExp
  shape: string
  test: (v: string) => boolean
}

/**
 * Shape rules, derived from values verified working against the live APIs.
 * Deliberately loose: this catches CATEGORY errors (an envelope where a key
 * belongs), not typos. A rule that is too strict produces noise nobody reads.
 */
const EXPECTATIONS: Expectation[] = [
  { pattern: /_PIT($|_)|^CRM_PIT/, shape: 'pit-<uuid>', test: (v) => v.startsWith('pit-') && v.length > 30 },
  { pattern: /CLIENT_ID$/, shape: '<24-hex>-<suffix>', test: (v) => /^[a-f0-9]{20,26}-[a-z0-9]+$/i.test(v) },
  { pattern: /CLIENT_SECRET$/, shape: 'uuid or provider-prefixed', test: (v) => v.length >= 20 && v.length <= 120 },
  { pattern: /^GROQ_API_KEY/, shape: 'gsk_…', test: (v) => v.startsWith('gsk_') },
  { pattern: /SNAPSHOT_ID$/, shape: '20-char id', test: (v) => /^[A-Za-z0-9]{15,30}$/.test(v) },
  { pattern: /^STRIPE_SECRET_KEY$/, shape: 'sk_…', test: (v) => v.startsWith('sk_') },
  { pattern: /SUPABASE_URL$/, shape: 'https://…', test: (v) => v.startsWith('https://') },
]

/** Anything credential-shaped. Broad on purpose — a missed var is a missed outage. */
const WATCHED = /^(CRM_|GHL_|LINKEDIN_|SLACK_|STRIPE_|GROQ_|SUPABASE_|AGENCY_|SUBACCT_|NEXT_PUBLIC_SUPABASE_)/

/**
 * SHAPE CANNOT SEE THE BUG THAT ACTUALLY COST US THE AGENCY TOKEN EXCHANGE.
 *
 * On 2026-08-24 all three agency slots held `d733dfee-…-5dd4`, and the portal
 * showed that value as the app's SHARED secret — the CLIENT secret is a
 * different string. Every rule above passes it: it is a UUID, the right length,
 * not an envelope. The platform answered `Invalid client credentials!` on a real
 * refresh token and nothing local could say why.
 *
 * A shared secret and a client secret are both UUIDs, so SHAPE WILL NEVER TELL
 * THEM APART. What can: two questions shape does not ask.
 *
 *   1. Does a client_id actually belong to the app whose slot it sits in?
 *      `CRM_AGENCY_CLIENT_ID` is the legacy 69cf4d25 app's slot and held a
 *      6a71919b value — a cross-app hand-off that reads as a credential bug.
 *   2. Do slots that are ALIASES of one key still agree? A rotation issues a new
 *      client_id as well as a new secret, so updating two of three slots leaves
 *      a stale pair that some code path will pick.
 *
 * And the paste error itself is directly detectable WITHOUT the portal: if a
 * *_CLIENT_SECRET holds the same bytes as a known shared secret, that is the
 * error outright. `app/api/oauth/callback` already reasons this way; the check
 * belongs here too, where it is asked before an outage rather than during one.
 *
 * Values are never returned — ids expose a suffix (they are semi-public and
 * appear in install URLs), secrets only a truncated hash, which is enough to
 * compare two slots and useless to an attacker.
 */
interface CredentialGroup {
  label: string
  /** The marketplace app id every client_id in this group must be prefixed with. */
  appId: string
  idEnvs: string[]
  secretEnvs: string[]
  /**
   * Whether these slots are aliases of ONE key and must therefore agree.
   * False where multiple live keys are deliberate — the marketplace app keeps
   * older client ids as fallbacks for installs issued under them, so demanding
   * agreement there would report a design decision as a fault.
   */
  aliases: boolean
}

const CREDENTIAL_GROUPS: CredentialGroup[] = [
  {
    label: 'agency v2 (0nCORE Agency)',
    appId: '6a71919be8d7c3c038df0839',
    idEnvs: ['CRM_AGENCY_APP_CLIENT_ID', 'AGENCY_CLIENT_ID'],
    secretEnvs: ['CRM_AGENCY_APP_CLIENT_SECRET', 'AGENCY_CLIENT_SECRET'],
    aliases: true,
  },
  {
    label: 'sub-account app',
    appId: '6a7178a4e8d7c3c038c593b3',
    idEnvs: ['CRM_SUBACCT_CLIENT_ID', 'SUBACCT_CLIENT_ID'],
    secretEnvs: ['CRM_SUBACCT_CLIENT_SECRET', 'SUBACCT_CLIENT_SECRET'],
    aliases: true,
  },
  {
    label: 'legacy 0nAGENCY',
    appId: '69cf4d25a74f834803470537',
    idEnvs: ['CRM_AGENCY_CLIENT_ID'],
    secretEnvs: ['CRM_AGENCY_CLIENT_SECRET'],
    aliases: true,
  },
  {
    label: '0n Course Builder',
    appId: '69801f7a533633818a22921c',
    idEnvs: ['CRM_COURSE_APP_CLIENT_ID'],
    secretEnvs: ['CRM_COURSE_APP_CLIENT_SECRET'],
    aliases: true,
  },
  {
    label: 'marketplace / sub-location',
    appId: '69c762225a31e1cd2f28dd4c',
    idEnvs: ['CRM_MARKETPLACE_APP_CLIENT_ID', 'CRM_MARKETPLACE_CLIENT_ID', 'CRM_EXTERNAL_AUTH_CLIENT_ID'],
    secretEnvs: ['CRM_MARKETPLACE_CLIENT_SECRET', 'CRM_EXTERNAL_AUTH_CLIENT_SECRET'],
    aliases: false,
  },
]

/** Slots that hold a SHARED secret (SSO/webhook signing), never a client secret. */
const SHARED_SECRET_ENVS = [
  'CRM_COURSE_APP_SHARED_SECRET',
  'CRM_MARKETPLACE_SHARED_SECRET',
  'CRM_LEADSCOUT_SSO_KEY',
  'CRM_AGENCY_SHARED_SECRET',
  'CRM_SSO_KEY',
] as const

type Verdict = 'ok' | 'envelope' | 'wrong-shape' | 'empty' | 'unchecked'

/** Non-reversible, stable, short. Enough to say "these two slots differ". */
const fp = (v: string) => createHash('sha256').update(v).digest('hex').slice(0, 8)

interface ConsistencyFinding {
  group: string
  kind: 'foreign-client-id' | 'alias-disagreement' | 'shared-secret-in-client-slot'
  detail: string
  keys: string[]
}

/**
 * The three questions shape cannot ask. Returns only findings — a clean run is
 * an empty array, so a caller can branch on `length` without parsing prose.
 */
export function auditCredentialConsistency(): ConsistencyFinding[] {
  const findings: ConsistencyFinding[] = []
  const read = (k: string) => (process.env[k] || '').trim()

  // A shared secret sitting in a client-secret slot is the paste error itself.
  // Built first so every group can be tested against it. Envelopes are excluded:
  // two slots both holding an envelope are equal for a reason already reported.
  const sharedByValue = new Map<string, string>()
  for (const name of SHARED_SECRET_ENVS) {
    const v = read(name)
    if (v && !v.startsWith(ENVELOPE_PREFIX)) sharedByValue.set(v, name)
  }

  for (const g of CREDENTIAL_GROUPS) {
    for (const idEnv of g.idEnvs) {
      const v = read(idEnv)
      if (!v || v.startsWith(ENVELOPE_PREFIX)) continue
      if (!v.startsWith(g.appId + '-')) {
        findings.push({
          group: g.label,
          kind: 'foreign-client-id',
          detail: `${idEnv} holds a client_id for a DIFFERENT app (…${v.slice(-8)}); this slot belongs to ${g.appId}.`,
          keys: [idEnv],
        })
      }
    }

    for (const secretEnv of g.secretEnvs) {
      const v = read(secretEnv)
      if (!v || v.startsWith(ENVELOPE_PREFIX)) continue
      const owner = sharedByValue.get(v)
      if (owner) {
        findings.push({
          group: g.label,
          kind: 'shared-secret-in-client-slot',
          detail: `${secretEnv} holds the SAME value as ${owner}, which is a SHARED secret. A client secret is a different string; this pair will fail as "Invalid client credentials".`,
          keys: [secretEnv, owner],
        })
      }
    }

    if (!g.aliases) continue

    // Aliases of one key must agree, or a rotation that updated some slots left
    // a stale pair behind for whichever code path reads the one that was missed.
    for (const [kind, envs] of [['id', g.idEnvs], ['secret', g.secretEnvs]] as const) {
      const present = envs.map((k) => [k, read(k)] as const).filter(([, v]) => v && !v.startsWith(ENVELOPE_PREFIX))
      if (present.length < 2) continue
      const distinct = new Set(present.map(([, v]) => v))
      if (distinct.size > 1) {
        findings.push({
          group: g.label,
          kind: 'alias-disagreement',
          detail: `these ${kind} slots are aliases of one key but hold ${distinct.size} different values: ` +
            present.map(([k, v]) => `${k}=${kind === 'id' ? '…' + v.slice(-8) : '#' + fp(v)}`).join(', '),
          keys: present.map(([k]) => k),
        })
      }
    }
  }

  return findings
}

export async function GET(req: NextRequest) {
  const s = verifyAppJwt(bearer(req))
  if (!s.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const rows: { key: string; verdict: Verdict; length: number; prefix: string; expected?: string }[] = []

  for (const key of Object.keys(process.env).sort()) {
    if (!WATCHED.test(key)) continue
    const raw = process.env[key] ?? ''

    if (!raw) { rows.push({ key, verdict: 'empty', length: 0, prefix: '' }); continue }

    // The category error, checked before anything else — an envelope is never a
    // valid value for any of these, whatever its shape rule says.
    if (raw.startsWith(ENVELOPE_PREFIX)) {
      rows.push({ key, verdict: 'envelope', length: raw.length, prefix: raw.slice(0, 10) })
      continue
    }

    const rule = EXPECTATIONS.find((e) => e.pattern.test(key))
    if (!rule) { rows.push({ key, verdict: 'unchecked', length: raw.length, prefix: raw.slice(0, 4) }); continue }

    rows.push({
      key,
      verdict: rule.test(raw) ? 'ok' : 'wrong-shape',
      length: raw.length,
      prefix: raw.slice(0, 4),
      expected: rule.shape,
    })
  }

  const envelopes = rows.filter((r) => r.verdict === 'envelope')
  const wrong = rows.filter((r) => r.verdict === 'wrong-shape')
  const consistency = auditCredentialConsistency()

  return NextResponse.json({
    checked: rows.length,
    healthy: envelopes.length === 0 && wrong.length === 0 && consistency.length === 0,
    envelopes: envelopes.map((r) => r.key),
    wrongShape: wrong.map((r) => ({ key: r.key, expected: r.expected, length: r.length })),
    consistency,
    rows,
    // Reported together, because "no envelopes" is not "no credential faults"
    // and a note that says only the first reads as an all-clear it has not earned.
    note: [
      envelopes.length
        ? `${envelopes.length} variable(s) hold a host encryption envelope, not a value. Re-add each as type:plain — the original is unrecoverable and must be re-pasted from source.`
        : 'No envelope-shaped credentials.',
      consistency.length
        ? `${consistency.length} credential CONSISTENCY fault(s) — see "consistency". These pass every shape rule and still break auth.`
        : 'Credential slots are internally consistent.',
    ].join(' '),
  })
}
