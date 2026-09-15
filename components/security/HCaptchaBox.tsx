'use client'

/**
 * The hCaptcha checkbox, for any public form.
 *
 * Mike, 2026-09-15: "This is for forms moving forward to stop spam."
 *
 * Renders nothing at all when no site key is configured, and reports that
 * through `onToken(null, { configured: false })` so a form can tell "the user
 * has not ticked it yet" apart from "this deployment has no captcha" and avoid
 * blocking its own submit button on a widget that will never appear.
 *
 * The script is loaded once per page and shared; React strict mode mounts twice
 * in development, so the render is keyed to a container that is cleared first.
 */

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window { hcaptcha?: any; __hcaptchaLoading?: Promise<void> }
}

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '6588d920-772a-457e-96e6-8a285098d46a'
const SCRIPT = 'https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off'

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.hcaptcha) return Promise.resolve()
  if (window.__hcaptchaLoading) return window.__hcaptchaLoading
  window.__hcaptchaLoading = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = SCRIPT
    el.async = true
    el.defer = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error('hCaptcha script blocked or unreachable'))
    document.head.appendChild(el)
  })
  return window.__hcaptchaLoading
}

export interface HCaptchaBoxProps {
  /** Fires with the token, or null when it is cleared, expired or unavailable. */
  onToken: (token: string | null, meta: { configured: boolean }) => void
  theme?: 'light' | 'dark'
  className?: string
}

export default function HCaptchaBox({ onToken, theme = 'dark', className }: HCaptchaBoxProps) {
  const box = useRef<HTMLDivElement | null>(null)
  const widget = useRef<string | null>(null)
  const cb = useRef(onToken)
  cb.current = onToken
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let dead = false
    if (!SITE_KEY) { cb.current(null, { configured: false }); return }

    loadScript()
      .then(() => {
        if (dead || !box.current || !window.hcaptcha) return
        box.current.innerHTML = ''
        widget.current = window.hcaptcha.render(box.current, {
          sitekey: SITE_KEY,
          theme,
          callback: (t: string) => cb.current(t, { configured: true }),
          'expired-callback': () => cb.current(null, { configured: true }),
          'error-callback': () => cb.current(null, { configured: true }),
        })
      })
      .catch(() => {
        /*
          An ad blocker or a network rule can stop the script reaching the page.
          Treating that as "not configured" lets a real person still sign up;
          the server is the thing that actually enforces, and it refuses a
          missing token only when it holds a secret.
        */
        if (dead) return
        setFailed(true)
        cb.current(null, { configured: false })
      })

    return () => {
      dead = true
      try { if (widget.current && window.hcaptcha) window.hcaptcha.remove(widget.current) } catch { /* already gone */ }
      widget.current = null
    }
  }, [theme])

  if (!SITE_KEY || failed) return null
  return <div ref={box} className={className} />
}
