'use client'

/**
 * Video Background — 0nMCP ambient loop via YouTube embed
 * Used on hero sections, signup, login, and pricing pages
 * Falls back to local grid-bg.mp4 if YouTube embed fails
 */
export function VideoBg({ opacity = 0.15, overlay = true }: { opacity?: number; overlay?: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* YouTube embed — autoplay, muted, loop, no controls */}
      <iframe
        src="https://www.youtube.com/embed/tFcjLetT-IA?autoplay=1&mute=1&loop=1&playlist=tFcjLetT-IA&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&iv_load_policy=3"
        allow="autoplay; encrypted-media"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '180%',
          height: '180%',
          transform: 'translate(-50%, -50%)',
          border: 'none',
          opacity,
          pointerEvents: 'none',
        }}
        tabIndex={-1}
        aria-hidden="true"
      />
      {overlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(2,8,16,0.5) 0%, rgba(2,8,16,0.8) 70%, rgba(2,8,16,1) 100%)',
          }}
        />
      )}
    </div>
  )
}
