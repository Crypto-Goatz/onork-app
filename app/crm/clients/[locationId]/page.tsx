/**
 * /crm/clients/[locationId] — the same client management page, on the app host.
 *
 * app.0ncore.com rewrites every path under /crm, so this is where
 * /clients/<id> actually lands for an agency. The page itself lives in one
 * place; this file exists so the rewrite has somewhere to land instead of a
 * 404. /crm/clients (the list) is unchanged — it is the connect-and-bill
 * manager, and this is the sell-into-one-client surface.
 */
import type { Metadata } from 'next'
import ClientManagement from '@/app/clients/[locationId]/ClientManagement'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Client — 0nCORE', robots: { index: false } }

export default async function Page({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await params
  return <ClientManagement locationId={locationId} />
}
