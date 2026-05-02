/**
 * Particle Field — 30 small dots that twinkle and drift slowly. Pure SVG
 * with SMIL — no JS work, no canvas. Layer above ConicMeshBg or AuroraBg.
 */
function pseudo(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export default function ParticleField({
  count = 30,
  color = '#6EE05A',
  className = '',
}: {
  count?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => {
        const cx = pseudo(i, 11) * 1200
        const cy = pseudo(i, 13) * 800
        const r = 0.8 + pseudo(i, 17) * 1.4
        const drift = 30 + pseudo(i, 19) * 60
        const dur = 8 + pseudo(i, 23) * 10
        const delay = pseudo(i, 29) * 8
        return (
          <g key={`p-${i}`}>
            <circle cx={cx} cy={cy} r={r} fill={color} opacity={0}>
              <animate
                attributeName="opacity"
                values="0;0.5;0"
                dur={`${dur.toFixed(2)}s`}
                begin={`${delay.toFixed(2)}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                values={`${cy};${cy - drift};${cy}`}
                dur={`${dur.toFixed(2)}s`}
                begin={`${delay.toFixed(2)}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )
      })}
    </svg>
  )
}
