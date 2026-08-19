/**
 * /crm/clients/new — the creation chooser on the path both hosts land on.
 * See app/clients/new/NewClientChooser.tsx for why this second mount exists.
 */
import type { Metadata } from 'next'
import NewClientChooser from '@/app/clients/new/NewClientChooser'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Add a client — 0nCORE', robots: { index: false } }

export default function Page() { return <NewClientChooser /> }
