/**
 * /crm/clients/storefront — the sellable view of the client list.
 *
 * Both hosts route /clients/* under /crm, so this is the reachable path. Its
 * sibling /crm/clients stays the connect-and-key manager that six surfaces link
 * to by name; this one carries plan state, wallet balance and the way into each
 * client's own page.
 */
import type { Metadata } from 'next'
import ClientsStorefront from '@/app/clients/ClientsStorefront'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Clients — 0nCORE', robots: { index: false } }

export default function Page() { return <ClientsStorefront /> }
