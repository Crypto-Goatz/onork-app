// TriggerBurst — the "And build on." centerpiece.
// A power button (0nMCP) is pressed and comes to life from gray, firing every
// service trigger outward at once on a seamless ~6.5s loop. Pure SVG + CSS
// animation (no JS at runtime), SSR-friendly, respects prefers-reduced-motion.
// Glyphs are Lucide icon path data (same paths lucide-react ships).

const CX = 300
const CY = 300
const RIM_ICON = 216 // radius of the service icons
const RAY_END = 190 // where each spoke stops (just inside the icon)
const CORE_EDGE = 52 // where each spoke starts (edge of the core)
const ICON_SCALE = 1.18
const POWER_SCALE = 1.7
const GREEN = '110,224,90'
const CYAN = '0,212,255'
const GRAY = 'rgba(150,158,170,.45)'

// Lucide glyph inner-markup (24×24, stroke-based) — the services 0nMCP fires.
const ICONS: Record<string, string> = {
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  text: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  social:
    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  auto: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  calendar:
    '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  payments: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  crm: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  ai: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  web: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
}
const ORDER = ['mail', 'text', 'social', 'auto', 'calendar', 'payments', 'phone', 'bell', 'crm', 'ai', 'web', 'cart']
const POWER = '<path d="M12 2v10"/><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>'

const STROKE = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const CSS = `
.tb-power-press{transform-box:fill-box;transform-origin:center;animation:tb-press var(--tb-dur) cubic-bezier(.34,1.56,.5,1) infinite}
.tb-alive{animation:tb-alive var(--tb-dur) cubic-bezier(.33,0,.2,1) infinite}
.tb-core-glow{transform-box:fill-box;transform-origin:center;animation:tb-core-glow var(--tb-dur) cubic-bezier(.33,0,.2,1) infinite}
.tb-ray{animation:tb-ray var(--tb-dur) cubic-bezier(.16,.84,.44,1) infinite}
.tb-particle{animation:tb-particle var(--tb-dur) cubic-bezier(.4,0,.2,1) infinite}
.tb-halo{transform-box:fill-box;transform-origin:center;animation:tb-halo var(--tb-dur) cubic-bezier(.2,.7,.3,1) infinite}
.tb-shock{animation:tb-shock var(--tb-dur) cubic-bezier(.16,.8,.3,1) infinite}
.tb-spin{transform-box:fill-box;transform-origin:center;animation:tb-spin 22s linear infinite}
.tb-guide{animation:tb-breathe var(--tb-dur) ease-in-out infinite}
@keyframes tb-press{0%,14%{transform:scale(1)}18%{transform:scale(.88)}23%{transform:scale(1.06)}28%{transform:scale(1)}100%{transform:scale(1)}}
@keyframes tb-alive{0%,15%{opacity:0}22%{opacity:1}40%{opacity:1}82%{opacity:0}100%{opacity:0}}
@keyframes tb-core-glow{0%,15%{transform:scale(.5);opacity:0}23%{transform:scale(1.15);opacity:.95}40%{transform:scale(1);opacity:.7}82%{opacity:0}100%{opacity:0}}
@keyframes tb-ray{0%,16%{stroke-dashoffset:var(--tb-len);opacity:0}24%{stroke-dashoffset:0;opacity:1}36%{opacity:.9}84%{opacity:.05}100%{stroke-dashoffset:0;opacity:0}}
@keyframes tb-particle{0%,17%{offset-distance:0%;opacity:0}20%{opacity:1}25%{offset-distance:100%;opacity:1}31%{offset-distance:100%;opacity:0}100%{opacity:0}}
@keyframes tb-halo{0%,21%{transform:scale(.3);opacity:0}30%{transform:scale(1.7);opacity:.55}52%{transform:scale(2.5);opacity:0}100%{opacity:0}}
@keyframes tb-shock{0%,16%{r:42px;opacity:0}25%{opacity:.5}70%{r:255px;opacity:0}100%{r:255px;opacity:0}}
@keyframes tb-spin{to{transform:rotate(360deg)}}
@keyframes tb-breathe{0%,100%{opacity:.22}50%{opacity:.42}}
@media (prefers-reduced-motion:reduce){
  .tb-power-press,.tb-alive,.tb-core-glow,.tb-ray,.tb-particle,.tb-halo,.tb-shock,.tb-spin,.tb-guide{animation:none}
  .tb-ray{stroke-dashoffset:0;opacity:.45}.tb-alive{opacity:1}
}`

export default function TriggerBurst() {
  const len = RAY_END - CORE_EDGE
  const nodes = ORDER.map((key, k) => {
    const a = (k / ORDER.length) * Math.PI * 2 - Math.PI / 2
    return {
      key,
      x0: CX + Math.cos(a) * CORE_EDGE,
      y0: CY + Math.sin(a) * CORE_EDGE,
      x1: CX + Math.cos(a) * RAY_END,
      y1: CY + Math.sin(a) * RAY_END,
      ix: CX + Math.cos(a) * RIM_ICON,
      iy: CY + Math.sin(a) * RIM_ICON,
    }
  })

  return (
    <div className="relative max-w-md mx-auto w-full">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <svg
        viewBox="0 0 600 600"
        className="w-full h-auto overflow-visible"
        style={{ ['--tb-dur' as string]: '6.5s' } as React.CSSProperties}
        role="img"
        aria-label="0nMCP fires every service trigger at once"
      >
        <defs>
          <filter id="tb-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="tb-soft" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <radialGradient id="tb-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`rgba(${GREEN},1)`} />
            <stop offset="45%" stopColor={`rgba(${GREEN},.5)`} />
            <stop offset="100%" stopColor={`rgba(${CYAN},0)`} />
          </radialGradient>
          <radialGradient id="tb-ray-grad" cx="0%" cy="50%" r="100%">
            <stop offset="0%" stopColor={`rgba(${GREEN},1)`} />
            <stop offset="100%" stopColor={`rgba(${CYAN},.85)`} />
          </radialGradient>
        </defs>

        {/* breathing guide rings */}
        {[104, 160, RIM_ICON].map((r, i) => (
          <circle
            key={`g${r}`}
            cx={CX}
            cy={CY}
            r={r}
            fill="none"
            stroke={`rgba(${GREEN},.1)`}
            strokeWidth={1}
            className="tb-guide"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}

        {/* shockwaves */}
        {[0, 1, 2].map((i) => (
          <circle
            key={`s${i}`}
            cx={CX}
            cy={CY}
            r={42}
            fill="none"
            stroke={`rgba(${GREEN},.8)`}
            strokeWidth={2.4 - i * 0.6}
            filter="url(#tb-glow)"
            className="tb-shock"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}

        {/* spokes + charge particles */}
        {nodes.map((n) => (
          <line
            key={`r${n.key}`}
            x1={n.x0}
            y1={n.y0}
            x2={n.x1}
            y2={n.y1}
            stroke="url(#tb-ray-grad)"
            strokeWidth={2}
            strokeLinecap="round"
            filter="url(#tb-glow)"
            className="tb-ray"
            style={{ ['--tb-len' as string]: len, strokeDasharray: len, strokeDashoffset: len } as React.CSSProperties}
          />
        ))}
        {nodes.map((n) => (
          <circle
            key={`p${n.key}`}
            r={3.2}
            fill="#fff"
            filter="url(#tb-glow)"
            className="tb-particle"
            style={
              { offsetPath: `path("M ${n.x0} ${n.y0} L ${n.x1} ${n.y1}")`, offsetRotate: '0deg' } as React.CSSProperties
            }
          />
        ))}

        {/* service icons — gray at rest, ignite green on the burst */}
        {nodes.map((n) => (
          <g key={`i${n.key}`} transform={`translate(${n.ix},${n.iy})`}>
            <circle cx={0} cy={0} r={17} fill="none" stroke={`rgba(${GREEN},.9)`} strokeWidth={1.4} className="tb-halo" />
            <g transform={`translate(${-12 * ICON_SCALE},${-12 * ICON_SCALE}) scale(${ICON_SCALE})`}>
              <g {...STROKE} stroke={GRAY} dangerouslySetInnerHTML={{ __html: ICONS[n.key] }} />
              <g
                {...STROKE}
                stroke={`rgba(${GREEN},1)`}
                filter="url(#tb-glow)"
                className="tb-alive"
                dangerouslySetInnerHTML={{ __html: ICONS[n.key] }}
              />
            </g>
          </g>
        ))}

        {/* center power button — pressed and brought to life */}
        <g className="tb-power-press">
          <circle cx={CX} cy={CY} r={96} fill="url(#tb-core)" filter="url(#tb-soft)" className="tb-core-glow" />
          <circle
            cx={CX}
            cy={CY}
            r={50}
            fill="none"
            stroke={`rgba(${GREEN},.45)`}
            strokeWidth={1.5}
            strokeDasharray="5 11"
            className="tb-spin"
          />
          <circle cx={CX} cy={CY} r={40} fill="#0f151d" stroke={GRAY} strokeWidth={2} />
          <circle
            cx={CX}
            cy={CY}
            r={40}
            fill="none"
            stroke={`rgba(${GREEN},1)`}
            strokeWidth={2}
            filter="url(#tb-glow)"
            className="tb-alive"
          />
          <g transform={`translate(${CX},${CY}) translate(${-12 * POWER_SCALE},${-12 * POWER_SCALE}) scale(${POWER_SCALE})`}>
            <g {...STROKE} stroke={GRAY} dangerouslySetInnerHTML={{ __html: POWER }} />
            <g
              {...STROKE}
              stroke={`rgba(${GREEN},1)`}
              filter="url(#tb-glow)"
              className="tb-alive"
              dangerouslySetInnerHTML={{ __html: POWER }}
            />
          </g>
        </g>
      </svg>
    </div>
  )
}
