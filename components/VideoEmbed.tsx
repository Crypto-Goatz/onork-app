'use client'

/**
 * A YouTube embed that does not load YouTube until someone asks for it.
 *
 * WHY NOT A PLAIN IFRAME. A YouTube iframe pulls roughly half a megabyte of
 * third-party JavaScript and sets cookies on page load, whether or not anyone
 * presses play. On a page whose whole job is to be fast and to be cited, that
 * is a self-inflicted wound: it moves LCP, it drags the SXO score both these
 * pages are measured on, and it drops a tracker on visitors who only came to
 * read.
 *
 * So this renders the poster image and a play button, and swaps in the real
 * iframe on the first click. The visible result is identical; the cost is not.
 *
 * The thumbnail is served by YouTube at a predictable URL, so there is no asset
 * to maintain and no image that goes stale when the video is replaced.
 */
import { useState } from 'react'
import { Play } from 'lucide-react'

export default function VideoEmbed({
  id,
  title,
  className = '',
}: {
  /** The YouTube video id — the part after youtu.be/ */
  id: string
  /** Real title text. It is the accessible name of the button and the frame. */
  title: string
  className?: string
}) {
  const [playing, setPlaying] = useState(false)

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-2xl border border-[#30363d] bg-black ${className}`}
    >
      {playing ? (
        <iframe
          // autoplay is safe here because it is a direct response to a click.
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play: ${title}`}
          className="group absolute inset-0 h-full w-full cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
            alt=""
            loading="lazy"
            // maxres does not exist for every upload; hqdefault always does.
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#6EE05A] shadow-[0_0_40px_rgba(110,224,90,0.45)] transition-transform duration-300 group-hover:scale-110">
            <Play className="ml-0.5 h-6 w-6 text-[#0d1117]" fill="currentColor" />
          </span>
          <span className="absolute inset-x-0 bottom-0 p-4 text-left text-[13px] font-semibold text-white/90">
            {title}
          </span>
        </button>
      )}
    </div>
  )
}
