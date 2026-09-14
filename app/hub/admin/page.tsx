import { notFound } from 'next/navigation'
import { isOwner } from '@/lib/owner'
import AdminPanel from './AdminPanel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — 0n', robots: { index: false, follow: false } }

/** Owner-only, and indistinguishable from a missing page for everyone else. */
export default async function HubAdminPage() {
  if (!(await isOwner())) notFound()
  return <AdminPanel />
}
