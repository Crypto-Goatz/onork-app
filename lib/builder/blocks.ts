/**
 * The block schema. This is the product; drag-and-drop is a UI over it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT MAKES THIS DIFFERENT FROM EVERY OTHER BUILDER
 *
 * Wix, Webflow, Unbounce and native funnel builders all output a STATIC page:
 * one set of words for everyone who lands. The unit here is a block that is
 * ALIVE — it ships with real copy, and rewrites itself for the visitor in front
 * of it based on what is known and how they are behaving.
 *
 * THE RULE THAT MAKES IT SAFE TO SHIP: every block carries a `fallback` that is
 * rendered into the HTML at publish time. Personalisation is an ENHANCEMENT
 * layered on top, never a dependency.
 *
 * That is not a nicety. A builder whose pages are empty without JavaScript is
 * useless for search and worse than useless for AI crawlers, which is precisely
 * the audience an agency is buying the page to reach. Ship the words, then
 * improve them.
 *
 * THE SECOND RULE: a block declares what it may CHANGE and what it must never
 * touch. A model rewriting a price, a guarantee or a compliance line is not a
 * conversion optimisation — it is a false statement on a real business's
 * website, and the agency carries that.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type BlockKind =
  | 'hero' | 'features' | 'proof' | 'cta' | 'faq' | 'pricing'
  | 'form' | 'booking' | 'text' | 'media'

/** What the personaliser is allowed to know about a visitor. */
export interface VisitorSignal {
  /** From the conversational widget, or a known contact. */
  name?: string
  company?: string
  industry?: string
  /** Calibrates depth — the prototype's sharpest idea. */
  expertise?: 'novice' | 'business' | 'expert'
  /** From the CRO9 collector. */
  scrollDepth?: number
  dwellSeconds?: number
  exitIntent?: boolean
  returning?: boolean
  referrer?: string
  /** Set when the visitor is a known contact in the client's CRM. */
  contactId?: string
}

/**
 * A field the model may rewrite.
 *
 * `max` is enforced server-side. A model given "write a headline" will
 * occasionally write a paragraph, and a paragraph in an H1 slot breaks the
 * layout on a live customer page.
 */
export interface EditableField {
  key: string
  label: string
  /** What good looks like, in the model's terms. */
  intent: string
  max: number
}

export interface Block {
  id: string
  kind: BlockKind
  /** Rendered into the published HTML. Real words, never a placeholder. */
  fallback: Record<string, string>
  /** Only these may change per visitor. Everything else is frozen. */
  editable: EditableField[]
  /**
   * Never rewritten, and passed to the model as facts it must respect.
   * Prices, guarantees, legal lines, contact details.
   */
  frozen?: Record<string, string>
  /** Personalise this block at all? Off = pure static, still valid. */
  live?: boolean
  /** Layout, colours, spacing — the builder owns these, not the model. */
  style?: Record<string, string>
}

export interface PageSpec {
  id: string
  name: string
  locationId?: string
  blocks: Block[]
  /** Facts every block inherits. The single source of truth for the business. */
  brand: {
    business: string
    sells?: string
    tone?: string
    /** Never contradicted. The strongest guardrail available. */
    neverSay?: string[]
  }
}

/* ── the starting library ────────────────────────────────────────────────── */

const F = (key: string, label: string, intent: string, max: number): EditableField =>
  ({ key, label, intent, max })

export const BLOCK_LIBRARY: Record<BlockKind, Omit<Block, 'id'>> = {
  hero: {
    kind: 'hero',
    fallback: { headline: 'A website that works for your business', sub: 'Live in about a week.', cta: 'See how' },
    editable: [
      F('headline', 'Headline', 'One clear promise. Concrete, no adjectives stacked up.', 70),
      F('sub', 'Sub-headline', 'One sentence that makes the promise believable.', 140),
      F('cta', 'Button', 'Two or three words. What happens next, not "Submit".', 24),
    ],
    live: true,
  },
  features: {
    kind: 'features',
    fallback: { title: 'What you get', body: 'Design, build, hosting and a place to manage your leads.' },
    editable: [
      F('title', 'Title', 'Name the outcome, not the feature list.', 60),
      F('body', 'Body', 'Two sentences. Say what it does for THEM.', 220),
    ],
    live: true,
  },
  proof: {
    kind: 'proof',
    // Deliberately not editable: invented social proof is a fabricated review
    // on a real business's site.
    fallback: { title: 'Trusted since 2003', body: '3,500+ websites built.' },
    editable: [F('title', 'Title', 'A factual credibility line. Never invent numbers.', 60)],
    live: false,
  },
  cta: {
    kind: 'cta',
    fallback: { headline: 'Ready when you are', cta: 'Book a call' },
    editable: [
      F('headline', 'Headline', 'Answer the hesitation they are most likely to have.', 70),
      F('cta', 'Button', 'The action, in their words.', 24),
    ],
    live: true,
  },
  faq: {
    kind: 'faq',
    fallback: { title: 'Questions' },
    editable: [F('title', 'Title', 'Plain. "Questions" is usually right.', 40)],
    live: false,
  },
  // Money and mechanics are frozen. A model must never touch either.
  pricing: { kind: 'pricing', fallback: { title: 'Pricing' }, editable: [], live: false },
  form: { kind: 'form', fallback: { heading: 'Get in touch', button: 'Send' }, editable: [F('heading', 'Heading', 'Why they should fill this in.', 60)], live: true },
  booking: { kind: 'booking', fallback: { heading: 'Book a time' }, editable: [F('heading', 'Heading', 'Low-friction. Name the length.', 60)], live: true },
  text: { kind: 'text', fallback: { body: '' }, editable: [F('body', 'Body', 'Match the surrounding tone.', 600)], live: false },
  media: { kind: 'media', fallback: {}, editable: [], live: false },
}

export function newBlock(kind: BlockKind, id: string): Block {
  const base = BLOCK_LIBRARY[kind]
  return { id, ...base, fallback: { ...base.fallback }, editable: [...base.editable] }
}

/** Only declared, length-capped, string fields survive. */
export function sanitise(block: Block, proposed: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of block.editable) {
    const v = proposed[f.key]
    if (typeof v !== 'string') continue
    const clean = v.trim().replace(/\s+/g, ' ')
    if (!clean) continue
    // Longer than declared means the model ignored the brief; the fallback is
    // better than a broken layout.
    if (clean.length > f.max * 1.4) continue
    out[f.key] = clean.slice(0, f.max)
  }
  return out
}
