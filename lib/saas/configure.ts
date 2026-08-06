import catalogue from './catalogue.json'

/**
 * The SaaS plan configurator.
 *
 * WHAT IS WRONG WITH THE CURRENT ONE. rocketclients.com/pricing is a good
 * checklist: base platform, fifteen add-ons, tick what you want. But it asks a
 * question the buyer cannot answer. An agency owner knows "I run a plumbing
 * business's marketing and I need to stop losing after-hours calls" — they do
 * not know whether that means Call Tracking, Smart Triggers, or both. A
 * checklist makes them guess, and a guess is how someone either overspends and
 * churns, or underbuys and concludes the product does not work.
 *
 * So the flow inverts: describe the business, get a proposed plan with a REASON
 * against every line, and change anything. The recommendation is a starting
 * point that explains itself, never a lock.
 *
 * WHAT THIS FILE DOES NOT DO. It does not create a plan in the CRM — the SaaS
 * API has exactly one endpoint and it is a lookup keyed by a Stripe id, with no
 * create call for anyone. Plans are composed and priced HERE; provisioning
 * happens through sub-account creation plus a snapshot. Designing as though we
 * could push a plan into their SaaS config would produce a flow that demos
 * beautifully and fails at the last step.
 */

export interface Addon {
  name: string
  blurb: string
  priceMonthly: number
  category: string
}

export interface Catalogue {
  /**
   * ZERO, deliberately. The published pricing says "$155 Base Free — value
   * included at no extra cost": the base platform is bundled with any plan and
   * is NOT billed. Treating $155 as a charge inflated every quote by $155/mo,
   * which a customer discovers on their first invoice.
   */
  basePriceMonthly: number
  /** What the base is worth, for the "included free" line. Never billed. */
  baseValueMonthly: number
  annualDiscountPct: number
  addons: Addon[]
}

export const CATALOGUE = catalogue as Catalogue

/** Stable key for an add-on. Names are user-facing and may be re-worded. */
export const keyOf = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const ADDONS_BY_KEY = new Map(CATALOGUE.addons.map((a) => [keyOf(a.name), a]))

export interface PlanLine {
  key: string
  name: string
  category: string
  priceMonthly: number
  /**
   * Why this is in the plan, in the buyer's terms — tied to something they
   * actually said. A recommendation without a reason is indistinguishable from
   * an upsell, and it gets deleted for exactly that reason.
   */
  because: string
}

export interface Plan {
  lines: PlanLine[]
  basePriceMonthly: number
  monthlyTotal: number
  annualMonthlyTotal: number
  annualSaving: number
  /** What was deliberately LEFT OUT, and why. */
  omitted: { name: string; because: string }[]
  notes: string[]
}

export function pricePlan(keys: string[], omitted: Plan['omitted'] = [], notes: string[] = []): Plan {
  const seen = new Set<string>()
  const lines: PlanLine[] = []

  for (const k of keys) {
    const key = keyOf(k)
    if (seen.has(key)) continue
    const addon = ADDONS_BY_KEY.get(key)
    if (!addon) continue
    seen.add(key)
    lines.push({
      key,
      name: addon.name,
      category: addon.category,
      priceMonthly: addon.priceMonthly,
      because: '',
    })
  }

  const addonTotal = lines.reduce((s, l) => s + l.priceMonthly, 0)
  // Base is included free, so the bill IS the add-ons.
  const monthlyTotal = CATALOGUE.basePriceMonthly + addonTotal
  // Applies to the whole bill. The base contributes nothing because it is free.
  const annualMonthlyTotal = Math.round(monthlyTotal * (1 - CATALOGUE.annualDiscountPct / 100))

  return {
    lines,
    basePriceMonthly: CATALOGUE.basePriceMonthly,
    monthlyTotal,
    annualMonthlyTotal,
    annualSaving: (monthlyTotal - annualMonthlyTotal) * 12,
    omitted,
    notes,
  }
}

/** The brief handed to the model. */
export function configuratorBrief(description: string, budget?: number): string {
  const list = CATALOGUE.addons
    .map((a) => `- ${keyOf(a.name)} | ${a.name} | $${a.priceMonthly}/mo | ${a.category} | ${a.blurb}`)
    .join('\n')

  return `An agency owner describes their business. Recommend a plan from the catalogue below.

THE BUSINESS
${description}
${budget ? `\nTHEY SAID THEIR BUDGET IS ABOUT $${budget}/month.` : ''}

CATALOGUE — the base platform (contacts, forms, calendar, tasks, reporting) is INCLUDED FREE with any plan. Only add-ons are billed.
${list}

RULES
1. Recommend only what their description actually justifies. Every line needs a
   reason that quotes something THEY said. If you cannot write that reason, the
   line does not belong in the plan.
2. Only list an omission when they said something that RULES IT OUT — "you
   mentioned you don't sell online, so I skipped E-commerce". Do NOT list an
   add-on merely because they did not mention it; "there's no mention of X" is
   true of everything they did not buy and buries the omissions that matter.
   Two or three at most. If nothing was ruled out, return an empty array.
3. ${budget ? `Stay at or under $${budget}/month. The base costs nothing, so the whole budget goes to add-ons. If their needs genuinely exceed it, get as close as you can and say plainly what had to wait and what it costs.` : 'Keep it to what they need. A smaller plan they keep beats a bigger one they cancel.'}
4. Never invent an add-on. Use only the keys listed above.
5. Write like a person who has done this before, not a sales page. No
   exclamation marks, no "unlock", no "supercharge".

Return JSON only:
{"addons":["key","key"],"reasons":{"key":"one sentence, referencing their words"},"omitted":[{"name":"Add-on name","because":"one sentence"}],"summary":"two sentences on the shape of the plan"}`
}

/**
 * Merge a model proposal with real prices.
 *
 * Prices come from the catalogue, NEVER from the model. A hallucinated price on
 * a quote is a number a customer will hold you to.
 */
/**
 * An omission is only worth showing if the buyer RULED IT OUT.
 *
 * Models reliably pad this list: asked what was left out, they enumerate every
 * unselected add-on with "there's no mention of X". That is true of everything
 * not bought, and twelve such lines bury the two that carry real signal ("you
 * said you don't sell online"). Drop the padding, keep the reasons that point
 * back at something the buyer actually said.
 *
 * Matches the ABSENCE OF A STATEMENT ("no mention of", "no indication"), not the
 * absence of a need. "You said you don't need this" is a real reason and an
 * earlier version of this regex silently deleted it by matching `not … need`,
 * which emptied the list entirely.
 */
const PADDING = /\b(no|not|isn'?t|without)\s+(any\s+|specific\s+)?(mention|indication|reference|suggestion)\b/i

export function meaningfulOmissions(
  omitted: { name: string; because: string }[] = [],
  limit = 3
): { name: string; because: string }[] {
  return omitted.filter((o) => o.because && !PADDING.test(o.because)).slice(0, limit)
}

export function planFromProposal(proposal: {
  addons?: string[]
  reasons?: Record<string, string>
  omitted?: { name: string; because: string }[]
  summary?: string
}): Plan {
  const plan = pricePlan(
    proposal.addons ?? [],
    meaningfulOmissions(proposal.omitted),
    proposal.summary ? [proposal.summary] : []
  )
  for (const line of plan.lines) {
    line.because = proposal.reasons?.[line.key]?.trim() || ''
  }
  // A line the model could not justify is surfaced rather than silently kept —
  // the reason is the whole point of recommending instead of listing.
  const unjustified = plan.lines.filter((l) => !l.because).map((l) => l.name)
  if (unjustified.length) {
    plan.notes.push(
      `No reason was given for: ${unjustified.join(', ')}. Worth asking whether these are actually needed.`
    )
  }
  return plan
}
