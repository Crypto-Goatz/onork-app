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
  const [sso, setSso] = useState<Sso>({ state: 'pending', token: null, user: null, error: null })
  // Guards the whole handshake against a second message arriving late, a
  // remount in strict mode, or the timeout firing after a real answer.
  const settled = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const finish = (next: Sso) => {
      if (settled.current) return
      settled.current = true
      if (timer) clearTimeout(timer)
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
          finish({ state: 'rejected', token: null, user: null, error: json?.error || 'Could not verify this session.' })
          return
        }
        try {
          sessionStorage.setItem(STORAGE_KEY, json.token)
        } catch {
          // Private mode or a blocked storage partition. The token still works
          // for this render; only the reload survives it, so carry on.
        }
        finish({ state: 'authed', token: json.token, user: json.user ?? null, error: null })
      } catch {
        finish({ state: 'rejected', token: null, user: null, error: 'Could not reach the sign-in service.' })
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
          finish({ state: 'authed', token: json.token, user: json.user ?? null, error: null })
          return
        }
      } catch {
        // Network error — fall through to standalone rather than hang.
      }
      finish({ state: 'standalone', token: null, user: null, error: null })
    }

    function onMessage(event: MessageEvent) {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.message !== 'REQUEST_USER_DATA_RESPONSE') return
      const payload = data.payload
      if (typeof payload !== 'string' || !payload) return
      void exchange(payload)
    }

    // A token from earlier in this tab is reused rather than re-handshaking.
    // Now that the app has more than one page, a fresh handshake per navigation
    // would mean every page waits on a postMessage round trip before it can load
    // anything — and the parent has no reason to answer faster the fifth time.
    // Expiry is still enforced server-side, so a stale token simply 401s and the
    // next mount asks again.
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY)
      if (cached && !isExpired(cached)) {
        setSso({ state: 'authed', token: cached, user: null, error: null })
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

    timer = setTimeout(() => {
      // The parent never answered. Same fallback as the no-iframe case — a
      // direct session may still get us in.
      void standaloneOrMint()
    }, HANDSHAKE_TIMEOUT_MS)

    return () => {
      window.removeEventListener('message', onMessage)
      if (timer) clearTimeout(timer)
    }
  }, [])

  return sso
}

/** The header for an authenticated call, or nothing at all. */
export function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}
