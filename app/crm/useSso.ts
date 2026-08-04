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

const STORAGE_KEY = 'oncore.app.jwt'
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

    function onMessage(event: MessageEvent) {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.message !== 'REQUEST_USER_DATA_RESPONSE') return
      const payload = data.payload
      if (typeof payload !== 'string' || !payload) return
      void exchange(payload)
    }

    // Not in an iframe — nobody to ask. Say so immediately.
    if (window.parent === window) {
      setSso({ state: 'standalone', token: null, user: null, error: null })
      settled.current = true
      return
    }

    window.addEventListener('message', onMessage)
    // '*' because the parent's origin is the agency's white-label domain and is
    // not knowable in advance. Safe here only because this message is a request
    // and carries nothing.
    window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*')

    timer = setTimeout(() => {
      finish({ state: 'standalone', token: null, user: null, error: null })
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
