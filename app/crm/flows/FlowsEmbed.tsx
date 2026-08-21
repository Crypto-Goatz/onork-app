'use client'

/**
 * FLOWS — 0nTask's flow builder, running inside 0nCore.
 *
 * Mike, 2026-08-21: *"why not just make it one and the same? 0nTask and 0nCore
 * run within the same ecosystem — this is what makes the SSO so great."*
 *
 * WHY EMBED RATHER THAN PORT. There are 2,046 working lines of flow builder in
 * 0ntask-studio (FlowBuilder, FlowStudio, FlowLibrary, FlowWizard). Copying
 * them into Next.js would produce a second implementation that starts identical
 * and drifts — the same disease as three add-on catalogues and two token
 * stores, except this one would be 2,000 lines wide. One builder, two surfaces,
 * and a fix in either place is a fix in both.
 *
 * THE TOKEN GOES BY postMessage, NOT IN THE URL. A `?token=` lands in browser
 * history, in the Referer header of every outbound request the frame makes, and
 * in any log that records query strings. This is the same handshake the CRM
 * uses to hand US a session — we are simply the parent this time, which means
 * the pattern is already proven in this codebase rather than invented here.
 *
 * IT TARGETS AN EXACT ORIGIN. `postMessage(msg, '*')` broadcasts a live
 * credential to whatever happens to be in the frame; if the embed URL were ever
 * changed or redirected, the token would go with it. Naming the origin means a
 * wrong frame gets nothing.
 */
import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, AlertTriangle } from 'lucide-react'

const FLOWS_ORIGIN = 'https://app.0ntask.com'
const FLOWS_URL = `${FLOWS_ORIGIN}/flows?embed=0ncore`

export default function FlowsEmbed({
  token,
  locationId,
}: {
  token: string | null
  locationId: string | null
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'unreachable'>('loading')

  useEffect(() => {
    if (!token) return

    /**
     * Hand the credential over only when the child asks, and only to the exact
     * origin we embedded. A child that never asks never receives one.
     */
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== FLOWS_ORIGIN) return
      const msg = e.data
      if (!msg || typeof msg !== 'object') return

      if (msg.type === 'ONTASK_REQUEST_AUTH') {
        frame.current?.contentWindow?.postMessage(
          { type: 'ONCORE_AUTH', token, locationId, source: '0ncore' },
          FLOWS_ORIGIN,
        )
      }
      if (msg.type === 'ONTASK_READY') setState('ready')
    }

    window.addEventListener('message', onMessage)

    /**
     * Push the token once on load as well as answering a request.
     *
     * The child may be a build that does not know to ask — 0nTask's builder
     * predates this embed. Pushing covers that case; the request handler covers
     * a future build that asks properly. Neither depends on the other.
     */
    const push = setTimeout(() => {
      frame.current?.contentWindow?.postMessage(
        { type: 'ONCORE_AUTH', token, locationId, source: '0ncore' },
        FLOWS_ORIGIN,
      )
    }, 1200)

    /**
     * A deadline, for the same reason the SSO hook has one: "loading" must not
     * be a terminal state. If the frame never speaks we say so and offer the
     * direct link, rather than leaving a spinner that teaches the user the
     * product is broken.
     */
    const deadline = setTimeout(() => {
      setState((s) => (s === 'ready' ? s : 'unreachable'))
    }, 12000)

    return () => {
      window.removeEventListener('message', onMessage)
      clearTimeout(push)
      clearTimeout(deadline)
    }
  }, [token, locationId])

  if (!token) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div className="max-w-md">
          <AlertTriangle className="mx-auto h-6 w-6 text-[#f59e0b]" />
          <h2 className="mt-3 text-lg font-semibold">Flows needs your 0n key</h2>
          <p className="mt-2 text-sm text-white/55">
            Your session did not carry a token. Reload this page, or open Setup &amp; Keys to
            check your account is connected.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      {state === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-[#0d1117]">
          <div className="text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#6EE05A]" />
            <p className="mt-3 text-sm text-white/50">Opening your flow builder…</p>
          </div>
        </div>
      )}

      {state === 'unreachable' && (
        <div className="absolute inset-0 grid place-items-center bg-[#0d1117] px-6">
          <div className="max-w-md text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-[#f59e0b]" />
            <h2 className="mt-3 text-lg font-semibold">The flow builder didn&apos;t answer</h2>
            {/* Honest about which half is at fault, and never a dead end. */}
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              It loaded but never confirmed it was ready. Your flows are safe — they live in
              0nTask, not here. You can open it directly while we look into the embed.
            </p>
            <a
              href={FLOWS_ORIGIN}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6EE05A] px-5 py-3 text-sm font-semibold text-[#062312] transition hover:opacity-90"
            >
              Open 0nTask Flows <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      <iframe
        ref={frame}
        src={FLOWS_URL}
        title="0n Flows"
        className="h-full w-full border-0"
        // clipboard-write so copying a .0n export works inside the frame.
        allow="clipboard-write"
        onLoad={() => setState((s) => (s === 'unreachable' ? s : s))}
      />
    </div>
  )
}
