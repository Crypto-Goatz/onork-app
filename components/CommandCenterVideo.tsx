'use client'

import { useRef, useState } from 'react'
import { Play } from 'lucide-react'

/**
 * The walkthrough player.
 *
 * `preload="none"` plus a poster is the whole point: the file is 24 MB, and a
 * landing page that spends 24 MB before anyone has decided to watch is a
 * landing page people leave. The poster is 28 KB, so the hero paints instantly
 * and the video downloads only when someone presses play.
 *
 * Controls appear after the first play rather than sitting on the poster — the
 * first interaction should be one obvious target, not a scrubber bar.
 */
export default function CommandCenterVideo({ caption = 'Agency Command Center — the full walkthrough, about four minutes.' }: { caption?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)

  function start() {
    const v = ref.current
    if (!v) return
    setStarted(true)
    v.play().catch(() => {
      // Autoplay policies can refuse a programmatic play; the native controls
      // are visible by then, so the user can start it themselves.
    })
  }

  return (
    <figure className="m-0">
      <div className="relative overflow-hidden rounded-2xl border border-[#30363d] bg-black shadow-[0_24px_70px_-20px_rgba(0,0,0,0.8)]">
        <video
          ref={ref}
          className="block aspect-video w-full"
          poster="/video/agency-command-center-poster.jpg"
          preload="none"
          controls={started}
          playsInline
          onPlay={() => setStarted(true)}
        >
          <source src="/video/agency-command-center.mp4" type="video/mp4" />
          Your browser cannot play this video.{' '}
          <a href="/video/agency-command-center.mp4" className="underline">
            Download it instead
          </a>
          .
        </video>

        {!started && (
          <button
            type="button"
            onClick={start}
            aria-label="Play the Agency Command Center walkthrough"
            className="group absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/15"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#6EE05A] shadow-[0_10px_40px_-8px_rgba(110,224,90,0.7)] transition-transform group-hover:scale-105">
              <Play
                className="ml-1 h-8 w-8 text-[#0d1117]"
                fill="currentColor"
                aria-hidden="true"
              />
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-3 text-sm text-[#8b949e]">{caption}</figcaption>
    </figure>
  )
}
