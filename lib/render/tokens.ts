/**
 * The single source of visual truth for exported pages.
 *
 * WHY THIS EXISTS AT ALL. The builder stores style as Tailwind-ish tokens
 * (`py-20`, `rounded-2xl`, `shadow-lg`) because that is what the canvas renders
 * with. Two of our three delivery targets cannot use Tailwind:
 *
 *   hosted page   can link a stylesheet          → classes are fine
 *   funnel widget can inject a scoped stylesheet → classes are fine, prefixed
 *   BLOG POST     no <link>, no <script>         → INLINE STYLES ONLY
 *
 * A blog body is sanitised HTML. If the renderer could only emit class names,
 * the blog target would ship unstyled and the feature would look broken while
 * every test passed. So each token resolves to real CSS declarations here, once,
 * and the serialiser decides whether they become a class rule or a style
 * attribute.
 *
 * It is also the drift guard: canvas and export read the same table, so a
 * spacing change cannot land in one and not the other.
 */

export type CSS = Record<string, string>

const SPACING: Record<string, string> = {
  '0': '0rem', '1': '0.25rem', '2': '0.5rem', '3': '0.75rem', '4': '1rem',
  '5': '1.25rem', '6': '1.5rem', '8': '2rem', '10': '2.5rem', '12': '3rem',
  '14': '3.5rem', '16': '4rem', '20': '5rem', '24': '6rem', '28': '7rem',
  '32': '8rem', '40': '10rem',
}

const RADIUS: Record<string, string> = {
  'rounded-none': '0',
  'rounded-sm': '0.125rem',
  'rounded': '0.25rem',
  'rounded-md': '0.375rem',
  'rounded-lg': '0.5rem',
  'rounded-xl': '0.75rem',
  'rounded-2xl': '1rem',
  'rounded-3xl': '1.5rem',
  'rounded-full': '9999px',
}

const SHADOW: Record<string, string> = {
  'shadow-none': 'none',
  'shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  'shadow': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  'shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  'shadow-2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
}

const TEXT_SIZE: Record<string, string> = {
  'text-xs': '0.75rem', 'text-sm': '0.875rem', 'text-base': '1rem',
  'text-lg': '1.125rem', 'text-xl': '1.25rem', 'text-2xl': '1.5rem',
  'text-3xl': '1.875rem', 'text-4xl': '2.25rem', 'text-5xl': '3rem',
  'text-6xl': '3.75rem',
}

/** `py-20` / `pt-16` / `pb-10` → CSS. Unknown tokens resolve to nothing. */
export function padding(token: string | undefined, side: 'top' | 'bottom' | 'both' = 'both'): CSS {
  if (!token) return {}
  const m = /^p([tby]?)-(\d+)$/.exec(token.trim())
  if (!m) return {}
  const value = SPACING[m[2]]
  if (!value) return {}
  const axis = m[1]
  if (axis === 't') return { 'padding-top': value }
  if (axis === 'b') return { 'padding-bottom': value }
  // `py-N` sets both; callers that store paddingTop and paddingBottom
  // separately pass `side` to take only the half they mean.
  if (side === 'top') return { 'padding-top': value }
  if (side === 'bottom') return { 'padding-bottom': value }
  return { 'padding-top': value, 'padding-bottom': value }
}

export function radius(token?: string): CSS {
  const v = token ? RADIUS[token.trim()] : undefined
  return v === undefined ? {} : { 'border-radius': v }
}

export function shadow(token?: string): CSS {
  const v = token ? SHADOW[token.trim()] : undefined
  return v === undefined ? {} : { 'box-shadow': v }
}

export function textSize(token?: string): CSS {
  const v = token ? TEXT_SIZE[token.trim()] : undefined
  return v === undefined ? {} : { 'font-size': v }
}

export function align(value?: string): CSS {
  if (value === 'center') return { 'text-align': 'center' }
  if (value === 'right') return { 'text-align': 'right' }
  if (value === 'left') return { 'text-align': 'left' }
  return {}
}

/**
 * Accept a colour only if it is a plain hex or a simple rgb()/named value.
 *
 * A style value ends up inside a `style` attribute, so `red; } body { display:none` —
 * or anything with a `url()` or `expression()` — is a CSS injection into a live
 * customer page. The builder writes hex, so anything else is rejected rather
 * than sanitised halfway.
 */
export function colour(prop: string, value?: string): CSS {
  if (!value) return {}
  const v = value.trim()
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return { [prop]: v }
  if (/^rgba?\(\s*[\d.\s,%/]+\)$/.test(v)) return { [prop]: v }
  if (/^[a-zA-Z]{3,20}$/.test(v)) return { [prop]: v }
  return {}
}

export function merge(...parts: CSS[]): CSS {
  return Object.assign({}, ...parts)
}

/** Deterministic serialisation — sorted, so golden tests are stable. */
export function declarations(css: CSS): string {
  return Object.keys(css)
    .sort()
    .map((k) => `${k}:${css[k]}`)
    .join(';')
}
