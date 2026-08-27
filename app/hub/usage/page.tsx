/**
 * /hub/usage — the daily AI cost read.
 *
 * Gated in a server component with notFound(), the same shape as /hub/room: an
 * anonymous request never receives the markup. The layout also hides the link,
 * but hiding a link is not access control and these two must stay independent.
 */
import { notFound } from 'next/navigation'
import { isOwner } from '@/lib/owner'
import UsageView from './UsageView'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Usage — 0n', robots: { index: false, follow: false } }

export default async function UsagePage() {
  if (!(await isOwner())) notFound()
  return <UsageView />
}
