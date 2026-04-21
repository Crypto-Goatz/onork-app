'use client'

/**
 * Video Background — grid-bg ambient loop
 * Used on hero sections, signup, login, and pricing pages
 */
export function VideoBg({ opacity = 0.15, overlay = true }: { opacity?: number; overlay?: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity,
        }}
      >
        <source src="/brand/grid-bg.mp4" type="video/mp4" />
      </video>
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
