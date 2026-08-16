import { NextRequest, NextResponse } from 'next/server'
import { decryptSsoPayload } from '@/lib/crm/sso'
import { issueAppJwt } from '@/lib/auth/app-jwt'
import { ensureOnAccount } from '@/lib/account/ensure'

/**
 * POST /api/sso — turn the platform's encrypted user context into an app session.
 *
 * THE HANDSHAKE. Our dashboard runs as a Custom Page inside the CRM. The iframe
 * asks its parent for the user context, the parent answers with a blob encrypted
 * under our SSO shared secret, and this route is the only place that blob is
 * ever opened. What comes back to the browser is our own short-lived JWT — never
 * the context, never a CRM token.
 *
 * THE ENCRYPTION IS THE AUTHENTICATION. There is no origin allowlist here and
 * that is a decision, not an oversight: agencies white-label the CRM onto their
 * own domains, so the set of legitimate parent origins is unbounded and any list
 * we wrote would either lock out real customers or be wide enough to be
 * decorative. What actually proves the caller is a real install is that they
 * produced ciphertext under a secret only the platform and we hold. An attacker
 * on any origin can call this route all day; without the secret every call ends
 * in the same 401.
 *
 * WHAT AN ATTACKER GETS FROM A FORGED PAYLOAD: one bit, "that wasn't valid".
 * Every failure returns the same status and the same message, so this cannot be
 * used to distinguish a wrong key from a mangled one.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * A crude in-process throttle. This is a decrypt oracle in the narrow sense
 * that it says yes or no to a guess, so unlimited guessing should not be free.
 * Memory-only and per-instance — genuinely weak, and it is not the control the
 * security rests on (a 128-bit shared secret is). It exists so a loop against
 * this route costs something.
 */
const attempts = new Map<string, { n: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 30

function throttled(ip: string): boolean {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { n: 1, resetAt: now + WINDOW_MS })
    if (attempts.size > 5000) attempts.clear() // crude bound; this map is not a store
    return false
  }
  rec.n += 1
  return rec.n > MAX_PER_WINDOW
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (throttled(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many attempts.' }, { status: 429 })
  }

  let body: { encryptedData?: string; key?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not read the session context.' }, { status: 400 })
  }

  // The platform's payload field has been called both things across versions.
  const payload = body.encryptedData || body.key
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'Could not read the session context.' }, { status: 400 })
  }

  // EVERY CANDIDATE KEY IS TRIED, in order, and the first that decrypts wins.
  //
  // This is not belt-and-braces — it is recovery from a real failure. A key was
  // once saved to Vercel already-encrypted, so the running process received the
  // literal envelope `{"v":"v2","c":"…"}` as its secret. Decryption then failed
  // on every request, SSO fell through to the sign-in screen, and inside an
  // iframe that screen cannot work at all. One malformed variable took the whole
  // in-CRM experience down and looked like a login bug.
  //
  // So: skip anything that is obviously an envelope rather than a key, and try
  // the others. Which one worked is logged BY NAME — never by value — so the
  // config can be corrected instead of quietly depending on the fallback.
  // ONE KEY PER APP, ALL TRIED — never one key overwritten per app.
  //
  // Each marketplace app has its OWN shared secret, and the custom page of each
  // decrypts only under its own. Replacing CRM_SSO_KEY with a newer app's secret
  // would silently break every existing custom page: the handshake would fail,
  // SSO would fall through to a sign-in screen, and that screen cannot work in
  // an iframe. Adding a candidate costs one failed decrypt attempt; overwriting
  // costs the surface that was already working.
  const CANDIDATES = [
    'CRM_SSO_KEY',
    'CRM_LEADSCOUT_SSO_KEY',
    'CRM_MARKETPLACE_SHARED_SECRET',
    'CRM_AGENCY_SSO_KEY',
  ] as const

  /** A Vercel encryption envelope stored as a value. Never a usable key. */
  const isEnvelope = (v: string) => {
    if (!v.startsWith('eyJ2Ijoidj')) return false
    try {
      const parsed = JSON.parse(Buffer.from(v, 'base64').toString('utf8'))
      return parsed?.v === 'v2' && typeof parsed?.c === 'string'
    } catch {
      return false
    }
  }

  const usable = CANDIDATES.map((name) => [name, (process.env[name] || '').trim()] as const)
    .filter(([name, value]) => {
      if (!value) return false
      if (isEnvelope(value)) {
        console.error(`[sso] ${name} holds a Vercel encryption envelope, not a key — re-add it as type:plain. Skipping.`)
        return false
      }
      return true
    })

  if (!usable.length) {
    // Ours to fix, not the caller's — say so distinctly and loudly in logs.
    console.error('[sso] No usable SSO key is configured; no Custom Page session can be issued.')
    return NextResponse.json({ ok: false, error: 'Single sign-on is not configured.' }, { status: 503 })
  }

  let result: ReturnType<typeof decryptSsoPayload> = { ok: false } as ReturnType<typeof decryptSsoPayload>
  for (const [name, secret] of usable) {
    result = decryptSsoPayload(payload, secret)
    if (result.ok) {
      if (name !== 'CRM_SSO_KEY') console.warn(`[sso] decrypted with ${name}; set CRM_SSO_KEY to this value.`)
      break
    }
  }

  if (!result.ok) {
    // ONE message for every failure mode. See the note above.
    console.error(`[sso] payload did not decrypt under any of: ${usable.map(([n]) => n).join(', ')}`)
    return NextResponse.json({ ok: false, error: 'Could not verify this session.' }, { status: 401 })
  }

  const ctx = result.context
  const companyId = String(ctx.companyId || '')
  const userId = String(ctx.userId || '')
  if (!companyId) {
    // A location-only context can't scope an agency dashboard. Refusing beats
    // issuing a token with a blank companyId that every downstream query would
    // then have to remember to check.
    return NextResponse.json({ ok: false, error: 'This session has no agency attached.' }, { status: 403 })
  }

  /**
   * EVERY ENTRY PATH CREATES A 0n ACCOUNT. Until now this one did not: the
   * handshake produced a session and a company and no identity, so a person
   * using the app daily inside their CRM had nothing to attach an add-on to and
   * nothing to carry them into the rest of the ecosystem.
   *
   * Fire-and-forget on purpose. Account creation must never be the reason a
   * sign-in fails — if it errors, the person is still signed in and the next
   * handshake tries again.
   */
  void ensureOnAccount({
    email: typeof ctx.email === 'string' ? ctx.email : null,
    companyId,
    locationId: typeof ctx.activeLocation === 'string' ? ctx.activeLocation : null,
    displayName: typeof ctx.userName === 'string' ? ctx.userName : null,
    source: 'crm_sso',
  }).catch((err) => console.error('[sso] account provisioning failed:', err))

  const token = issueAppJwt({
    sub: userId || companyId,
    companyId,
    role: typeof ctx.role === 'string' ? ctx.role : undefined,
    activeLocationId: typeof ctx.activeLocation === 'string' ? ctx.activeLocation : undefined,
    email: typeof ctx.email === 'string' ? ctx.email : undefined,
  })

  return NextResponse.json({
    ok: true,
    token,
    // Enough to greet the user. Deliberately not the whole context — the client
    // has no use for the rest and anything echoed here is one more thing sitting
    // in a browser.
    user: {
      name: typeof ctx.userName === 'string' ? ctx.userName : null,
      email: typeof ctx.email === 'string' ? ctx.email : null,
      role: typeof ctx.role === 'string' ? ctx.role : null,
      type: typeof ctx.type === 'string' ? ctx.type : null,
    },
  })
}
