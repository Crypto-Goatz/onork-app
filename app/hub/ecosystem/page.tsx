/**
 * /hub/ecosystem — the map of the whole system. Owner only.
 *
 * WHAT THIS IS FOR. Two audiences that usually need different documents: Mike,
 * who needs to see how it actually works, and a room of investors, who need to
 * see that it is a system rather than a pile of sites. They get the same page
 * because the honest version is the impressive one — what makes this defensible
 * is not the box count, it is that every connection drawn has been exercised
 * and dated.
 *
 * GATED SERVER-SIDE, then rendered client-side. The gate is here, in a server
 * component, so an anonymous request never receives the markup at all. A
 * client-side redirect would ship the entire architecture to anyone who
 * disabled JavaScript — which is precisely the defect the H1 dashboard gate
 * exists to close, and repeating it on the page that documents it would be
 * quite the own goal.
 */
import { notFound } from 'next/navigation'
import { isOwner } from '@/lib/owner'
import { NODES, EDGES, LAWS } from '@/lib/ecosystem/graph'
import EcosystemMap from './EcosystemMap'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ecosystem — 0n', robots: { index: false, follow: false } }

export default async function EcosystemPage() {
  // notFound(), not a redirect: a 404 tells an unauthorised visitor nothing
  // about whether this route exists.
  if (!(await isOwner())) notFound()

  return <EcosystemMap nodes={NODES} edges={EDGES} laws={LAWS} />
}
