import type { Block, PageSpec, EditableField } from './blocks'

/**
 * Bring a builder document into the personalisation engine.
 *
 * The builder's schema is `{ theme, blocks[{ id, type, content, styles }] }`.
 * Ours is `{ brand, blocks[{ fallback, editable, frozen }] }`. This maps one to
 * the other — and the mapping is where the safety model gets applied, because
 * the builder has no concept of which words are safe to rewrite.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT MAY CHANGE, AND WHAT MAY NEVER
 *
 *   hero, features, cta, elements   copy is persuasion — personalise freely
 *   pricing                         FROZEN, entirely. A model rewriting "$49"
 *                                   is a false price on a real business's page.
 *   testimonials                    FROZEN, entirely. A rewritten quote is a
 *                                   fabricated review attributed to a named
 *                                   human being.
 *   footer                          FROZEN. Legal links and policy names are
 *                                   not copy to be improved.
 *
 * Nothing in the builder UI needs to know this. An agency drags a pricing table
 * in and it is protected by default — which is the only version of this that
 * survives contact with a real customer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface BuilderDoc {
  title?: string
  description?: string
  theme?: Record<string, string>
  blocks: {
    id: string
    type: string
    content?: Record<string, unknown>
    styles?: Record<string, string>
  }[]
}

/** Blocks whose copy is never touched, and why — surfaced in the UI. */
export const FROZEN_TYPES: Record<string, string> = {
  pricing: 'Prices are never rewritten.',
  testimonials: 'Quotes are attributed to real people and are never rewritten.',
  footer: 'Legal and policy links are never rewritten.',
}

/** Which text fields of a live block are worth personalising, and their limits. */
const FIELDS: Record<string, EditableField[]> = {
  hero: [
    { key: 'title', label: 'Headline', intent: 'One clear promise, concrete, no stacked adjectives.', max: 70 },
    { key: 'subtitle', label: 'Eyebrow', intent: 'Two or three words of category or context.', max: 30 },
    { key: 'description', label: 'Body', intent: 'Two sentences that make the promise believable.', max: 260 },
    { key: 'buttonText', label: 'Button', intent: 'What happens next, in their words. Never "Submit".', max: 24 },
  ],
  features: [
    { key: 'title', label: 'Title', intent: 'Name the outcome, not the feature list.', max: 70 },
    { key: 'description', label: 'Body', intent: 'Two sentences on what it does for THEM.', max: 240 },
  ],
  cta: [
    { key: 'title', label: 'Headline', intent: 'Answer the hesitation they most likely have right now.', max: 70 },
    { key: 'description', label: 'Body', intent: 'One sentence that removes the last objection.', max: 200 },
    { key: 'buttonText', label: 'Button', intent: 'The action, in their words.', max: 24 },
  ],
  elements: [
    { key: 'title', label: 'Title', intent: 'Say what this section is for.', max: 70 },
    { key: 'description', label: 'Body', intent: 'One or two sentences.', max: 240 },
  ],
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export function fromBuilder(doc: BuilderDoc, opts: {
  id: string
  business: string
  sells?: string
  tone?: string
  neverSay?: string[]
  locationId?: string
} ): PageSpec {
  const blocks: Block[] = doc.blocks.map((b) => {
    const content = b.content ?? {}
    const frozenReason = FROZEN_TYPES[b.type]
    const editable = frozenReason ? [] : (FIELDS[b.type] ?? [])

    // Everything the model may NOT change is handed over as fact, so it can
    // write around the real numbers instead of inventing new ones.
    const frozen: Record<string, string> = {}
    for (const [k, v] of Object.entries(content)) {
      if (editable.some((f) => f.key === k)) continue
      if (typeof v === 'string' && v) frozen[k] = v.slice(0, 300)
      // Arrays (pricing tiers, testimonials, features) are summarised rather
      // than dumped — the model needs the facts, not the markup.
      else if (Array.isArray(v) && v.length) {
        frozen[k] = v.map((x) => {
          const o = x as Record<string, unknown>
          return [o.planName, o.price, o.period, o.name, o.title].filter(Boolean).join(' ')
        }).filter(Boolean).join(' | ').slice(0, 400)
      }
    }

    const fallback: Record<string, string> = {}
    for (const f of editable) fallback[f.key] = str(content[f.key])

    return {
      id: b.id,
      kind: (b.type as Block['kind']) ?? 'text',
      fallback,
      editable: editable.filter((f) => fallback[f.key]),
      ...(Object.keys(frozen).length ? { frozen } : {}),
      // A block with nothing worth rewriting is static, not "live but empty".
      live: !frozenReason && editable.some((f) => fallback[f.key]),
      style: b.styles,
    }
  })

  return {
    id: opts.id,
    name: doc.title || 'Untitled page',
    locationId: opts.locationId,
    blocks,
    brand: {
      business: opts.business,
      sells: opts.sells,
      tone: opts.tone,
      neverSay: opts.neverSay,
    },
  }
}

/** What the builder UI should show per block: whether it personalises, and why not. */
export function personalisationReport(spec: PageSpec) {
  return spec.blocks.map((b) => ({
    id: b.id,
    kind: b.kind,
    live: Boolean(b.live),
    fields: b.editable.map((f) => f.key),
    reason: b.live ? undefined : (FROZEN_TYPES[b.kind] ?? 'Nothing here is worth rewriting per visitor.'),
  }))
}
