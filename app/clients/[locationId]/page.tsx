import type { Metadata } from 'next'
import ClientManagement from '@/app/clients/[locationId]/ClientManagement'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Client — 0nCORE', robots: { index: false } }

export default async function Page({ params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await params
  return <ClientManagement locationId={locationId} />
}
