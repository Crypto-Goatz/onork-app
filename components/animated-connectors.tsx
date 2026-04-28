/**
 * Background workflow connectors — heavily blurred bezier paths in 0n
 * brand colors with a traveling pulse along each one. SVG + SMIL only.
 * Sits absolutely positioned behind content; the blur keeps it from
 * competing with foreground text.
 */

interface ConnectorPath {
  d: string
  color: string
  dur: number
  delay: number
}

const PATHS: ConnectorPath[] = [
  { d: 'M -100 200 C 250 80, 600 420, 1300 180', color: '#7ed957', dur: 14, delay: 0 },
  { d: 'M -100 540 C 350 420, 700 720, 1300 480', color: '#00d4ff', dur: 16, delay: 3 },
  { d: 'M -100 360 C 300 600, 800 120, 1300 380', color: '#a78bfa', dur: 18, delay: 6 },
  { d: 'M -100 700 C 400 580, 900 820, 1300 640', color: '#f59e0b', dur: 20, delay: 9 },
  { d: 'M -100 60 C 450 320, 850 -40, 1300 240', color: '#7ed957', dur: 17, delay: 12 },
]

interface AnimatedConnectorsProps {
  className?: string
  intensity?: number
}

export default function AnimatedConnectors({
  className = '',
  intensity = 0.35,
}: AnimatedConnectorsProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <filter id="conn-blur-mp" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
        </filter>
        <filter id="pulse-blur-mp" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
        </filter>
      </defs>

      <g filter="url(#conn-blur-mp)">
        {PATHS.map((p, i) => (
          <path
            key={`p-${i}`}
            d={p.d}
            stroke={p.color}
            strokeWidth={2.5}
            strokeOpacity={intensity * 0.55}
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </g>

      <g filter="url(#pulse-blur-mp)">
        {PATHS.map((p, i) => (
          <circle key={`c-${i}`} r={5} fill={p.color} fillOpacity={intensity * 1.6}>
            <animateMotion
              dur={`${p.dur}s`}
              begin={`${p.delay}s`}
              repeatCount="indefinite"
              path={p.d}
              rotate="auto"
            />
            <animate
              attributeName="r"
              values="2;6;2"
              dur={`${p.dur}s`}
              begin={`${p.delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="fill-opacity"
              values={`0;${(intensity * 1.6).toFixed(2)};0`}
              dur={`${p.dur}s`}
              begin={`${p.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </g>
    </svg>
  )
}
