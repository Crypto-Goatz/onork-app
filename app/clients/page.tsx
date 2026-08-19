import type { Metadata } from 'next'
import ClientsStorefront from './ClientsStorefront'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Clients — 0nCORE', robots: { index: false } }

export default function Page() { return <ClientsStorefront /> }
