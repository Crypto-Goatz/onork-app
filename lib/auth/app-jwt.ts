import crypto from 'node:crypto'

/**
 * Server-only, enforced at runtime.
 *
 * The `server-only` package is not a dependency of this repo, and adding one to
 * guard a single import is not worth a package. This throws the moment the
 * module is evaluated in a browser, which is the same protection at the only
 * point that matters — and it fails loudly in development rather than shipping
 * a secret quietly.
 */
if (typeof window !== 'undefined') {
  throw new Error('This module is server-only and must never reach the browser.')
}


/**
 * The app session token, issued after SSO and carried by the iframe.
 *
 * HMAC-signed compact JWS, hand-rolled on node:crypto rather than pulling a JWT
 * library. Two reasons: this repo has no JWT dependency today and adding one to
 * a Next build for a fixed HS256 case earns nothing, and the surface here is
 * genuinely small — sign, verify, expire.
 *
 * WHAT THIS TOKEN IS NOT. It is not a CRM credential and it never carries one.
 * The browser holds this and only this; every CRM and 0nMCP token stays on the
 * server, resolved per request from the install. If a customer opens devtools
 * on the Custom Page, the worst thing they can find is their own session.
 *
 * Short-lived on purpose (15 minutes). The iframe re-runs the SSO handshake to
 * refresh, which is cheap because the parent already holds the context — so a
 * leaked token has a small window and no refresh token exists to steal.
 */

const ALG = { alg: 'HS256', typ: 'JWT' }
/**
 * EIGHT HOURS, not fifteen minutes.
 *
 * Fifteen minutes is a sensible lifetime for a token that is refreshed. This
 * one is not: useSso settles ONCE per mount, so when it expired the page simply
 * began failing, and the next render fell through to the sign-in gate. Someone
 * with the Custom Page open in a tab — which is exactly how a Custom Page is
 * used — got thrown out mid-sentence and read it as "the login is broken".
 *
 * Eight hours matches the boot cookie the OAuth callback already issues, so the
 * two front doors now agree on how long a session lasts instead of disagreeing
 * by a factor of thirty-two. It is scoped to one company, verified server-side
 * on every call, and re-minted by a handshake the parent can repeat at will.
 */
const TTL_SECONDS = 8 * 60 * 60

export interface AppClaims {
  /** CRM user id from the SSO payload. */
  sub: string
  /** Agency id — every API route scopes to this. */
  companyId: string
  role?: string
  activeLocationId?: string
  email?: string
}

interface Signed extends AppClaims {
  iat: number
  exp: number
}

const b64 = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64url')

function secret(): string {
  const s = process.env.APP_JWT_SECRET
  if (!s) throw new Error('APP_JWT_SECRET is not set')
  return s
}

function sign(data: string): string {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url')
}

export function issueAppJwt(claims: AppClaims, ttlSeconds = TTL_SECONDS): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: Signed = { ...claims, iat: now, exp: now + ttlSeconds }
  const head = `${b64(JSON.stringify(ALG))}.${b64(JSON.stringify(payload))}`
  return `${head}.${sign(head)}`
}

export type VerifyResult =
  | { ok: true; claims: Signed }
  | { ok: false; error: string }

/**
 * Verify and decode. Fails closed on every ambiguity.
 *
 * The signature is compared in constant time and the algorithm is pinned to
 * HS256 — accepting whatever the header claims is the classic JWT hole, where
 * a token arrives saying alg:none and gets waved through.
 */
export function verifyAppJwt(token: string | null | undefined): VerifyResult {
  if (!token) return { ok: false, error: 'missing token' }
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, error: 'malformed token' }

  const [h, p, sig] = parts

  let header: { alg?: string }
  try {
    header = JSON.parse(Buffer.from(h, 'base64url').toString())
  } catch {
    return { ok: false, error: 'malformed header' }
  }
  if (header.alg !== 'HS256') return { ok: false, error: 'unexpected algorithm' }

  const expected = sign(`${h}.${p}`)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'bad signature' }
  }

  let claims: Signed
  try {
    claims = JSON.parse(Buffer.from(p, 'base64url').toString())
  } catch {
    return { ok: false, error: 'malformed payload' }
  }

  if (!claims.exp || claims.exp * 1000 < Date.now()) return { ok: false, error: 'expired' }
  if (!claims.companyId || !claims.sub) return { ok: false, error: 'incomplete claims' }

  return { ok: true, claims }
}

/** Pull the token from an Authorization header. */
export function bearer(req: { headers: { get(name: string): string | null } }): string | null {
  const h = req.headers.get('authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7) : null
}
