'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The Custom Page SSO handshake.
 *
 * The CRM loads us in an iframe and will hand over the signed-in user's context
 * — but only when asked. We post REQUEST_USER_DATA to the parent, it replies with
 * a blob encrypted under our shared secret, and we forward that blob to
 * /api/sso, which is the only place it is ever decrypted. What we keep is our
 * own 15-minute JWT.
 *
 * sessionStorage, NOT localStorage. The token dies with the tab, which is the
 * right lifetime for a session inside someone else's app — and it is not shared
 * with other tabs that may be sitting on a different agency.
 *
 * WE VALIDATE NOTHING ABOUT THE SENDER, and that is deliberate. Agencies
 * white-label the CRM onto their own domains, so there is no fixed list of
 * legitimate parent origins to check against. The security lives server-side:
 * a payload that was not encrypted with our secret cannot produce a token, so a
 * hostile parent gains nothing by answering. We are careful in the other
 * direction instead — the request we broadcast carries no secrets, and the JWT
 * we get back is never posted anywhere.
 *
 * IT TIMES OUT INTO 'standalone' RATHER THAN HANGING. Opened directly in a
 * browser there is no parent to answer, and a spinner that never resolves is
 * the worst of the possible outcomes.
 */

export const STORAGE_KEY = 'oncore.app.jwt'
const HANDSHAKE_TIMEOUT_MS = 4000

export type SsoState = 'pending' | 'authed' | 'standalone' | 'rejected'

export interface SsoUser {
  name: string | null
  email: string | null
  role: string | null
  type: string | null
}

export interface Sso {
  state: SsoState
  token: string | null
  user: SsoUser | null
  error: string | null
  /**
   * The workspace the CRM has this frame open in, read off our own token.
   *
   * IT WAS BEING CAST INTO EXISTENCE. CourseApp did
   * `(sso as { activeLocationId?: string }).activeLocationId` to build a
   * fallback publish target — against an interface that has never had the
   * field. The cast compiled, the value was always `undefined`, and the
   * fallback it fed always resolved to '': a recovery path that could not
   * recover, sitting behind a failure it was written to catch.
   *
   * The claim itself was always there (see AppClaims.activeLocationId) — /api/sso
   * puts it in the JWT and nothing surfaced it. Decoding it here rather than
   * echoing it in the /api/sso response means every path that produces a token
   * carries it: the handshake, the boot cookie, and a token cached from earlier
   * in the tab. Null when the token says nothing, never a guess.
   */
  activeLocationId: string | null
}

/**
 * Read one claim without verifying anything — the same convenience-not-security
 * rule as isExpired. Every server route re-verifies the signature before it
 * trusts a single field of this.
 */
function claimsOf(token: string | null): Record<string, unknown> | null {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

/**
 * Read the exp claim without verifying anything.
 *
 * This is a CONVENIENCE check, not a security one — the signature is verified
 * server-side on every call and that is what actually protects anything. All
 * this does is avoid sending a token we already know is dead. Treat anything
 * unreadable as expired, so a malformed value gets replaced rather than reused.
 */
function isExpired(token: string): boolean {
  try {
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    // A 30-second margin: a token that expires mid-flight is a failed request.
    return !claims?.exp || claims.exp * 1000 < Date.now() + 30_000
  } catch {
    return true
  }
}

export function useSso(): Sso {
  const [sso, setSso] = useState<Sso>({ state: 'pending', token: null, user: null, error: null, activeLocationId: null })
  // Guards the whole handshake against a second message arriving late, a
  // remount in strict mode, or the timeout firing after a real answer.
  const settled = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    /**
     * THE ABSOLUTE DEADLINE — pending must not be a terminal state.
     *
     * The handshake already gives up after three asks, and the standalone mint
     * answers in under 200ms. Yet the app has been observed sitting on
     * "Connecting to your CRM…" indefinitely inside a custom menu link on
     * app.rocketclients.com — so some path through this reaches neither
     * `finish()` nor the retry chain, on a host we cannot reproduce locally.
     *
     * Rather than guess which branch, this makes the failure impossible: after
     * DEADLINE_MS the hook settles to `standalone` no matter what. A user who
     * sees a sign-in prompt can act; a user watching a spinner cannot. Every
     * other path calls `finish()` first, so this only ever fires when something
     * has genuinely gone wrong — and `settled` guarantees it cannot override a
     * real answer that arrived late.
     */
    const DEADLINE_MS = 15000
    const deadline = setTimeout(() => {
      if (settled.current) return
      console.warn('[useSso] no answer within 15s — settling to standalone so the UI can render')
      finish({ state: 'standalone', token: null, user: null, error: null, activeLocationId: null })
    }, DEADLINE_MS)

    const finish = (next: Sso) => {
      if (settled.current) return
      settled.current = true
      if (timer) clearTimeout(timer)
      clearTimeout(deadline)
      window.removeEventListener('message', onMessage)
      setSso(next)
    }

    async function exchange(encryptedData: string) {
      try {
        const res = await fetch('/api/sso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encryptedData }),
        })
        const json = await res.json()
        if (!res.ok || !json?.token) {
          finish({ state: 'rejected', token: null, user: null, error: json?.error || 'Could not verify this session.', activeLocationId: null })
          return
        }
        try {
          sessionStorage.setItem(STORAGE_KEY, json.token)
        } catch {
          // Private mode or a blocked storage partition. The token still works
          // for this render; only the reload survives it, so carry on.
        }
        finish({ state: 'authed', token: json.token, user: json.user ?? null, error: null, activeLocationId: locationOf(json.token) })
      } catch {
        finish({ state: 'rejected', token: null, user: null, error: 'Could not reach the sign-in service.', activeLocationId: null })
      }
    }

    // The OTHER front door. Outside the GHL iframe there is no parent to hand us
    // a payload — but the user may be signed in to 0nCORE directly. Ask the
    // server to mint a token from that session; only if there is none are we
    // truly standalone. The token is the same shape the iframe path produces.
    async function standaloneOrMint() {
      try {
        const res = await fetch('/api/auth/standalone-token', { method: 'POST' })
        const json = await res.json().catch(() => null)
        if (res.ok && json?.token) {
          try { sessionStorage.setItem(STORAGE_KEY, json.token) } catch {}
          finish({ state: 'authed', token: json.token, user: json.user ?? null, error: null, activeLocationId: locationOf(json.token) })
          return
        }
      } catch {
        // Network error — fall through to standalone rather than hang.
      }
      finish({ state: 'standalone', token: null, user: null, error: null, activeLocationId: null })
    }

    function onMessage(event: MessageEvent) {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.message !== 'REQUEST_USER_DATA_RESPONSE') return
      const payload = data.payload
      if (typeof payload !== 'string' || !payload) return
      void exchange(payload)
    }

    // Boot handoff — a fresh GHL install (server-side, no sessionStorage access)
    // drops the app JWT in a short-lived cookie. Adopt it, clear the cookie so
    // it's used once, and we're authed without a handshake. THIS is what lands an
    // installer straight in the dashboard instead of on the login gate.
    try {
      const m = document.cookie.match(/(?:^|;\s*)oncore\.boot\.jwt=([^;]+)/)
      if (m) {
        const bootTok = decodeURIComponent(m[1])
        document.cookie = 'oncore.boot.jwt=; Max-Age=0; path=/'
        if (bootTok && !isExpired(bootTok)) {
          try { sessionStorage.setItem(STORAGE_KEY, bootTok) } catch {}
          setSso({ state: 'authed', token: bootTok, user: null, error: null, activeLocationId: locationOf(bootTok) })
          settled.current = true
          return
        }
      }
    } catch { /* cookie unreadable — fall through */ }

    // A token from earlier in this tab is reused rather than re-handshaking.
    // Now that the app has more than one page, a fresh handshake per navigation
    // would mean every page waits on a postMessage round trip before it can load
    // anything — and the parent has no reason to answer faster the fifth time.
    // Expiry is still enforced server-side, so a stale token simply 401s and the
    // next mount asks again.
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY)
      if (cached && !isExpired(cached)) {
        setSso({ state: 'authed', token: cached, user: null, error: null, activeLocationId: locationOf(cached) })
        settled.current = true
        return
      }
      if (cached) sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage unavailable — fall through to a normal handshake.
    }

    // Not in an iframe — no parent to ask. Try a direct session before declaring
    // standalone, so a signed-in agency owner lands straight in the dashboard.
    if (window.parent === window) {
      void standaloneOrMint()
      return
    }

    window.addEventListener('message', onMessage)
    // '*' because the parent's origin is the agency's white-label domain and is
    // not knowable in advance. Safe here only because this message is a request
    // and carries nothing.
    window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*')

    /**
     * ASK AGAIN BEFORE GIVING UP.
     *
     * The parent answers this on its own schedule, and a single unanswered
     * request used to mean an immediate fall-through to standalone — which,
     * framed, renders the sign-in gate. That is the "it acts like it is
     * working, then sends me back to the login screen" report: nothing was
     * wrong with the session, the parent was simply slow or had not attached
     * its listener yet.
     *
     * Three asks, spaced, before conceding. A repeated REQUEST_USER_DATA is
     * free — it carries nothing and the parent is built to answer it.
     */
    let asks = 1
    const ask = () => {
      if (settled.current) return
      if (asks >= 3) {
        // Still nothing. A direct session may get us in; if not, the caller
        // decides what to show.
        void standaloneOrMint()
        return
      }
      asks += 1
      window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*')
      timer = setTimeout(ask, HANDSHAKE_TIMEOUT_MS)
    }
    timer = setTimeout(ask, HANDSHAKE_TIMEOUT_MS)

    return () => {
      window.removeEventListener('message', onMessage)
      if (timer) clearTimeout(timer)
      clearTimeout(deadline)
    }
  }, [])

  return sso
}

/** The location claim, or null. Never a guess and never a cast. */
function locationOf(token: string | null): string | null {
  const v = claimsOf(token)?.activeLocationId
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** The header for an authenticated call, or nothing at all. */
export function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}
