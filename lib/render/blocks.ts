import type { Block, PageSpec } from '../builder/blocks'
import { escapeHtml, safeUrl, tag, Styler } from './html'
import { align, colour, merge, padding, radius, shadow, type CSS } from './tokens'

/**
 * One renderer per block kind.
 *
 * These deliberately do NOT reuse the canvas components. The canvas is an
 * editing surface — selection rings, hover toolbars, drop targets, insertion
 * slots. Rendering it and stripping the chrome afterwards is how you ship a
 * page with a stray `contenteditable` or a dangling drag handler.
 *
 * THE FALLBACK RULE, ENFORCED HERE. Every editable field is written into the
 * HTML with its real fallback text and tagged `data-blk` / `data-fld`. The
 * personaliser swaps the text node at runtime. A page whose JavaScript never
 * runs — a crawler, an AI bot, a blocked script — still reads correctly, which
 * is the entire audience the agency bought the page to reach.
 */

export interface RenderCtx {
  s: Styler
  page: PageSpec
  /** Blog bodies get no data attributes: they'd be stripped and add noise. */
  personalisable: boolean
}

/** Section shell shared by every block: background, padding, alignment. */
function section(ctx: RenderCtx, block: Block, inner: string): string {
  const st = block.style || {}
  const css: CSS = merge(
    colour('background-color', st.backgroundColor),
    colour('color', st.textColor),
    padding(st.paddingTop, 'top'),
    padding(st.paddingBottom, 'bottom'),
    align(st.align),
    { 'padding-left': '1.5rem', 'padding-right': '1.5rem' }
  )
  const container = ctx.s.attr({
    'max-width': '64rem',
    'margin-left': 'auto',
    'margin-right': 'auto',
  })
  return tag(
    'section',
    `${ctx.s.attr(css)} data-kind="${escapeHtml(block.kind)}"`,
    tag('div', container, inner)
  )
}

/**
 * TWO KEY VOCABULARIES EXIST, AND BOTH ARE REAL.
 *
 * Pages authored natively use the `BLOCK_LIBRARY` names (`headline`, `sub`,
 * `cta`). Pages imported from the drag-drop builder keep the builder's own
 * names (`title`, `subtitle`, `description`, `buttonText`) because `import.ts`
 * maps content keys straight through.
 *
 * A renderer that knows only one of them renders the other as an EMPTY SECTION
 * — correct-looking HTML, right colours and spacing, no words. That is a blank
 * page delivered to a paying customer, and every structural test still passes.
 * So slots resolve against a candidate list instead of a single key.
 */
const SLOT = {
  headline: ['headline', 'title'],
  eyebrow: ['subtitle', 'eyebrow'],
  body: ['body', 'description', 'sub'],
  cta: ['cta', 'buttonText', 'button'],
  heading: ['heading', 'title', 'headline'],
} as const

/** First key that actually carries text. */
function pick(block: Block, keys: readonly string[]): string | null {
  for (const k of keys) if (block.fallback[k]) return k
  return null
}

/** A personalisable text node: real words now, swappable later. */
function field(
  ctx: RenderCtx,
  block: Block,
  keys: readonly string[],
  el: string,
  css: CSS = {}
): string {
  const key = pick(block, keys)
  if (!key) return ''
  const value = block.fallback[key]
  const hooks = ctx.personalisable && block.live && block.editable.some((f) => f.key === key)
    ? ` data-blk="${escapeHtml(block.id)}" data-fld="${escapeHtml(key)}"`
    : ''
  return tag(el, `${ctx.s.attr(css)}${hooks}`, escapeHtml(value))
}

function button(ctx: RenderCtx, block: Block, keys: readonly string[]): string {
  const key = pick(block, keys)
  if (!key) return ''
  const label = block.fallback[key]
  const st = block.style || {}
  const css = merge(
    colour('background-color', st.accentColor),
    colour('color', st.buttonTextColor || '#ffffff'),
    radius(st.borderRadius),
    shadow(st.shadow),
    {
      display: 'inline-block',
      'padding-top': '0.875rem',
      'padding-bottom': '0.875rem',
      'padding-left': '1.75rem',
      'padding-right': '1.75rem',
      'font-weight': '700',
      'text-decoration': 'none',
    }
  )
  const hooks = ctx.personalisable && block.live && block.editable.some((f) => f.key === key)
    ? ` data-blk="${escapeHtml(block.id)}" data-fld="${escapeHtml(key)}"`
    : ''
  const href = safeUrl(block.frozen?.ctaUrl || block.frozen?.buttonLink || '#')
  return tag('a', ` href="${href}"${ctx.s.attr(css)}${hooks}`, escapeHtml(label))
}

const H1: CSS = { 'font-size': '2.75rem', 'font-weight': '800', 'line-height': '1.1', margin: '0 0 1rem' }
const H2: CSS = { 'font-size': '2rem', 'font-weight': '800', 'line-height': '1.2', margin: '0 0 0.75rem' }
const BODY: CSS = { 'font-size': '1.0625rem', 'line-height': '1.65', margin: '0 0 1.5rem', opacity: '0.9' }

/** Keys that are headings/labels, never price rows. */
const NON_ROW_KEYS = new Set([
  'title', 'subtitle', 'description', 'headline', 'sub', 'heading',
  'buttonText', 'buttonLink', 'cta', 'ctaUrl', 'body', 'src', 'alt', 'action',
])

const EYEBROW: CSS = {
  'font-size': '0.75rem',
  'font-weight': '700',
  'letter-spacing': '0.1em',
  'text-transform': 'uppercase',
  margin: '0 0 0.5rem',
  opacity: '0.75',
}

const renderers: Record<string, (ctx: RenderCtx, b: Block) => string> = {
  hero: (ctx, b) =>
    section(ctx, b, [
      field(ctx, b, SLOT.eyebrow, 'p', EYEBROW),
      field(ctx, b, SLOT.headline, 'h1', H1),
      field(ctx, b, SLOT.body, 'p', BODY),
      button(ctx, b, SLOT.cta),
    ].join('')),

  features: (ctx, b) =>
    section(ctx, b, [
      field(ctx, b, SLOT.eyebrow, 'p', EYEBROW),
      field(ctx, b, SLOT.headline, 'h2', H2),
      field(ctx, b, SLOT.body, 'p', BODY),
    ].join('')),

  proof: (ctx, b) =>
    section(ctx, b, [field(ctx, b, SLOT.headline, 'h2', H2), field(ctx, b, SLOT.body, 'p', BODY)].join('')),

  cta: (ctx, b) =>
    section(ctx, b, [
      field(ctx, b, SLOT.headline, 'h2', H2),
      field(ctx, b, SLOT.body, 'p', BODY),
      button(ctx, b, SLOT.cta),
    ].join('')),

  faq: (ctx, b) => {
    // Frozen entries are the questions — facts about the business, never
    // model-written, so they render straight from `frozen`.
    const items = Object.entries(b.frozen || {})
      .filter(([k]) => /^q\d*$/i.test(k))
      .map(([k, q]) => {
        const a = b.frozen?.[k.replace(/^q/i, 'a')] || ''
        return tag(
          'div',
          ctx.s.attr({ 'margin-bottom': '1.25rem' }),
          tag('h3', ctx.s.attr({ 'font-weight': '700', margin: '0 0 0.25rem' }), escapeHtml(q)) +
            tag('p', ctx.s.attr({ margin: '0', opacity: '0.85' }), escapeHtml(a))
        )
      })
      .join('')
    return section(ctx, b, field(ctx, b, SLOT.headline, 'h2', H2) + items)
  },

  // Money is frozen end to end. A personalised price is a false statement on a
  // real business's website.
  pricing: (ctx, b) => {
    const rows = Object.entries(b.frozen || {})
      // Without this filter the section's own heading was rendered as a price
      // row reading "title | Pricing" — visible nonsense on a live page.
      .filter(([k]) => !NON_ROW_KEYS.has(k))
      .map(([label, value]) =>
        tag(
          'div',
          ctx.s.attr({ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem 0', 'border-bottom': '1px solid rgba(0,0,0,0.08)' }),
          tag('span', '', escapeHtml(label)) + tag('strong', '', escapeHtml(value))
        )
      )
      .join('')
    const heading =
      field(ctx, b, SLOT.headline, 'h2', H2) ||
      // Pricing has no editable fields, so its title lands in `frozen`.
      (b.frozen?.title ? tag('h2', ctx.s.attr(H2), escapeHtml(b.frozen.title)) : '')
    return section(ctx, b, heading + rows)
  },

  form: (ctx, b) =>
    section(ctx, b, [
      field(ctx, b, SLOT.heading, 'h2', H2),
      // A real form posting to the client's own endpoint. No JS, so it still
      // works in a blog body or with scripts blocked.
      tag(
        'form',
        ` method="post" action="${safeUrl(b.frozen?.action)}"${ctx.s.attr({ display: 'grid', gap: '0.75rem', 'max-width': '28rem' })}`,
        ['name', 'email', 'phone']
          .filter((f) => b.frozen?.[`field_${f}`] !== 'off')
          .map((f) =>
            tag('input', ` type="${f === 'email' ? 'email' : 'text'}" name="${f}" placeholder="${escapeHtml(f)}"${ctx.s.attr({ padding: '0.75rem', border: '1px solid rgba(0,0,0,0.15)', 'border-radius': '0.5rem' })}`)
          )
          .join('') +
          tag('button', ` type="submit"${ctx.s.attr(merge(colour('background-color', b.style?.accentColor), { color: '#fff', padding: '0.875rem', border: '0', 'border-radius': '0.5rem', 'font-weight': '700', cursor: 'pointer' }))}`, escapeHtml(b.fallback.button || b.fallback.buttonText || 'Send'))
      ),
    ].join('')),

  booking: (ctx, b) =>
    section(ctx, b, [field(ctx, b, SLOT.heading, 'h2', H2), button(ctx, b, SLOT.cta)].join('')),

  text: (ctx, b) => section(ctx, b, field(ctx, b, SLOT.body, 'p', BODY)),

  media: (ctx, b) => {
    const src = b.frozen?.src || b.frozen?.imageUrl
    if (!src) return ''
    return section(
      ctx,
      b,
      tag('img', ` src="${safeUrl(src)}" alt="${escapeHtml(b.frozen?.alt || b.frozen?.imageAlt || '')}" loading="lazy"${ctx.s.attr(merge(radius(b.style?.borderRadius), shadow(b.style?.shadow), { width: '100%', height: 'auto', display: 'block' }))}`)
    )
  },
}

export function renderBlock(ctx: RenderCtx, block: Block): string {
  const fn = renderers[block.kind]
  // An unknown kind renders nothing rather than throwing. One bad block should
  // not take down a customer's whole page; `renderPage` reports it as a warning.
  return fn ? fn(ctx, block) : ''
}

export function isKnownKind(kind: string): boolean {
  return kind in renderers
}
