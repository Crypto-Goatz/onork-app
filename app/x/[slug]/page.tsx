/**
 * /x/[slug] — the one frame every bolt-on app is served through.
 *
 * THE POINT OF A PARAMETERIZED ROUTE: adding an add-on becomes a registry entry,
 * not a build. Before this, the add-ons surface listed 31 products and could
 * open none of them, because "opening" one had never been built — there were
 * three disagreeing catalogues and no door. This is the door, and it is the same
 * door for all of them.
 *
 * IT REFUSES BY DEFAULT. An unknown slug, or one that exists as a listing with
 * no implementation behind it, gets a 404 rather than an empty shell. A page
 * that renders chrome for a product that cannot run is precisely the dead end
 * the Hub's exit test forbids: click everything and reach either a working flow
 * or a locked tile, never a maze.
 */
import { notFound } from 'next/navigation'
import { getAddonDefinition } from '@/lib/addon-registry'
import { ADDONS, type MarketplaceAddon } from '@/lib/marketplace-data'
import AddonFrame from './AddonFrame'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const def = getAddonDefinition(slug)
  return { title: def ? `${def.name} — 0n` : 'Not found', robots: { index: false } }
}

export default async function AddonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // The registry is the only thing that can answer "is there code behind this".
  // A marketplace listing alone is a promise, not a product.
  const def = getAddonDefinition(slug)
  if (!def) notFound()

  const listing = (ADDONS as MarketplaceAddon[]).find((a) => a.slug === slug) ?? null

  return (
    <AddonFrame
      slug={slug}
      name={def.name}
      schedule={def.schedule}
      fields={def.configSchema}
      blurb={listing?.shortDesc ?? ''}
    />
  )
}
