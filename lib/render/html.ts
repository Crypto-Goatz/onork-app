import { declarations, type CSS } from './tokens'

/**
 * HTML assembly primitives.
 *
 * The escaping here is not defensive politeness — every string that reaches
 * these functions came from a form an agency filled in, or from a language
 * model. A business name of `Bob's Tools & Co <script>` must render as text on
 * a live customer page, not execute. There is exactly one way to put text into
 * the output and it escapes.
 */

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c])
}

/** For values going into an href/src. Blocks javascript: and data: URLs. */
export function safeUrl(value: unknown): string {
  const v = String(value ?? '').trim()
  if (!v) return '#'
  // A `javascript:` href is script execution on the published page; `data:`
  // can carry an HTML document. Anything not clearly a link becomes '#'.
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(v)) return escapeHtml(v)
  return '#'
}

export type StyleMode = 'inline' | 'class'

/**
 * Emits either `style="..."` or `class="..."` from the same CSS objects, and
 * collects the stylesheet when in class mode.
 *
 * Identical rules collapse to one class, which keeps the widget bundle small
 * and — more usefully — makes the output deterministic enough to assert on in
 * a golden test.
 */
export class Styler {
  private rules = new Map<string, string>() // declarations → class name
  constructor(private mode: StyleMode, private prefix = 'w0n') {}

  attr(...parts: CSS[]): string {
    const css = Object.assign({}, ...parts) as CSS
    const decl = declarations(css)
    if (!decl) return ''
    if (this.mode === 'inline') return ` style="${escapeHtml(decl)}"`

    let name = this.rules.get(decl)
    if (!name) {
      name = `${this.prefix}-${this.rules.size.toString(36)}`
      this.rules.set(decl, name)
    }
    return ` class="${name}"`
  }

  /** The stylesheet for class mode. Empty string in inline mode. */
  stylesheet(): string {
    if (this.mode === 'inline') return ''
    return [...this.rules.entries()].map(([decl, name]) => `.${name}{${decl}}`).join('\n')
  }
}

export function tag(
  name: string,
  attrs: string,
  children: string | string[] = ''
): string {
  const inner = Array.isArray(children) ? children.join('') : children
  const VOID = ['img', 'br', 'hr', 'input', 'meta', 'link']
  if (VOID.includes(name)) return `<${name}${attrs}>`
  return `<${name}${attrs}>${inner}</${name}>`
}
