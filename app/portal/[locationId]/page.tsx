import type { Metadata } from 'next'
import CustomerPortal from './CustomerPortal'

/**
 * app.0ncore.com/portal/:locationId — the customer portal.
 *
 * The clean, client-facing surface: a sub-account's own company data in one
 * place, distinct from the agency cockpit. v1 renders for a location the signed-in
 * account is allowed to see (the agency previewing a client, or — once
 * sub-account login lands — the client themselves). The data comes from the
 * existing, ownership-checked /api/clients/:id endpoint, so nothing here is mock.
 */
export const metadata: Metadata = {
  title: 'Your portal — 0nCORE',
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await params
  return <CustomerPortal locationId={locationId} />
}
