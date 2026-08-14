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

type Verdict = 'ok' | 'envelope' | 'wrong-shape' | 'empty' | 'unchecked'

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

  return NextResponse.json({
    checked: rows.length,
    healthy: envelopes.length === 0 && wrong.length === 0,
    envelopes: envelopes.map((r) => r.key),
    wrongShape: wrong.map((r) => ({ key: r.key, expected: r.expected, length: r.length })),
    rows,
    note: envelopes.length
      ? `${envelopes.length} variable(s) hold a host encryption envelope, not a value. Re-add each as type:plain — the original is unrecoverable and must be re-pasted from source.`
      : 'No envelope-shaped credentials.',
  })
}
