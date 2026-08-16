'use client'

/**
 * Shows the agency chrome everywhere except the marketplace Custom Pages.
 *
 * WHY A CLIENT COMPONENT FOR THIS. The /crm layout is a server component and
 * layouts do not receive the pathname, so the decision cannot be made where the
 * chrome is mounted. Reading it here is the cheapest correct answer — the
 * alternative was a route group, which cannot be used because the Custom Page
 * URL is registered with the marketplace and must stay exactly /crm/leadscout.
 *
 * WHAT THE CHROME WOULD DO IF LEFT ON: a setup banner telling someone to
 * connect clients they do not have, and a command bar scoped to an agency they
 * are not part of, both rendered inside a third party's iframe. That is not a
 * cosmetic mismatch; it is a different product appearing in their product.
 */
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Marketplace Custom Pages — framed, non-agency, no chrome. */
const BARE = ['/crm/leadscout']

export default function CrmChrome({
  before, after, children,
}: { before: ReactNode; after: ReactNode; children: ReactNode }) {
  const pathname = usePathname() || ''
  const bare = BARE.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (bare) return <>{children}</>
  return (
    <>
      {before}
      {children}
      {after}
    </>
  )
}
