/**
 * GET /api/crm/actions — the Actions glossary, alphabetical, with live status.
 *
 * The plain-English description comes from the catalog; whether it WORKS comes
 * from the executor's own IMPLEMENTED set and the registry. Merging them here is
 * the point: a hand-kept list eventually tells an agency that something works
 * when it does not, and there is no worse thing this page could do.
 *
 * Public to signed-in users of the app. It exposes no client data — only what
 * the product can do — so it is deliberately not scoped to a company.
 */
import { NextResponse } from 'next/server'
import { CAPABILITIES, legPriceCents, assertExecutable } from '@/lib/crm/registry'
import { IMPLEMENTED } from '@/lib/burst/executor'
import { ACTIONS, missingFromCatalog } from '@/lib/crm/actions-catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type ActionStatus = 'works' | 'not_possible' | 'not_wired' | 'needs_billing'

export async function GET() {
  const actions = CAPABILITIES.map((cap) => {
    const doc = ACTIONS[cap.id]
    const check = assertExecutable(cap.id)
    const price = legPriceCents(cap.id)

    // Order matters. "Not possible" is a property of the platform and outranks
    // everything; an unwired step is ours to finish; billing is last because it
    // only matters once the step exists.
    const status: ActionStatus = !check.ok
      ? 'not_possible'
      : !IMPLEMENTED.has(cap.id)
        ? 'not_wired'
        : price > 0
          ? 'needs_billing'
          : 'works'

    return {
      id: cap.id,
      name: doc?.name ?? cap.intent,
      what: doc?.what ?? cap.intent,
      example: doc?.example ?? null,
      group: doc?.group ?? 'Reporting',
      status,
      // Only present when the platform refuses — it names the way round.
      instead: check.ok ? null : (check.insteadOffer ?? check.reason),
      priceCents: price,
      /** True when no plain-English entry exists — visible, not hidden. */
      undocumented: !doc,
    }
  })

  // Alphabetical by the name a person reads, not by id. `localeCompare` so
  // apostrophes and accents sort where a reader expects them.
  actions.sort((a, b) => a.name.localeCompare(b.name, 'en'))

  return NextResponse.json({
    count: actions.length,
    working: actions.filter((a) => a.status === 'works').length,
    missing: missingFromCatalog(CAPABILITIES.map((c) => c.id)),
    actions,
  })
}
