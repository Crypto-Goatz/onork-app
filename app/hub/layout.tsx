/**
 * The Hub shell — one sticky menu across every /hub surface.
 *
 * WHY A LAYOUT AND NOT A COMPONENT PER PAGE. Four pages existed under /hub with
 * no shared navigation, so the only way to reach /hub/room or /hub/ecosystem
 * was to know the URL. This estate has already shipped a working page nobody
 * could find (SXO at /crm/sxo, live with no nav entry) — a surface reachable
 * only by typing its address is a surface that does not exist to its user.
 *
 * OWNER-ONLY LINKS ARE DECIDED HERE, ON THE SERVER, AND THE PAGES STILL GATE
 * THEMSELVES. This hides links; it does not protect routes. /hub/room and
 * /hub/ecosystem call notFound() on their own, and /hub/usage does too. Hiding
 * a link is a courtesy to the reader; it is not access control, and the day
 * those two ideas merge is the day an unlinked page becomes an unprotected one.
 *
 * NO HOVER-ONLY MENUS, AND A REAL MOBILE NAV. cro9.com shipped `hidden md:flex`
 * with nothing underneath it, so a phone got no navigation at all — and the
 * desktop panels it would have exposed opened on `onMouseEnter`, which never
 * fires on touch. So: the same links render at every width, as a horizontal
 * scroller on small screens and a vertical rail from `md` up. One list, two
 * shapes, no interaction a finger cannot perform.
 */
import { isOwner } from '@/lib/owner'
import HubNav, { type HubLink } from './HubNav'

export const dynamic = 'force-dynamic'

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const owner = await isOwner()

  // `owner: true` marks a link the account owner alone can open. The matching
  // page enforces it independently — see the header.
  const links: HubLink[] = [
    { href: '/hub', label: 'Home', icon: 'home' },
    { href: '/hub/apps', label: 'Apps', icon: 'grid' },
    { href: '/hub/room', label: 'The Room', icon: 'radio', owner: true },
    { href: '/hub/usage', label: 'Usage', icon: 'gauge', owner: true },
    { href: '/hub/ecosystem', label: 'Ecosystem', icon: 'map', owner: true },
  ].filter((l) => !l.owner || owner)

  return (
    <div className="min-h-screen bg-[#0d1117] text-white md:flex">
      <HubNav links={links} />
      {/* min-w-0 so a wide child (a table, a code block) scrolls inside itself
          rather than pushing the whole page sideways. */}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
